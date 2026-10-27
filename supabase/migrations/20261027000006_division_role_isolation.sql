-- Division-specific roles for Hotel Le Medina admin panel.
-- Apply after existing admin/profile migrations.
BEGIN;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN (
  'super_admin', 'admin', 'reservation_staff', 'content_editor',
  'receptionist_staff', 'restaurant_cashier', 'waterpark_cashier'
));

-- Keep legacy RLS helpers compatible with the new divisions.
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
        OR (required_role = 'reservation_staff' AND ur.role IN ('admin', 'receptionist_staff'))
        OR (required_role = 'content_editor' AND ur.role IN ('admin', 'restaurant_cashier'))
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
COMMIT;
