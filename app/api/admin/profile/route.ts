import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { writeAdminAudit } from '../../../../lib/adminAudit';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const BUCKET = 'admin-avatars';
const ALLOWED: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 4 * 1024 * 1024;
function databaseUnavailable() {
  return NextResponse.json({ error: 'Profil admin memerlukan SUPABASE_SERVICE_ROLE_KEY dan migrasi nomor 14.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('response' in auth) return auth.response;
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return databaseUnavailable();
  const { data, error } = await supabaseAdmin.from('profiles').select('id,auth_user_id,full_name,email,phone,avatar_url,is_active,created_at').eq('auth_user_id', auth.user.id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Profil admin belum terhubung ke akun Supabase.' }, { status: 404 });
  if (data.is_active === false) return NextResponse.json({ error: 'Akun admin ini sedang dinonaktifkan.' }, { status: 403 });
  return NextResponse.json({ profile: data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('response' in auth) return auth.response;
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return databaseUnavailable();
  try {
    const form = await request.formData();
    const fullName = String(form.get('full_name') || '').trim().slice(0, 120);
    const phone = String(form.get('phone') || '').trim().slice(0, 40);
    const image = form.get('avatar');
    if (fullName.length < 2) return NextResponse.json({ error: 'Nama admin minimal 2 karakter.' }, { status: 400 });
    const { data: current, error: currentError } = await supabaseAdmin.from('profiles').select('id,auth_user_id,full_name,email,phone,avatar_url,is_active').eq('auth_user_id', auth.user.id).maybeSingle();
    if (currentError || !current) return NextResponse.json({ error: 'Profil admin tidak ditemukan.' }, { status: 404 });
    if (current.is_active === false) return NextResponse.json({ error: 'Akun admin ini sedang dinonaktifkan.' }, { status: 403 });

    let avatarUrl = current.avatar_url as string | null;
    if (image && typeof image !== 'string' && typeof image.arrayBuffer === 'function' && image.size > 0) {
      if (image.size > MAX_BYTES) return NextResponse.json({ error: 'Foto maksimal 4 MB.' }, { status: 400 });
      const extension = ALLOWED[image.type];
      if (!extension) return NextResponse.json({ error: 'Foto harus berupa JPG, PNG, atau WebP.' }, { status: 400 });
      const objectPath = `${auth.user.id}/${randomUUID()}.${extension}`;
      const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(objectPath, Buffer.from(await image.arrayBuffer()), { contentType: image.type, cacheControl: '3600', upsert: false });
      if (uploadError) {
        console.error('[admin/profile] avatar upload failed:', uploadError.message || 'unknown');
        return NextResponse.json({ error: 'Foto gagal diunggah. Pastikan migrasi nomor 14 dan bucket admin-avatars sudah diterapkan.' }, { status: 500 });
      }
      avatarUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
    }
    const { data: profile, error: updateError } = await supabaseAdmin.from('profiles').update({ full_name: fullName, phone: phone || null, avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq('auth_user_id', auth.user.id).select('id,auth_user_id,full_name,email,phone,avatar_url,is_active,created_at').single();
    if (updateError || !profile) throw updateError || new Error('Profil gagal diperbarui.');
    await supabaseAdmin.auth.admin.updateUserById(auth.user.id, { user_metadata: { full_name: fullName } });
    await writeAdminAudit(request, auth.user, 'admin_profile_updated', 'profile', profile.id, { changed_fields: ['full_name', ...(phone !== (current.phone || '') ? ['phone'] : []), ...(avatarUrl !== current.avatar_url ? ['avatar_url'] : [])] });
    return NextResponse.json({ success: true, profile }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/profile] update failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Profil admin gagal disimpan.' }, { status: 500 });
  }
}
