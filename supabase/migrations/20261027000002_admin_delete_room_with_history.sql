-- DEVELOPMENT ONLY: permanently delete a physical room and reservations linked to it.
-- This is intentionally destructive. Do not use this workflow in production.
CREATE OR REPLACE FUNCTION public.admin_delete_room_with_history(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_number TEXT;
  v_deleted_reservations INTEGER := 0;
BEGIN
  SELECT room_number INTO v_room_number
  FROM public.rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF v_room_number IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'room_not_found');
  END IF;

  -- Deleting reservation master rows cascades to reservation_items and
  -- reservation_events. reservation_nights are also deleted through cascades.
  -- Match both the assigned-room relation and the nightly allocation relation.
  DELETE FROM public.reservations r
  WHERE r.id IN (
    SELECT ri.reservation_id
    FROM public.reservation_items ri
    WHERE ri.assigned_room_id = p_room_id
    UNION
    SELECT ri.reservation_id
    FROM public.reservation_nights rn
    JOIN public.reservation_items ri ON ri.id = rn.reservation_item_id
    WHERE rn.room_id = p_room_id
  );
  GET DIAGNOSTICS v_deleted_reservations = ROW_COUNT;

  DELETE FROM public.rooms WHERE id = p_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'room_number', v_room_number,
    'deleted_reservations', v_deleted_reservations
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_room_with_history(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_room_with_history(UUID) TO service_role;
