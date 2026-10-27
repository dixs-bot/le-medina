-- Fix server-side Super Admin gallery CMS permissions.
-- Safe to re-run. Does not delete or modify existing gallery records.
-- The API must use SUPABASE_SERVICE_ROLE_KEY on the server; never expose it to the browser.

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gallery_images TO service_role;

-- Ensure the storage bucket exists with the constraints expected by the API.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hotel-gallery',
  'hotel-gallery',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read only; server mutations use the service role after Super Admin auth.
DROP POLICY IF EXISTS "Public can view hotel gallery files" ON storage.objects;
CREATE POLICY "Public can view hotel gallery files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'hotel-gallery');

CREATE INDEX IF NOT EXISTS idx_gallery_images_sort_order_created_at
ON public.gallery_images (sort_order ASC, created_at DESC);
