-- Super Admin-managed hotel gallery. Uses the existing public.gallery_images table.
-- Images are public because they are intended for the customer-facing website.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hotel-gallery', 'hotel-gallery', true, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public customers can view image files. Mutations are performed only by the
-- server API using SUPABASE_SERVICE_ROLE_KEY after checking the Super Admin role.
DROP POLICY IF EXISTS "Public can view hotel gallery files" ON storage.objects;
CREATE POLICY "Public can view hotel gallery files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'hotel-gallery');

-- The gallery_images table and public SELECT policy are created in the initial
-- schema migrations. This index helps stable ordering in both admin and public UI.
CREATE INDEX IF NOT EXISTS idx_gallery_images_sort_order_created_at
ON public.gallery_images (sort_order ASC, created_at DESC);
