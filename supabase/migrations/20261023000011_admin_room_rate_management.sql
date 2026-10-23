-- Hôtel Le Médina
-- Admin room inventory + live pricing management.
-- Keeps current base prices untouched; adds recurring weekday/weekend rate support.
BEGIN;

ALTER TABLE public.room_rates
  ADD COLUMN IF NOT EXISTS rate_type TEXT NOT NULL DEFAULT 'seasonal',
  ADD COLUMN IF NOT EXISTS days_of_week SMALLINT[] NOT NULL DEFAULT '{}'::SMALLINT[],
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.room_rates DROP CONSTRAINT IF EXISTS room_rates_rate_type_check;
ALTER TABLE public.room_rates
  ADD CONSTRAINT room_rates_rate_type_check
  CHECK (rate_type IN ('seasonal', 'weekend', 'holiday', 'custom'));

ALTER TABLE public.room_rates DROP CONSTRAINT IF EXISTS room_rates_days_of_week_check;
ALTER TABLE public.room_rates
  ADD CONSTRAINT room_rates_days_of_week_check
  CHECK (
    cardinality(days_of_week) = 0
    OR (days_of_week <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[])
  );

-- The example winter rates seeded for the original demo are not real owner-approved
-- prices for the current Indonesian room catalogue. Deactivate only those examples.
UPDATE public.room_rates
SET is_active = FALSE, updated_at = NOW()
WHERE rate_name IN (
  'Winter Holiday Oasis High Season',
  'Atlas Winter Starlight Season'
);

-- Prevent the same room number from being entered twice with a different letter case
-- or leading/trailing spaces. Existing exact duplicates are already prevented by UNIQUE.
CREATE UNIQUE INDEX IF NOT EXISTS rooms_room_number_normalized_unique
  ON public.rooms (LOWER(BTRIM(room_number)));

-- The public booking and front desk use this single source of truth for every night.
-- ISO weekday: Monday=1 ... Sunday=7. Weekend rates can repeat every selected weekend
-- day in the date range. Higher priority rates (e.g. long holiday) override weekends.
CREATE OR REPLACE FUNCTION public.calculate_stay_rates(
  p_room_type_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS TABLE (
  night_date DATE,
  applied_rate_cents INTEGER,
  rate_source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_base_cents INTEGER;
  v_curr_date DATE := p_check_in;
  v_custom_rate INTEGER;
  v_rate_name TEXT;
  v_blocking_rate_name TEXT;
  v_min_stay INTEGER;
BEGIN
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Tanggal check-in/check-out tidak valid.';
  END IF;

  SELECT rt.base_price_cents
  INTO v_base_cents
  FROM public.room_types rt
  WHERE rt.id = p_room_type_id
    AND rt.is_active = TRUE;

  IF v_base_cents IS NULL THEN
    RAISE EXCEPTION 'Tipe kamar tidak ditemukan atau tidak aktif.';
  END IF;

  -- Enforce minimum stay when any active pricing rule matches at least one night,
  -- including recurring weekday/weekend rules.
  SELECT rr.rate_name, rr.min_stay_nights
  INTO v_blocking_rate_name, v_min_stay
  FROM public.room_rates rr
  WHERE rr.room_type_id = p_room_type_id
    AND rr.is_active = TRUE
    AND rr.min_stay_nights > (p_check_out - p_check_in)
    AND rr.start_date < p_check_out
    AND rr.end_date >= p_check_in
    AND (
      rr.rate_type <> 'weekend'
      OR EXISTS (
        SELECT 1
        FROM generate_series(
          GREATEST(p_check_in, rr.start_date)::TIMESTAMP,
          LEAST(p_check_out - 1, rr.end_date)::TIMESTAMP,
          INTERVAL '1 day'
        ) AS candidate(night)
        WHERE EXTRACT(ISODOW FROM candidate.night)::INTEGER = ANY(rr.days_of_week)
      )
    )
  ORDER BY rr.priority DESC, rr.min_stay_nights DESC
  LIMIT 1;

  IF v_min_stay IS NOT NULL THEN
    RAISE EXCEPTION USING MESSAGE = CONCAT('Aturan tarif ', v_blocking_rate_name, ' memerlukan masa inap minimum ', v_min_stay, ' malam.');
  END IF;

  WHILE v_curr_date < p_check_out LOOP
    v_custom_rate := NULL;
    v_rate_name := NULL;

    SELECT rr.price_cents, rr.rate_name
    INTO v_custom_rate, v_rate_name
    FROM public.room_rates rr
    WHERE rr.room_type_id = p_room_type_id
      AND rr.is_active = TRUE
      AND v_curr_date >= rr.start_date
      AND v_curr_date <= rr.end_date
      AND (
        rr.rate_type <> 'weekend'
        OR EXTRACT(ISODOW FROM v_curr_date)::INTEGER = ANY(rr.days_of_week)
      )
    ORDER BY
      rr.priority DESC,
      CASE rr.rate_type
        WHEN 'holiday' THEN 4
        WHEN 'custom' THEN 3
        WHEN 'weekend' THEN 2
        WHEN 'seasonal' THEN 1
        ELSE 0
      END DESC,
      rr.price_cents DESC,
      rr.created_at DESC
    LIMIT 1;

    night_date := v_curr_date;
    IF v_custom_rate IS NOT NULL THEN
      applied_rate_cents := v_custom_rate;
      rate_source := v_rate_name;
    ELSE
      applied_rate_cents := v_base_cents;
      rate_source := 'Tarif Dasar';
    END IF;

    RETURN NEXT;
    v_curr_date := v_curr_date + 1;
  END LOOP;
END;
$$;

-- Backend calls use the service role. Retain safe explicit grants for the RPC.
REVOKE ALL ON FUNCTION public.calculate_stay_rates(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_stay_rates(UUID, DATE, DATE) TO service_role;

COMMIT;

-- Verification queries (run separately after applying this migration):
-- SELECT id, name, base_price_cents, currency FROM public.room_types ORDER BY sort_order;
-- SELECT rate_name, rate_type, price_cents, start_date, end_date, is_active FROM public.room_rates ORDER BY start_date;
-- SELECT room_number, room_type_id, status FROM public.rooms ORDER BY room_number;
