-- ============================================================================
-- HOTEL LE MEDINA & RESTO - SUPABASE SCHEMA MIGRATION 05: SECURITY HARDENING
-- Remediation of RLS reservations exposure, Search Path CWE-426, and RPC safeguards
-- ============================================================================

-- 1. Ensure current_user_has_role has fixed search_path (CWE-426 prevention)
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF current_user = 'postgres' OR current_user = 'service_role' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE p.auth_user_id = auth.uid()
      AND (
        ur.role = required_role 
        OR ur.role = 'super_admin'
        OR (required_role = 'reservation_staff' AND ur.role IN ('admin', 'super_admin'))
        OR (required_role = 'content_editor' AND ur.role IN ('admin', 'super_admin'))
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Drop insecure public SELECT policy on reservations if present
DROP POLICY IF EXISTS "Tamus can view own reservation by code" ON public.reservations;
DROP POLICY IF EXISTS "Public can view reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff can view reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff can update reservations" ON public.reservations;

-- 3. Recreate strict RLS policies on reservations
-- Only authenticated hotel staff can SELECT or UPDATE reservation rows directly
CREATE POLICY "Staff can view reservations" ON public.reservations
    FOR SELECT USING (public.current_user_has_role('reservation_staff'));

CREATE POLICY "Staff can update reservations" ON public.reservations
    FOR UPDATE USING (public.current_user_has_role('reservation_staff'));

-- Public guests can only insert reservations
CREATE POLICY "Tamus can create reservations" ON public.reservations
    FOR INSERT WITH CHECK (true);

-- 4. Safe guest lookup RPC without exposing internal notes or other guests' records
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
