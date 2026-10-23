-- CMS restoran: bersihkan menu demo lama dan siapkan penyimpanan gambar produk.
-- PERHATIAN: menu yang ada di tabel restaurant_menu dihapus sesuai permintaan agar
-- manajemen restoran dapat memasukkan menu asli secara manual setelah migrasi ini.
BEGIN;

DELETE FROM public.restaurant_menu;
UPDATE public.restaurant_categories SET is_active = false;

-- Service-role server route manages menu/categories while public clients remain read-only
-- under the existing RLS policies. Explicit grants are retained for environments where
-- service_role has no table-level grants, without granting public/anon write access.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.restaurant_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.restaurant_menu TO service_role;
GRANT SELECT ON TABLE public.restaurant_categories TO anon, authenticated;
GRANT SELECT ON TABLE public.restaurant_menu TO anon, authenticated;

-- Menu photos are public product assets. Uploads happen only in the authenticated server
-- API using SUPABASE_SERVICE_ROLE_KEY; this does not give browser users upload rights.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'restaurant-menu',
  'restaurant-menu',
  true,
  4194304,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 4194304,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[];

COMMIT;
