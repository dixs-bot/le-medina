-- Payment workflow stage 2 for Hôtel Le Médina & Resto Singkawang.
-- Prerequisite: migration 20261023000006_payment_workflow_foundation.sql has run.
-- Additive and transactional; does not delete reservations.
BEGIN;

-- Existing reservations were created before payment selection existed. Treat only IDR
-- records as pay-at-hotel legacy bookings and keep all of them unpaid until staff verifies receipt.
UPDATE public.reservations
SET payment_method = 'pay_at_hotel',
    payment_status = COALESCE(payment_status, 'unpaid')
WHERE payment_method IS NULL
  AND COALESCE(currency, 'IDR') = 'IDR';

INSERT INTO public.payments (
  reservation_id, provider, payment_method, status, amount_idr, currency, notes
)
SELECT
  r.id,
  'offline',
  'pay_at_hotel',
  'pending',
  GREATEST(0, ROUND(r.total_amount_cents::numeric / 100.0)::bigint),
  'IDR',
  'Pembayaran legacy: menunggu penerimaan pembayaran terverifikasi di hotel'
FROM public.reservations r
WHERE COALESCE(r.currency, 'IDR') = 'IDR'
  AND r.status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.reservation_id = r.id
      AND p.payment_method = 'pay_at_hotel'
      AND p.status IN ('pending', 'paid')
  );

-- In version 1, a single full payment can be marked paid per reservation.
-- Later, if partial payments are introduced, this constraint must be redesigned.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_paid_per_reservation_v1
  ON public.payments (reservation_id)
  WHERE status = 'paid';

-- New transactional wrapper: create reservation + mark method + create pending payment
-- in the same PostgreSQL transaction by calling the existing atomic reservation RPC.
CREATE OR REPLACE FUNCTION public.create_atomic_reservation_with_payment(
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER,
  p_children INTEGER,
  p_room_type_id UUID,
  p_special_requests TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'pay_at_hotel'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_reservation_id UUID;
  v_reservation_code TEXT;
  v_total_amount_cents NUMERIC;
  v_amount_idr BIGINT;
  v_currency TEXT;
  v_payment_id UUID;
BEGIN
  IF COALESCE(p_payment_method, 'pay_at_hotel') <> 'pay_at_hotel' THEN
    RAISE EXCEPTION 'Pembayaran online belum aktif. Silakan pilih Bayar di Hotel.';
  END IF;

  v_result := public.create_atomic_reservation(
    p_guest_name,
    p_guest_email,
    p_guest_phone,
    p_check_in,
    p_check_out,
    p_adults,
    p_children,
    p_room_type_id,
    p_special_requests
  );

  IF COALESCE((v_result ->> 'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Reservasi tidak dikonfirmasi oleh fungsi reservasi inti.';
  END IF;

  v_reservation_id := (v_result ->> 'reservation_id')::uuid;
  v_reservation_code := v_result ->> 'reservation_code';
  v_total_amount_cents := COALESCE((v_result ->> 'total_amount_cents')::numeric, 0);
  v_currency := COALESCE(v_result ->> 'currency', 'IDR');

  IF v_currency <> 'IDR' THEN
    RAISE EXCEPTION 'Workflow pembayaran saat ini hanya mendukung IDR.';
  END IF;

  v_amount_idr := GREATEST(0, ROUND(v_total_amount_cents / 100.0)::bigint);

  UPDATE public.reservations
  SET payment_method = 'pay_at_hotel',
      payment_status = 'unpaid',
      paid_at = NULL,
      updated_at = NOW()
  WHERE id = v_reservation_id;

  INSERT INTO public.payments (
    reservation_id, provider, payment_method, status, amount_idr, currency, notes, metadata
  ) VALUES (
    v_reservation_id,
    'offline',
    'pay_at_hotel',
    'pending',
    v_amount_idr,
    'IDR',
    'Pelanggan memilih Bayar di Hotel; menunggu pembayaran diterima staf.',
    jsonb_build_object('reservation_code', v_reservation_code, 'source', 'direct_web')
  )
  RETURNING id INTO v_payment_id;

  INSERT INTO public.payment_events (
    payment_id, event_type, actor, notes, payload
  ) VALUES (
    v_payment_id,
    'created',
    'direct_guest_web',
    'Catatan pembayaran dibuat; belum lunas.',
    jsonb_build_object(
      'reservation_code', v_reservation_code,
      'payment_method', 'pay_at_hotel',
      'amount_idr', v_amount_idr,
      'payment_status', 'unpaid'
    )
  );

  RETURN v_result || jsonb_build_object(
    'payment_id', v_payment_id,
    'payment_method', 'pay_at_hotel',
    'payment_status', 'unpaid',
    'paid_at', NULL,
    'amount_idr', v_amount_idr
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_atomic_reservation_with_payment(
  TEXT, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER, UUID, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_atomic_reservation_with_payment(
  TEXT, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER, UUID, TEXT, TEXT
) TO service_role;

-- Mark a pay-at-hotel payment as received. Every update and audit event is one DB transaction.
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
    AND payment_method = 'pay_at_hotel'
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

-- Return minimal payment state on the public-safe reservation confirmation RPC.
CREATE OR REPLACE FUNCTION public.get_guest_reservation_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_clean_code TEXT;
  v_res RECORD;
BEGIN
  v_clean_code := UPPER(TRIM(p_code));

  SELECT
    r.id,
    r.reservation_code,
    r.guest_name,
    r.check_in,
    r.check_out,
    r.adults,
    r.children,
    r.status,
    r.total_amount_cents,
    r.currency,
    r.created_at,
    r.payment_method,
    r.payment_status,
    r.paid_at,
    rt.name AS room_type_name,
    rt.slug AS room_type_slug,
    rm.room_number AS assigned_room_number
  INTO v_res
  FROM public.reservations r
  LEFT JOIN public.reservation_items ri ON ri.reservation_id = r.id
  LEFT JOIN public.room_types rt ON rt.id = ri.room_type_id
  LEFT JOIN public.rooms rm ON rm.id = ri.assigned_room_id
  WHERE r.reservation_code = v_clean_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'reservation_code', v_res.reservation_code,
    'guest_name', v_res.guest_name,
    'check_in', v_res.check_in,
    'check_out', v_res.check_out,
    'adults', v_res.adults,
    'children', v_res.children,
    'status', v_res.status,
    'total_amount_cents', v_res.total_amount_cents,
    'currency', v_res.currency,
    'payment_method', v_res.payment_method,
    'payment_status', v_res.payment_status,
    'paid_at', v_res.paid_at,
    'room_type_name', v_res.room_type_name,
    'room_type_slug', v_res.room_type_slug,
    'assigned_room_number', v_res.assigned_room_number
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_guest_reservation_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_reservation_by_code(TEXT) TO anon, authenticated, service_role;

COMMIT;
