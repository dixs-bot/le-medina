-- Jalankan hanya setelah mengganti placeholder berikut dengan EMAIL akun OWNER yang SUDAH ADA.
-- Query ini tidak membuat akun dan tidak mengubah kata sandi.
DO $$
DECLARE
  owner_profile_id UUID;
  owner_email TEXT := lower(trim('GANTI_DENGAN_EMAIL_OWNER@example.com'));
BEGIN
  IF owner_email = 'ganti_dengan_email_owner@example.com' THEN
    RAISE EXCEPTION 'Ganti placeholder email owner terlebih dahulu, lalu jalankan ulang SQL.';
  END IF;

  SELECT p.id
    INTO owner_profile_id
  FROM public.profiles AS p
  WHERE lower(p.email) = owner_email
    AND p.auth_user_id IS NOT NULL
  LIMIT 1;

  IF owner_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profil owner tidak ditemukan. Pastikan email cocok dengan akun Supabase Auth yang sudah ada.';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (owner_profile_id, 'super_admin')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Akun owner % telah diberi role super_admin (atau role itu sudah ada).', owner_email;
END $$;
