-- Hôtel Le Médina & Resto Singkawang
-- Room inventory, live room availability, and checkout/cancellation release.
-- Preserves existing room-type IDs and prices; does not remove reservation history.
BEGIN;

-- Rename the three existing development room types while keeping their IDs,
-- relations and current prices untouched. Temporary slugs avoid UNIQUE conflicts.
UPDATE public.room_types
SET slug = '__lemedina_migration__' || replace(id::text, '-', ''), updated_at = NOW()
WHERE id IN (
  'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'c3333333-cccc-cccc-cccc-cccccccccccc'::uuid
);

UPDATE public.room_types
SET name = 'Standar', slug = 'standar',
    tagline = 'Kamar nyaman untuk kebutuhan menginap harian',
    description = 'Kamar Standar dengan tarif yang tetap mengikuti harga aktif saat ini.',
    sort_order = 1, is_active = TRUE, updated_at = NOW()
WHERE id = 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

UPDATE public.room_types
SET name = 'Royale', slug = 'royale',
    tagline = 'Kamar Royale dengan kenyamanan lebih untuk pengalaman menginap',
    description = 'Kamar Royale dengan tarif yang tetap mengikuti harga aktif saat ini.',
    sort_order = 2, is_active = TRUE, updated_at = NOW()
WHERE id = 'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

UPDATE public.room_types
SET name = 'Premium', slug = 'premium',
    tagline = 'Kamar Premium untuk pengalaman menginap istimewa',
    description = 'Kamar Premium dengan tarif yang tetap mengikuti harga aktif saat ini.',
    sort_order = 3, is_active = TRUE, updated_at = NOW()
WHERE id = 'c3333333-cccc-cccc-cccc-cccccccccccc'::uuid;

-- Legacy demo type remains inactive. Delete only its physical room rows that have
-- no reservation or occupancy references; historical/active records are retained.
DELETE FROM public.rooms r
USING public.room_types rt
WHERE r.room_type_id = rt.id
  AND rt.slug = 'riad-jasmine-heritage-room'
  AND NOT EXISTS (
    SELECT 1 FROM public.reservation_items ri WHERE ri.assigned_room_id = r.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.reservation_nights rn WHERE rn.room_id = r.id
  );

-- Standardize visible room labels for the three active types. Room IDs remain the
-- same, so reservations continue to point to the exact same physical room rows.
UPDATE public.rooms r
SET room_number = 'TMP-' || replace(r.id::text, '-', '')
FROM public.room_types rt
WHERE r.room_type_id = rt.id
  AND rt.slug IN ('standar', 'royale', 'premium');

WITH ranked AS (
  SELECT r.id, rt.slug,
         ROW_NUMBER() OVER (PARTITION BY r.room_type_id ORDER BY r.created_at, r.id) AS rn
  FROM public.rooms r
  JOIN public.room_types rt ON rt.id = r.room_type_id
  WHERE rt.slug IN ('standar', 'royale', 'premium')
)
UPDATE public.rooms r
SET room_number = CASE ranked.slug
                    WHEN 'standar' THEN '1' || LPAD(ranked.rn::text, 2, '0')
                    WHEN 'royale'  THEN '2' || LPAD(ranked.rn::text, 2, '0')
                    ELSE                '3' || LPAD(ranked.rn::text, 2, '0')
                  END,
    floor = CASE ranked.slug WHEN 'standar' THEN 1 WHEN 'royale' THEN 2 ELSE 3 END,
    wing = CASE ranked.slug WHEN 'standar' THEN 'Standar Wing' WHEN 'royale' THEN 'Royale Wing' ELSE 'Premium Wing' END,
    updated_at = NOW()
FROM ranked
WHERE r.id = ranked.id;

