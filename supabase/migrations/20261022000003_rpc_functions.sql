-- ============================================================================
-- HOTEL LE MEDINA & RESTO - SUPABASE SCHEMA MIGRATION 03: RPC FUNCTIONS
-- High-concurrency atomic booking engine with [check_in, check_out) interval logic
-- ============================================================================

-- Function 1: Check availability for a room type within [check_in, check_out)
CREATE OR REPLACE FUNCTION public.check_room_type_availability(
    p_room_type_id UUID,
    p_check_in DATE,
    p_check_out DATE
)
RETURNS TABLE (
    room_id UUID,
    room_number TEXT,
    floor INTEGER,
    wing TEXT
) AS $$
BEGIN
    IF p_check_out <= p_check_in THEN
        RAISE EXCEPTION 'check_out date (%) must be strictly after check_in date (%)', p_check_out, p_check_in;
    END IF;

    RETURN QUERY
    SELECT r.id, r.room_number, r.floor, r.wing
    FROM public.rooms r
    WHERE r.room_type_id = p_room_type_id
      AND r.status = 'available'
      AND NOT EXISTS (
          -- Check if room has any reserved night overlapping [check_in, check_out)
          SELECT 1
          FROM public.reservation_nights rn
          JOIN public.reservation_items ri ON ri.id = rn.reservation_item_id
          JOIN public.reservations res ON res.id = ri.reservation_id
          WHERE rn.room_id = r.id
            AND rn.night_date >= p_check_in
            AND rn.night_date < p_check_out
            AND res.status IN ('pending', 'confirmed', 'checked_in')
      );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public, pg_temp;

-- Function 2: Calculate daily rates & total price with dynamic pricing
CREATE OR REPLACE FUNCTION public.calculate_stay_rates(
    p_room_type_id UUID,
    p_check_in DATE,
    p_check_out DATE
)
RETURNS TABLE (
    night_date DATE,
    applied_rate_cents INTEGER,
    rate_source TEXT
) AS $$
DECLARE
    v_base_cents INTEGER;
    v_curr_date DATE := p_check_in;
    v_custom_rate INTEGER;
    v_rate_name TEXT;
BEGIN
    SELECT base_price_cents INTO v_base_cents
    FROM public.room_types
    WHERE id = p_room_type_id;

    IF v_base_cents IS NULL THEN
        RAISE EXCEPTION 'Room type ID % not found', p_room_type_id;
    END IF;

    WHILE v_curr_date < p_check_out LOOP
        -- Check if special rate applies for this date
        SELECT price_cents, rate_name INTO v_custom_rate, v_rate_name
        FROM public.room_rates
        WHERE room_type_id = p_room_type_id
          AND is_active = true
          AND v_curr_date >= start_date
          AND v_curr_date <= end_date
        ORDER BY price_cents DESC
        LIMIT 1;

        IF v_custom_rate IS NOT NULL THEN
            night_date := v_curr_date;
            applied_rate_cents := v_custom_rate;
            rate_source := v_rate_name;
        ELSE
            night_date := v_curr_date;
            applied_rate_cents := v_base_cents;
            rate_source := 'Standard Base Rate';
        END IF;

        RETURN NEXT;
        v_curr_date := v_curr_date + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public, pg_temp;

-- Function 3: Atomic reservation creation with row locking & audit logging
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
    -- 1. Validation
    IF p_check_out <= p_check_in THEN
        RAISE EXCEPTION 'Check-out date must be after check-in date';
    END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function 4: Safe guest reservation lookup by unique reservation code
-- Strips internal staff notes and sensitive administration metadata
CREATE OR REPLACE FUNCTION public.get_guest_reservation_by_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_clean_code TEXT;
    v_res RECORD;
BEGIN
    v_clean_code := upper(trim(p_code));

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

    IF v_res IS NULL THEN
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
        'room_type_name', v_res.room_type_name,
        'assigned_room_number', v_res.assigned_room_number
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
