-- Hôtel Le Médina: repair stale room-night rows before atomic reservation creation.
-- Safe to run once in the Supabase SQL Editor. Keeps the UNIQUE(room_id, night_date)
-- constraint and preserves historical nights outside the dates being rebooked.
BEGIN;

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

COMMIT;
