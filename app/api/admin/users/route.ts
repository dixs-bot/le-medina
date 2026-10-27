import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { writeAdminAudit } from '../../../../lib/adminAudit';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../../../lib/supabaseClient';
import type { Role } from '../../../../lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const CREATABLE_ROLES: Role[] = ['receptionist_staff', 'restaurant_cashier', 'waterpark_cashier'];
const ROLE_PRIORITY: Role[] = ['super_admin', 'receptionist_staff', 'restaurant_cashier', 'waterpark_cashier', 'admin', 'reservation_staff', 'content_editor'];
function dbUnavailable() {
  return NextResponse.json({ error: 'Manajemen akun admin memerlukan SUPABASE_SERVICE_ROLE_KEY dan migrasi nomor 14.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, ['super_admin']);
  if ('response' in auth) return auth.response;
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return dbUnavailable();
  const [profilesResult, auditResult] = await Promise.all([
    supabaseAdmin.from('profiles').select('id,auth_user_id,full_name,email,phone,avatar_url,is_active,created_at').not('auth_user_id', 'is', null).order('created_at', { ascending: true }),
    supabaseAdmin.from('admin_audit_logs').select('id,actor_user_id,actor_name,actor_email,actor_role,action,target_type,target_id,details,ip_address,user_agent,created_at').order('created_at', { ascending: false }).limit(150),
  ]);
  if (profilesResult.error || auditResult.error) {
    console.error('[admin/users] read failed:', profilesResult.error?.code || auditResult.error?.code || 'unknown');
    return NextResponse.json({ error: 'Gagal membaca daftar admin dan log aktivitas. Pastikan migrasi nomor 14 sudah dijalankan.' }, { status: 500 });
  }
  const profiles = profilesResult.data || [];
  const profileIds = profiles.map((profile) => profile.id);
  const rolesResult = profileIds.length ? await supabaseAdmin.from('user_roles').select('user_id,role').in('user_id', profileIds) : { data: [], error: null };
  if (rolesResult.error) return NextResponse.json({ error: 'Gagal membaca role akun admin.' }, { status: 500 });
  const roleMap = new Map<string, Role[]>();
  for (const item of rolesResult.data || []) {
    const assigned = roleMap.get(item.user_id) || [];
    if (['super_admin', 'admin', 'reservation_staff', 'content_editor', 'receptionist_staff', 'restaurant_cashier', 'waterpark_cashier'].includes(item.role)) assigned.push(item.role as Role);
    roleMap.set(item.user_id, assigned);
  }
  const audit = auditResult.data || [];
  const adminProfiles = profiles.filter((profile) => (roleMap.get(profile.id) || []).length > 0);
  const accounts = adminProfiles.map((profile) => {
    const roleList = roleMap.get(profile.id) || [];
    const sessionEvents = audit.filter((event) => event.actor_user_id === profile.auth_user_id && ['login', 'logout'].includes(event.action));
    const lastLogin = sessionEvents.find((event) => event.action === 'login');
    const latestSessionEvent = sessionEvents[0];
    const lastActivity = audit.find((event) => event.actor_user_id === profile.auth_user_id);
    return {
      ...profile,
      roles: roleList,
      primary_role: ROLE_PRIORITY.find((role) => roleList.includes(role)) || null,
      last_login_at: lastLogin?.created_at || null,
      last_activity_at: lastActivity?.created_at || null,
      current_shift: latestSessionEvent?.action === 'login' ? (lastLogin?.details as Record<string, unknown> | null)?.shift_name || null : null,
      session_state: latestSessionEvent?.action === 'login' ? 'Sesi belum tercatat keluar' : latestSessionEvent?.action === 'logout' ? 'Sudah keluar' : 'Belum ada log sesi',
    };
  });
  return NextResponse.json({ accounts, audit }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, ['super_admin']);
  if ('response' in auth) return auth.response;
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return dbUnavailable();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
  const fullName = String(body.full_name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
  const password = typeof body.password === 'string' ? body.password : '';
  const role = String(body.role || 'admin') as Role;
  if (fullName.length < 2) return NextResponse.json({ error: 'Nama staf minimal 2 karakter.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Alamat email tidak valid.' }, { status: 400 });
  if (password.length < 10 || password.length > 128) return NextResponse.json({ error: 'Kata sandi awal minimal 10 karakter.' }, { status: 400 });
  if (!CREATABLE_ROLES.includes(role)) return NextResponse.json({ error: 'Pilih salah satu divisi: Staf Resepsionis, Kasir Restoran, atau Kasir Waterpark. Super Admin tidak dibuat dari formulir ini.' }, { status: 400 });

  let authUserId: string | null = null;
  let profileId: string | null = null;
  try {
    const { data: authResult, error: authError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (authError || !authResult.user) throw authError || new Error('Akun Auth tidak berhasil dibuat.');
    authUserId = authResult.user.id;
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').insert({ auth_user_id: authUserId, full_name: fullName, email, country: 'Indonesia', is_active: true }).select('id,auth_user_id,full_name,email,phone,avatar_url,is_active,created_at').single();
    if (profileError || !profile) throw profileError || new Error('Profil admin gagal dibuat.');
    profileId = profile.id;
    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({ user_id: profile.id, role });
    if (roleError) throw roleError;
    await writeAdminAudit(request, auth.user, 'admin_account_created', 'profile', profile.id, { new_admin_email: email, new_admin_name: fullName, role });
    return NextResponse.json({ success: true, account: { ...profile, roles: [role], primary_role: role } }, { status: 201 });
  } catch (error) {
    console.error('[admin/users] create failed:', error instanceof Error ? error.message : 'unknown');
    if (profileId) await supabaseAdmin.from('profiles').delete().eq('id', profileId);
    if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return NextResponse.json({ error: 'Akun gagal dibuat. Pastikan email belum digunakan dan migrasi database sudah diterapkan.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminAuth(request, ['super_admin']);
  if ('response' in auth) return auth.response;
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return dbUnavailable();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const authUserId = String(body?.auth_user_id || '').trim();
  const isActive = body?.is_active;
  if (!authUserId || typeof isActive !== 'boolean') return NextResponse.json({ error: 'Target akun dan status aktif wajib ditentukan.' }, { status: 400 });
  if (authUserId === auth.user.id) return NextResponse.json({ error: 'Owner tidak dapat menonaktifkan akun yang sedang digunakan.' }, { status: 400 });
  const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id,auth_user_id,full_name,email,is_active').eq('auth_user_id', authUserId).maybeSingle();
  if (profileError || !profile) return NextResponse.json({ error: 'Akun target tidak ditemukan.' }, { status: 404 });
  const { data: roles, error: rolesError } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', profile.id);
  if (rolesError) return NextResponse.json({ error: 'Role akun tidak dapat diperiksa.' }, { status: 500 });
  if ((roles || []).some((item) => item.role === 'super_admin')) return NextResponse.json({ error: 'Akun Super Admin tidak dapat dinonaktifkan dari menu ini.' }, { status: 403 });
  const { error: updateError } = await supabaseAdmin.from('profiles').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', profile.id);
  if (updateError) return NextResponse.json({ error: 'Status akun gagal diperbarui.' }, { status: 500 });
  await writeAdminAudit(request, auth.user, isActive ? 'admin_account_activated' : 'admin_account_deactivated', 'profile', profile.id, { target_email: profile.email, target_name: profile.full_name });
  return NextResponse.json({ success: true, is_active: isActive });
}