-- Bring the active development inventory to 4 Standar + 4 Royale + 2 Premium.
-- Inserts only missing room numbers, making this migration safe to re-run.
INSERT INTO public.rooms (room_type_id, room_number, floor, wing, status)
SELECT rt.id, inventory.room_number, inventory.floor, inventory.wing, 'available'
FROM (VALUES
  ('standar', '101', 1, 'Standar Wing'),
  ('standar', '102', 1, 'Standar Wing'),
  ('standar', '103', 1, 'Standar Wing'),
  ('standar', '104', 1, 'Standar Wing'),
  ('royale',  '201', 2, 'Royale Wing'),
  ('royale',  '202', 2, 'Royale Wing'),
  ('royale',  '203', 2, 'Royale Wing'),
  ('royale',  '204', 2, 'Royale Wing'),
  ('premium', '301', 3, 'Premium Wing'),
  ('premium', '302', 3, 'Premium Wing')
) AS inventory(type_slug, room_number, floor, wing)
JOIN public.room_types rt ON rt.slug = inventory.type_slug AND rt.is_active = TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.rooms existing WHERE existing.room_number = inventory.room_number
);

-- Re-apply the hardened allocator here too, so migration 9 is authoritative even when migration 8 was already installed.
CREATE OR REPLACE FUNCTION public.create_atomic_reservation(
    p_guest_name TEXT,
    p_guest_email TEXT,
    p_guest_phone TEXT,
    p_check_in DATE,
    p_check_out DATE,
    p_adults INTEGER,
    p_children INTEGER,
    p_room_type_id UUID,
    p_special_requests TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_available_room_id UUID;
    v_res_id UUID;
    v_res_item_id UUID;
    v_res_code TEXT;
    v_total_cents INTEGER := 0;
    v_rate_record RECORD;
BEGIN
    -- Validate first; never mutate occupancy data for an invalid date range.
    IF p_check_out <= p_check_in THEN
        RAISE EXCEPTION 'Check-out date must be after check-in date';
    END IF;

    -- Remove stale occupancy rows tied to terminal reservations for this requested range.
    -- The room/date UNIQUE constraint stays in place as the final safeguard.
    DELETE FROM public.reservation_nights rn
    USING public.reservation_items ri, public.reservations res
    WHERE rn.reservation_item_id = ri.id
      AND ri.reservation_id = res.id
      AND rn.night_date >= p_check_in
      AND rn.night_date < p_check_out
      AND res.status IN ('cancelled', 'checked_out');

    -- 2. Concurrency-safe room assignment: select first available room and lock it
    SELECT r.id INTO v_available_room_id
    FROM public.rooms r
    WHERE r.room_type_id = p_room_type_id
      AND r.status = 'available'
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
      AND NOT EXISTS (
          -- Also protect the assigned-room/date interval if legacy occupancy-night rows
          -- are missing. This avoids attempting a duplicate physical-room assignment.
          SELECT 1
          FROM public.reservation_items ri
          JOIN public.reservations res ON res.id = ri.reservation_id
          WHERE ri.assigned_room_id = r.id
            AND res.check_in < p_check_out
            AND res.check_out > p_check_in
            AND res.status IN ('pending', 'confirmed', 'checked_in')
      )
    ORDER BY r.room_number
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF v_available_room_id IS NULL THEN
        RAISE EXCEPTION 'No rooms of the requested type are available for the selected dates';
    END IF;

    -- 3. Generate unique alphanumeric reservation code e.g. MED-7A49X
    v_res_code := 'MED-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));

    -- 4. Calculate total amount
    FOR v_rate_record IN 
        SELECT applied_rate_cents FROM public.calculate_stay_rates(p_room_type_id, p_check_in, p_check_out)
    LOOP
        v_total_cents := v_total_cents + v_rate_record.applied_rate_cents;
    END LOOP;

    -- 5. Insert Master Reservation
    INSERT INTO public.reservations (
        reservation_code,
        guest_name,
        guest_email,
        guest_phone,
        special_requests,
        check_in,
        check_out,
        adults,
        children,
        status,
        total_amount_cents,
        currency
    ) VALUES (
        v_res_code,
        p_guest_name,
        p_guest_email,
        p_guest_phone,
        p_special_requests,
        p_check_in,
        p_check_out,
        p_adults,
        p_children,
        'pending',
        v_total_cents,
        COALESCE((SELECT currency FROM public.room_types WHERE id = p_room_type_id), 'IDR')
    ) RETURNING id INTO v_res_id;

    -- 6. Insert Reservation Item
    INSERT INTO public.reservation_items (
        reservation_id,
        room_type_id,
        assigned_room_id,
        subtotal_cents
    ) VALUES (
        v_res_id,
        p_room_type_id,
        v_available_room_id,
        v_total_cents
    ) RETURNING id INTO v_res_item_id;

    -- 7. Insert Reservation Nights (guarantees calendar lock)
    FOR v_rate_record IN 
        SELECT night_date, applied_rate_cents FROM public.calculate_stay_rates(p_room_type_id, p_check_in, p_check_out)
    LOOP
        INSERT INTO public.reservation_nights (
            reservation_item_id,
            room_id,
            night_date,
            rate_cents
        ) VALUES (
            v_res_item_id,
            v_available_room_id,
            v_rate_record.night_date,
            v_rate_record.applied_rate_cents
        );
    END LOOP;

    -- 8. Audit event log
    INSERT INTO public.reservation_events (
        reservation_id,
        event_type,
        actor,
        notes,
        payload
    ) VALUES (
        v_res_id,
        'created',
        'direct_guest_web',
        'Reservation created via direct booking engine',
        jsonb_build_object(
            'reservation_code', v_res_code,
            'assigned_room_id', v_available_room_id,
            'check_in', p_check_in,
            'check_out', p_check_out,
            'total_cents', v_total_cents
        )
    );

    -- 9. Return JSON confirmation
    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_res_id,
        'reservation_code', v_res_code,
        'status', 'pending',
        'check_in', p_check_in,
        'check_out', p_check_out,
        'nights', (p_check_out - p_check_in),
        'total_amount_cents', v_total_cents,
        'currency', COALESCE((SELECT currency FROM public.room_types WHERE id = p_room_type_id), 'IDR'),
        'room_id', v_available_room_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

-- Release date rows when staff marks a booking checked-out or cancelled.
-- Past nights are retained for history; today and future nights are freed using
-- the hotel's local calendar date, so they cannot block another valid reservation.
CREATE OR REPLACE FUNCTION public.release_room_nights_after_reservation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('checked_out', 'cancelled') THEN
    DELETE FROM public.reservation_nights rn
    USING public.reservation_items ri
    WHERE rn.reservation_item_id = ri.id
      AND ri.reservation_id = NEW.id
      AND rn.night_date >= v_today;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_room_nights_after_status_change ON public.reservations;
CREATE TRIGGER trg_release_room_nights_after_status_change
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.release_room_nights_after_reservation_status_change();

-- Cleanup any already-stale future occupancy records from reservations whose
-- lifecycle is terminal; the UNIQUE(room_id, night_date) safeguard remains intact.
DELETE FROM public.reservation_nights rn
USING public.reservation_items ri, public.reservations res
WHERE rn.reservation_item_id = ri.id
  AND ri.reservation_id = res.id
  AND rn.night_date >= (NOW() AT TIME ZONE 'Asia/Jakarta')::date
  AND res.status IN ('cancelled', 'checked_out');

COMMIT;

-- Verification: expected active inventory is 10 rooms: Standar 4, Royale 4, Premium 2.
SELECT rt.name, rt.slug, rt.base_price_cents, rt.currency, COUNT(r.id) AS room_count
FROM public.room_types rt
LEFT JOIN public.rooms r ON r.room_type_id = rt.id
WHERE rt.is_active = TRUE AND rt.slug IN ('standar', 'royale', 'premium')
GROUP BY rt.id, rt.name, rt.slug, rt.base_price_cents, rt.currency
ORDER BY rt.sort_order;
