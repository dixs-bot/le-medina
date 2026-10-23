-- Hôtel Le Médina & Resto Singkawang
-- Reception / walk-in reservations with physical-room locking and offline payment ledger.
-- Requires migrations 20261023000006 through 20261023000009.
BEGIN;

-- Cash is a supported method in the offline payment ledger. Reservation.payment_method
-- remains pay_at_hotel because that column tracks the online/offline route, while the
-- payments table stores the concrete method actually received at reception.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('pay_at_hotel', 'cash', 'qris', 'bank_transfer', 'virtual_account', 'credit_card', 'other'));

CREATE OR REPLACE FUNCTION public.get_available_rooms_for_dates(
  p_check_in DATE,
  p_check_out DATE
)
RETURNS TABLE (
  room_id UUID,
  room_number TEXT,
  room_type_id UUID,
  room_type_name TEXT,
  room_type_slug TEXT,
  floor INTEGER,
  wing TEXT,
  base_price_cents INTEGER,
  currency TEXT,
  max_adults INTEGER,
  max_children INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Tanggal check-in dan check-out tidak valid.';
  END IF;

  RETURN QUERY
  SELECT r.id, r.room_number, rt.id, rt.name, rt.slug, r.floor, COALESCE(r.wing, ''),
         rt.base_price_cents, COALESCE(rt.currency, 'IDR'), rt.max_adults, rt.max_children
  FROM public.rooms r
  JOIN public.room_types rt ON rt.id = r.room_type_id AND rt.is_active = TRUE
  WHERE r.status = 'available'
    AND NOT EXISTS (
      SELECT 1
      FROM public.reservations res
      JOIN public.reservation_items ri ON ri.reservation_id = res.id
      WHERE ri.assigned_room_id = r.id
        AND res.status IN ('pending', 'confirmed', 'checked_in')
        AND res.check_in < p_check_out
        AND res.check_out > p_check_in
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.reservation_nights rn
      JOIN public.reservation_items ri ON ri.id = rn.reservation_item_id
      JOIN public.reservations res ON res.id = ri.reservation_id
      WHERE rn.room_id = r.id
        AND rn.night_date >= p_check_in
        AND rn.night_date < p_check_out
        AND res.status IN ('pending', 'confirmed', 'checked_in')
    )
  ORDER BY rt.sort_order, r.room_number;
END;
$$;

REVOKE ALL ON FUNCTION public.get_available_rooms_for_dates(DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_rooms_for_dates(DATE, DATE) TO service_role;

CREATE OR REPLACE FUNCTION public.create_offline_walk_in_reservation(
  p_room_id UUID,
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_guest_count INTEGER,
  p_check_in DATE,
  p_check_out DATE,
  p_payment_method TEXT,
  p_payment_status TEXT,
  p_check_in_now BOOLEAN,
  p_actor TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_room RECORD;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;
  v_reservation_status TEXT;
  v_reservation_id UUID;
  v_reservation_item_id UUID;
  v_payment_id UUID;
  v_reservation_code TEXT;
  v_total_amount_cents BIGINT := 0;
  v_amount_idr BIGINT := 0;
  v_night RECORD;
  v_received_by UUID;
  v_paid_at TIMESTAMPTZ;
BEGIN
  IF p_room_id IS NULL THEN RAISE EXCEPTION 'Pilih kamar terlebih dahulu.'; END IF;
  IF LENGTH(TRIM(COALESCE(p_guest_name, ''))) < 2 THEN RAISE EXCEPTION 'Nama tamu wajib diisi.'; END IF;
  IF LENGTH(REGEXP_REPLACE(COALESCE(p_guest_phone, ''), '[^0-9]', '', 'g')) < 8 THEN
    RAISE EXCEPTION 'Nomor telepon tamu tidak valid.';
  END IF;
  IF p_guest_count IS NULL OR p_guest_count < 1 OR p_guest_count > 20 THEN
    RAISE EXCEPTION 'Jumlah tamu harus antara 1 sampai 20 orang.';
  END IF;
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Tanggal check-out harus setelah tanggal check-in.';
  END IF;
  IF p_check_in < v_today THEN RAISE EXCEPTION 'Tanggal check-in tidak boleh di masa lampau.'; END IF;
  IF p_check_out - p_check_in > 30 THEN RAISE EXCEPTION 'Maksimum durasi inap adalah 30 malam.'; END IF;
  IF p_check_in_now AND p_check_in <> v_today THEN
    RAISE EXCEPTION 'Check-in langsung hanya dapat dipilih untuk tanggal hari ini.';
  END IF;
  IF COALESCE(p_payment_method, '') NOT IN ('cash', 'bank_transfer', 'qris') THEN
    RAISE EXCEPTION 'Metode pembayaran harus Cash, Transfer Bank, atau QRIS.';
  END IF;
  IF COALESCE(p_payment_status, '') NOT IN ('paid', 'unpaid') THEN
    RAISE EXCEPTION 'Status pembayaran tidak valid.';
  END IF;

  -- Serialize reception bookings per physical room before checking overlaps.
  SELECT r.id, r.room_number, r.room_type_id, r.status AS room_status,
         rt.name AS room_type_name, rt.currency
  INTO v_room
  FROM public.rooms r
  JOIN public.room_types rt ON rt.id = r.room_type_id AND rt.is_active = TRUE
  WHERE r.id = p_room_id
  FOR UPDATE OF r;

  IF NOT FOUND THEN RAISE EXCEPTION 'Kamar tidak ditemukan atau tipe kamar tidak aktif.'; END IF;
  IF v_room.room_status <> 'available' THEN RAISE EXCEPTION 'Kamar ini tidak dalam kondisi tersedia.'; END IF;

  -- Only release stale calendar locks owned by terminal reservations for the requested
  -- interval. The reservation, reservation item and audit history remain preserved.
  DELETE FROM public.reservation_nights rn
  USING public.reservation_items ri, public.reservations res
  WHERE rn.reservation_item_id = ri.id
    AND ri.reservation_id = res.id
    AND rn.room_id = p_room_id
    AND rn.night_date >= p_check_in
    AND rn.night_date < p_check_out
    AND res.status IN ('cancelled', 'checked_out');

  IF EXISTS (
    SELECT 1
    FROM public.reservation_items ri
    JOIN public.reservations res ON res.id = ri.reservation_id
    WHERE ri.assigned_room_id = p_room_id
      AND res.status IN ('pending', 'confirmed', 'checked_in')
      AND res.check_in < p_check_out
      AND res.check_out > p_check_in
  ) OR EXISTS (
    SELECT 1
    FROM public.reservation_nights rn
    JOIN public.reservation_items ri ON ri.id = rn.reservation_item_id
    JOIN public.reservations res ON res.id = ri.reservation_id
    WHERE rn.room_id = p_room_id
      AND rn.night_date >= p_check_in
      AND rn.night_date < p_check_out
      AND res.status IN ('pending', 'confirmed', 'checked_in')
  ) THEN
    RAISE EXCEPTION 'Kamar % sudah dipesan pada rentang tanggal tersebut. Pilih kamar lain.', v_room.room_number;
  END IF;

  SELECT COALESCE(SUM(applied_rate_cents), 0)
  INTO v_total_amount_cents
  FROM public.calculate_stay_rates(v_room.room_type_id, p_check_in, p_check_out);

  IF v_total_amount_cents <= 0 OR v_total_amount_cents > 2147483647 THEN
    RAISE EXCEPTION 'Total tagihan kamar tidak valid. Periksa tarif kamar.';
  END IF;
  IF COALESCE(v_room.currency, 'IDR') <> 'IDR' THEN
    RAISE EXCEPTION 'Pencatatan tamu offline saat ini hanya mendukung tarif IDR.';
  END IF;

  IF p_check_in_now THEN
    v_reservation_status := 'checked_in';
  ELSE
    v_reservation_status := 'confirmed';
  END IF;

  v_reservation_code := 'MED-WI' || UPPER(SUBSTR(ENCODE(GEN_RANDOM_BYTES(4), 'hex'), 1, 6));
  v_amount_idr := ROUND(v_total_amount_cents / 100.0)::BIGINT;
  IF p_payment_status = 'paid' THEN v_paid_at := NOW(); ELSE v_paid_at := NULL; END IF;

  -- Existing column uses a route-level method; the payment ledger below records the
  -- concrete offline method (cash, bank transfer, or QRIS).
  INSERT INTO public.reservations (
    reservation_code, guest_name, guest_email, guest_phone, check_in, check_out,
    adults, children, status, total_amount_cents, currency, source,
    payment_method, payment_status, paid_at, internal_notes
  ) VALUES (
    v_reservation_code, TRIM(p_guest_name), LOWER(TRIM(p_guest_email)), TRIM(p_guest_phone),
    p_check_in, p_check_out, p_guest_count, 0, v_reservation_status,
    v_total_amount_cents::INTEGER, 'IDR', 'walk_in', 'pay_at_hotel',
    CASE WHEN p_payment_status = 'paid' THEN 'paid' ELSE 'unpaid' END,
    v_paid_at,
    'Dibuat oleh resepsionis / admin secara offline. Metode pembayaran: ' || p_payment_method || '.'
  ) RETURNING id INTO v_reservation_id;

  INSERT INTO public.reservation_items (reservation_id, room_type_id, assigned_room_id, subtotal_cents)
  VALUES (v_reservation_id, v_room.room_type_id, p_room_id, v_total_amount_cents::INTEGER)
  RETURNING id INTO v_reservation_item_id;

  FOR v_night IN
    SELECT night_date, applied_rate_cents
    FROM public.calculate_stay_rates(v_room.room_type_id, p_check_in, p_check_out)
  LOOP
    INSERT INTO public.reservation_nights (reservation_item_id, room_id, night_date, rate_cents)
    VALUES (v_reservation_item_id, p_room_id, v_night.night_date, v_night.applied_rate_cents);
  END LOOP;

  IF COALESCE(p_actor, '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_received_by := p_actor::UUID;
  ELSE
    v_received_by := NULL;
  END IF;

  INSERT INTO public.payments (
    reservation_id, provider, payment_method, status, amount_idr, currency,
    paid_at, received_by, notes, metadata
  ) VALUES (
    v_reservation_id, 'offline', p_payment_method,
    CASE WHEN p_payment_status = 'paid' THEN 'paid' ELSE 'pending' END,
    v_amount_idr, 'IDR', v_paid_at,
    CASE WHEN p_payment_status = 'paid' THEN v_received_by ELSE NULL END,
    CASE WHEN p_payment_status = 'paid' THEN 'Pembayaran diterima oleh resepsionis saat tamu walk-in.' ELSE 'Pembayaran belum diterima saat reservasi walk-in dicatat.' END,
    jsonb_build_object('source', 'walk_in', 'reservation_code', v_reservation_code,
                       'room_number', v_room.room_number, 'payment_method_offline', p_payment_method,
                       'guest_count', p_guest_count, 'actor', COALESCE(p_actor, 'admin_panel'))
  ) RETURNING id INTO v_payment_id;

  INSERT INTO public.payment_events (payment_id, event_type, actor, notes, payload)
  VALUES (
    v_payment_id,
    CASE WHEN p_payment_status = 'paid' THEN 'offline_payment_received' ELSE 'created' END,
    COALESCE(NULLIF(p_actor, ''), 'admin_panel'),
    CASE WHEN p_payment_status = 'paid' THEN 'Pembayaran walk-in dicatat lunas.' ELSE 'Tagihan walk-in tercatat, menunggu pembayaran.' END,
    jsonb_build_object('reservation_code', v_reservation_code, 'amount_idr', v_amount_idr,
                       'payment_method', p_payment_method, 'payment_status', p_payment_status)
  );

  INSERT INTO public.reservation_events (reservation_id, event_type, actor, notes, payload)
  VALUES (
    v_reservation_id, 'walk_in_created', COALESCE(NULLIF(p_actor, ''), 'admin_panel'),
    'Reservasi walk-in dibuat untuk kamar ' || v_room.room_number || ' dengan status ' || v_reservation_status || '.',
    jsonb_build_object('room_id', p_room_id, 'room_number', v_room.room_number,
                       'payment_method', p_payment_method, 'payment_status', p_payment_status,
                       'guest_count', p_guest_count, 'source', 'walk_in')
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'reservation_id', v_reservation_id,
    'reservation_code', v_reservation_code,
    'reservation_status', v_reservation_status,
    'payment_id', v_payment_id,
    'payment_method', p_payment_method,
    'payment_status', p_payment_status,
    'paid_at', v_paid_at,
    'amount_idr', v_amount_idr,
    'total_amount_cents', v_total_amount_cents,
    'currency', 'IDR',
    'room_id', p_room_id,
    'room_number', v_room.room_number,
    'room_type', v_room.room_type_name,
    'check_in', p_check_in,
    'check_out', p_check_out
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_offline_walk_in_reservation(UUID, TEXT, TEXT, TEXT, INTEGER, DATE, DATE, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_offline_walk_in_reservation(UUID, TEXT, TEXT, TEXT, INTEGER, DATE, DATE, TEXT, TEXT, BOOLEAN, TEXT) TO service_role;

-- Extend the existing receipt workflow so unpaid walk-in ledger rows can be marked paid
-- without losing their concrete Cash / Transfer / QRIS method.
CREATE OR REPLACE FUNCTION public.receive_offline_payment(
  p_reservation_code TEXT,
  p_received_by UUID,
  p_receipt_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_res RECORD;
  v_payment_id UUID;
  v_amount_idr BIGINT;
  v_paid_at TIMESTAMPTZ := NOW();
  v_was_paid BOOLEAN := FALSE;
BEGIN
  SELECT id, reservation_code, status, payment_method, payment_status, total_amount_cents, currency, paid_at
  INTO v_res
  FROM public.reservations
  WHERE reservation_code = UPPER(TRIM(p_reservation_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservasi tidak ditemukan.';
  END IF;

  IF v_res.status = 'cancelled' THEN
    RAISE EXCEPTION 'Pembayaran tidak dapat dicatat untuk reservasi yang dibatalkan.';
  END IF;

  IF COALESCE(v_res.currency, 'IDR') <> 'IDR' THEN
    RAISE EXCEPTION 'Pencatatan pembayaran otomatis hanya mendukung reservasi IDR.';
  END IF;

  IF v_res.payment_status = 'paid' THEN
    SELECT id INTO v_payment_id
    FROM public.payments
    WHERE reservation_id = v_res.id AND status = 'paid'
    ORDER BY paid_at DESC NULLS LAST, created_at DESC
    LIMIT 1;
    RETURN jsonb_build_object(
      'success', TRUE,
      'already_paid', TRUE,
      'reservation_code', v_res.reservation_code,
      'payment_status', 'paid',
      'payment_id', v_payment_id,
      'paid_at', v_res.paid_at
    );
  END IF;

  IF COALESCE(v_res.payment_method, 'pay_at_hotel') <> 'pay_at_hotel' THEN
    RAISE EXCEPTION 'Metode pembayaran reservasi ini bukan Bayar di Hotel.';
  END IF;

  v_amount_idr := GREATEST(0, ROUND(COALESCE(v_res.total_amount_cents, 0)::numeric / 100.0)::bigint);

  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE reservation_id = v_res.id
    AND payment_method IN ('pay_at_hotel', 'cash', 'bank_transfer', 'qris')
    AND status IN ('pending', 'failed', 'expired')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_payment_id IS NULL THEN
    INSERT INTO public.payments (
      reservation_id, provider, payment_method, status, amount_idr, currency
    ) VALUES (
      v_res.id, 'offline', 'pay_at_hotel', 'pending', v_amount_idr, 'IDR'
    )
    RETURNING id INTO v_payment_id;
  END IF;

  UPDATE public.payments
  SET status = 'paid',
      amount_idr = v_amount_idr,
      currency = 'IDR',
      paid_at = v_paid_at,
      received_by = p_received_by,
      receipt_reference = NULLIF(LEFT(TRIM(COALESCE(p_receipt_reference, '')), 120), ''),
      notes = NULLIF(LEFT(TRIM(COALESCE(p_notes, '')), 500), ''),
      updated_at = v_paid_at
  WHERE id = v_payment_id;

  UPDATE public.reservations
  SET payment_method = 'pay_at_hotel',
      payment_status = 'paid',
      paid_at = v_paid_at,
      updated_at = v_paid_at
  WHERE id = v_res.id;

  INSERT INTO public.payment_events (
    payment_id, event_type, actor, notes, payload
  ) VALUES (
    v_payment_id,
    'offline_payment_received',
    COALESCE(p_received_by::text, 'admin_panel'),
    COALESCE(NULLIF(LEFT(TRIM(COALESCE(p_notes, '')), 500), ''), 'Pembayaran penuh diterima di hotel.'),
    jsonb_build_object(
      'reservation_code', v_res.reservation_code,
      'amount_idr', v_amount_idr,
      'receipt_reference', NULLIF(LEFT(TRIM(COALESCE(p_receipt_reference, '')), 120), ''),
      'payment_status', 'paid'
    )
  );

  INSERT INTO public.reservation_events (
    reservation_id, event_type, actor, notes, payload
  ) VALUES (
    v_res.id,
    'payment_received',
    COALESCE(p_received_by::text, 'admin_panel'),
    'Pembayaran penuh diterima di hotel.',
    jsonb_build_object('payment_id', v_payment_id, 'amount_idr', v_amount_idr)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'already_paid', FALSE,
    'reservation_code', v_res.reservation_code,
    'payment_id', v_payment_id,
    'payment_status', 'paid',
    'paid_at', v_paid_at,
    'amount_idr', v_amount_idr
  );
END;
$$;

REVOKE ALL ON FUNCTION public.receive_offline_payment(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.receive_offline_payment(TEXT, UUID, TEXT, TEXT) TO service_role;


COMMIT;
