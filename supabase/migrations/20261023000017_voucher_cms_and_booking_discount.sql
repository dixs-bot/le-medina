-- Voucher CMS for Hôtel Le Médina & Resto.
-- Destructive by design for public offers: the user requested clearing the old demo vouchers.
-- Run only in the Supabase project used by production website.
BEGIN;

-- Clear legacy/demo voucher cards before management enters official codes.
DELETE FROM public.offers;

-- Voucher rules: unique code + percentage-only discount + valid date range.
ALTER TABLE public.offers ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.offers ALTER COLUMN discount_percentage SET NOT NULL;
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_discount_percentage_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_discount_percentage_check
  CHECK (discount_percentage >= 1 AND discount_percentage <= 100);
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_code_format_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_code_format_check
  CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$');
CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_code_upper_unique
  ON public.offers (UPPER(code));

-- Keep booking audit information. Existing reservation totals are not rewritten.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percentage INTEGER;

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_discount_percentage_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_discount_percentage_check
  CHECK (discount_percentage IS NULL OR (discount_percentage >= 1 AND discount_percentage <= 100));
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_discount_amount_nonnegative_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_discount_amount_nonnegative_check
  CHECK (discount_amount_cents >= 0);

-- Server APIs use service_role. Browser users receive read-only access subject to RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.offers TO service_role;
GRANT SELECT ON TABLE public.offers TO anon, authenticated;

-- Voucher photo assets are public-read but uploaded only from authenticated server APIs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voucher-images',
  'voucher-images',
  true,
  4194304,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 4194304,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[];

-- Overload with the same booking inputs plus a required voucher argument. The legacy
-- 10-argument RPC remains available; this 11-argument overload validates and applies
-- the voucher transactionally after the core atomic reservation and payment record.
CREATE OR REPLACE FUNCTION public.create_atomic_reservation_with_payment(
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER,
  p_children INTEGER,
  p_room_type_id UUID,
  p_special_requests TEXT,
  p_payment_method TEXT,
  p_promo_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_reservation_id UUID;
  v_payment_id UUID;
  v_voucher_code TEXT := UPPER(TRIM(COALESCE(p_promo_code, '')));
  v_discount_percentage INTEGER;
  v_valid_from DATE;
  v_valid_to DATE;
  v_original_total_cents BIGINT;
  v_discount_cents BIGINT := 0;
  v_discounted_total_cents BIGINT;
  v_amount_idr BIGINT;
BEGIN
  IF COALESCE(p_payment_method, 'pay_at_hotel') <> 'pay_at_hotel' THEN
    RAISE EXCEPTION 'Pembayaran online belum aktif. Silakan pilih Bayar di Hotel.';
  END IF;

  IF v_voucher_code <> '' THEN
    SELECT discount_percentage, valid_from, valid_to
      INTO v_discount_percentage, v_valid_from, v_valid_to
    FROM public.offers
    WHERE UPPER(code) = v_voucher_code
      AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Kode voucher tidak valid atau sedang nonaktif.';
    END IF;

    IF p_check_in < v_valid_from OR p_check_in > v_valid_to THEN
      RAISE EXCEPTION 'Kode voucher tidak berlaku pada tanggal check-in yang dipilih.';
    END IF;

    IF v_discount_percentage < 1 OR v_discount_percentage > 100 THEN
      RAISE EXCEPTION 'Persentase diskon voucher tidak valid.';
    END IF;
  END IF;

  -- Calling with 10 positional arguments resolves to the existing base overload,
  -- whose work is still atomic and includes room allocation, nights, and payment.
  v_result := public.create_atomic_reservation_with_payment(
    p_guest_name,
    p_guest_email,
    p_guest_phone,
    p_check_in,
    p_check_out,
    p_adults,
    p_children,
    p_room_type_id,
    p_special_requests,
    p_payment_method
  );

  IF v_voucher_code = '' THEN
    RETURN v_result || jsonb_build_object(
      'promo_code', NULL,
      'discount_amount_cents', 0,
      'discount_percentage', NULL
    );
  END IF;

  v_reservation_id := (v_result ->> 'reservation_id')::UUID;
  v_payment_id := NULLIF(v_result ->> 'payment_id', '')::UUID;
  v_original_total_cents := COALESCE((v_result ->> 'total_amount_cents')::BIGINT, 0);
  v_discount_cents := ROUND(v_original_total_cents::NUMERIC * v_discount_percentage / 100.0)::BIGINT;
  v_discounted_total_cents := GREATEST(0, v_original_total_cents - v_discount_cents);
  v_amount_idr := GREATEST(0, ROUND(v_discounted_total_cents / 100.0)::BIGINT);

  UPDATE public.reservations
  SET total_amount_cents = v_discounted_total_cents::INTEGER,
      promo_code = v_voucher_code,
      discount_amount_cents = v_discount_cents::INTEGER,
      discount_percentage = v_discount_percentage,
      internal_notes = CONCAT_WS(E'\n', NULLIF(internal_notes, ''),
        'Voucher ' || v_voucher_code || ': diskon ' || v_discount_percentage || '%'),
      updated_at = NOW()
  WHERE id = v_reservation_id;

  UPDATE public.reservation_items
  SET subtotal_cents = v_discounted_total_cents::INTEGER
  WHERE reservation_id = v_reservation_id;

  IF v_payment_id IS NOT NULL THEN
    UPDATE public.payments
    SET amount_idr = v_amount_idr,
        metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
          'promo_code', v_voucher_code,
          'discount_percentage', v_discount_percentage,
          'discount_amount_cents', v_discount_cents,
          'original_amount_idr', GREATEST(0, ROUND(v_original_total_cents / 100.0)::BIGINT),
          'amount_idr', v_amount_idr
        ),
        updated_at = NOW()
    WHERE id = v_payment_id;

    UPDATE public.payment_events
    SET payload = COALESCE(payload, '{}'::JSONB) || jsonb_build_object(
      'promo_code', v_voucher_code,
      'discount_percentage', v_discount_percentage,
      'discount_amount_cents', v_discount_cents,
      'amount_idr', v_amount_idr
    )
    WHERE payment_id = v_payment_id AND event_type = 'created';
  END IF;

  UPDATE public.reservation_events
  SET notes = CONCAT_WS(' ', NULLIF(notes, ''),
        'Voucher ' || v_voucher_code || ' dipakai dengan diskon ' || v_discount_percentage || '%.'),
      payload = COALESCE(payload, '{}'::JSONB) || jsonb_build_object(
        'promo_code', v_voucher_code,
        'discount_percentage', v_discount_percentage,
        'discount_amount_cents', v_discount_cents,
        'total_after_discount_cents', v_discounted_total_cents
      )
  WHERE reservation_id = v_reservation_id AND event_type = 'created';

  RETURN v_result || jsonb_build_object(
    'total_amount_cents', v_discounted_total_cents,
    'promo_code', v_voucher_code,
    'discount_amount_cents', v_discount_cents,
    'discount_percentage', v_discount_percentage,
    'amount_idr', v_amount_idr
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_atomic_reservation_with_payment(
  TEXT, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER, UUID, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_atomic_reservation_with_payment(
  TEXT, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER, UUID, TEXT, TEXT, TEXT
) TO service_role;

COMMIT;
