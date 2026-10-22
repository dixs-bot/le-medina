-- ============================================================================
-- HOTEL LE MEDINA & RESTO - SUPABASE SCHEMA MIGRATION 02: RLS POLICIES
-- Granular security with RBAC (super_admin, admin, reservation_staff, content_editor)
-- ============================================================================

-- Helper function: Check if current auth user has a specific role
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- If service role or direct postgres user, bypass
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all 18 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_nights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_reviews ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
CREATE POLICY "Public profiles can read own profile" ON public.profiles
    FOR SELECT USING (auth_user_id = auth.uid() OR public.current_user_has_role('admin'));
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth_user_id = auth.uid() OR public.current_user_has_role('admin'));
CREATE POLICY "Public insert for profile registration" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- 2. User Roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (public.current_user_has_role('admin'));
CREATE POLICY "Super admins can manage roles" ON public.user_roles
    FOR ALL USING (public.current_user_has_role('super_admin'));

-- 3. Site Pengaturan (Public read, admin write)
CREATE POLICY "Public can view site settings" ON public.site_settings
    FOR SELECT USING (true);
CREATE POLICY "Admins can update site settings" ON public.site_settings
    FOR ALL USING (public.current_user_has_role('content_editor'));

-- 4. Pages (Public read published, editor write)
CREATE POLICY "Public can view published pages" ON public.pages
    FOR SELECT USING (is_published = true OR public.current_user_has_role('content_editor'));
CREATE POLICY "Editors can manage pages" ON public.pages
    FOR ALL USING (public.current_user_has_role('content_editor'));

-- 5. Tipe Kamars & Images (Public read active, editor write)
CREATE POLICY "Public can view active room types" ON public.room_types
    FOR SELECT USING (is_active = true OR public.current_user_has_role('content_editor'));
CREATE POLICY "Editors can manage room types" ON public.room_types
    FOR ALL USING (public.current_user_has_role('content_editor'));

CREATE POLICY "Public can view room images" ON public.room_images
    FOR SELECT USING (true);
CREATE POLICY "Editors can manage room images" ON public.room_images
    FOR ALL USING (public.current_user_has_role('content_editor'));

-- 6. Kamar (Staff read, admin manage)
CREATE POLICY "Staff can view rooms inventory" ON public.rooms
    FOR SELECT USING (public.current_user_has_role('reservation_staff'));
CREATE POLICY "Admins can manage rooms inventory" ON public.rooms
    FOR ALL USING (public.current_user_has_role('admin'));

-- 7. Room Tarif (Public read active rates, staff manage)
CREATE POLICY "Public can view active room rates" ON public.room_rates
    FOR SELECT USING (is_active = true OR public.current_user_has_role('reservation_staff'));
CREATE POLICY "Staff can manage room rates" ON public.room_rates
    FOR ALL USING (public.current_user_has_role('reservation_staff'));

-- 8. Reservasi & Items (Public can insert their booking, staff can view and manage)
CREATE POLICY "Tamus can create reservations" ON public.reservations
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Tamus can view own reservation by code" ON public.reservations
    FOR SELECT USING (true);
CREATE POLICY "Staff can update reservations" ON public.reservations
    FOR ALL USING (public.current_user_has_role('reservation_staff'));

CREATE POLICY "Allow public insert reservation items" ON public.reservation_items
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can manage reservation items" ON public.reservation_items
    FOR ALL USING (public.current_user_has_role('reservation_staff'));

CREATE POLICY "Allow system insert reservation nights" ON public.reservation_nights
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can view and manage reservation nights" ON public.reservation_nights
    FOR ALL USING (public.current_user_has_role('reservation_staff'));

CREATE POLICY "Allow system insert reservation events" ON public.reservation_events
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can view reservation audit events" ON public.reservation_events
    FOR SELECT USING (public.current_user_has_role('reservation_staff'));

-- 9. Restaurant Categories & Menu (Public read, editor manage)
CREATE POLICY "Public can view restaurant categories" ON public.restaurant_categories
    FOR SELECT USING (is_active = true OR public.current_user_has_role('content_editor'));
CREATE POLICY "Editors can manage restaurant categories" ON public.restaurant_categories
    FOR ALL USING (public.current_user_has_role('content_editor'));

CREATE POLICY "Public can view restaurant menu" ON public.restaurant_menu
    FOR SELECT USING (is_available = true OR public.current_user_has_role('content_editor'));
CREATE POLICY "Editors can manage restaurant menu" ON public.restaurant_menu
    FOR ALL USING (public.current_user_has_role('content_editor'));

-- 10. Facilities, Offers, Galeri, Reviews (Public read, editor manage)
CREATE POLICY "Public can view facilities" ON public.facilities
    FOR SELECT USING (is_active = true OR public.current_user_has_role('content_editor'));
CREATE POLICY "Editors can manage facilities" ON public.facilities
    FOR ALL USING (public.current_user_has_role('content_editor'));

CREATE POLICY "Public can view offers" ON public.offers
    FOR SELECT USING (is_active = true OR public.current_user_has_role('content_editor'));
CREATE POLICY "Editors can manage offers" ON public.offers
    FOR ALL USING (public.current_user_has_role('content_editor'));

CREATE POLICY "Public can view gallery" ON public.gallery_images
    FOR SELECT USING (true);
CREATE POLICY "Editors can manage gallery" ON public.gallery_images
    FOR ALL USING (public.current_user_has_role('content_editor'));

CREATE POLICY "Public can view reviews" ON public.guest_reviews
    FOR SELECT USING (is_featured = true OR public.current_user_has_role('content_editor'));
CREATE POLICY "Tamus can submit reviews" ON public.guest_reviews
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Editors can manage reviews" ON public.guest_reviews
    FOR ALL USING (public.current_user_has_role('content_editor'));
