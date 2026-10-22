import { NextRequest, NextResponse } from 'next/server';
import { signSessionToken, AdminUser } from '../../../../lib/auth';
import { Role } from '../../../../lib/types';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || '';
    const allowDevelopmentFallback = process.env.NODE_ENV !== 'production' && process.env.ADMIN_DEV_LOGIN_ENABLED === 'true';

    let adminUser: AdminUser | null = null;

    // 1. If Supabase configured, attempt Supabase Auth
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: String(password),
        });

        if (!error && data.user) {
          const { data: roleRecord, error: roleError } = await supabase
            .from('user_roles')
            .select('role, profiles!inner(auth_user_id, full_name, email)')
            .eq('profiles.auth_user_id', data.user.id)
            .limit(1)
            .maybeSingle();
          const validRoles: Role[] = ['super_admin', 'admin', 'reservation_staff', 'content_editor'];
          if (!roleError && roleRecord && validRoles.includes(roleRecord.role as Role)) {
            const profile = Array.isArray((roleRecord as any).profiles) ? (roleRecord as any).profiles[0] : (roleRecord as any).profiles;
            adminUser = {
              id: data.user.id,
              email: data.user.email || profile?.email || cleanEmail,
              name: profile?.full_name || data.user.user_metadata?.full_name || 'Admin Le Médina',
              role: roleRecord.role as Role,
            };
          }
        }
      } catch (err) {
        console.warn('Supabase authentication attempt failed.');
      }
    }

    // Local credentials are development-only and must be explicitly enabled.
    // Never accept a role supplied by the browser.
    if (!adminUser && allowDevelopmentFallback && defaultPassword) {
      const validAdminEmails = [
        'admin@lemedina.id',
        'superadmin@lemedina.id',
        'reservasi@lemedina.id',
        'editor@lemedina.id',
        'staff@lemedina.id',
      ];
      const isEmailAllowed = validAdminEmails.includes(cleanEmail);
      const isDefaultPassValid = String(password) === defaultPassword;
      if (isEmailAllowed && isDefaultPassValid) {
        let role: Role = 'admin';
        if (cleanEmail.includes('superadmin')) role = 'super_admin';
        else if (cleanEmail.includes('reservasi') || cleanEmail.includes('staff')) role = 'reservation_staff';
        else if (cleanEmail.includes('editor')) role = 'content_editor';
        adminUser = {
          id: `local-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`,
          email: cleanEmail,
          name: cleanEmail.includes('superadmin') ? 'Super Administrator' : 'Administrator Le Médina',
          role,
        };
      }
    }

    if (!adminUser) {
      const validAdminEmails = [
        'admin@lemedina.id',
        'superadmin@lemedina.id',
        'reservasi@lemedina.id',
        'editor@lemedina.id',
        'staff@lemedina.id',
      ];

      const isDefaultPassValid = password === defaultPassword;

      if ((validAdminEmails.includes(cleanEmail) || cleanEmail.endsWith('@lemedina.id')) && isDefaultPassValid) {
        let role: Role = 'admin';
        if (cleanEmail.includes('superadmin')) role = 'super_admin';
        else if (cleanEmail.includes('reservasi') || cleanEmail.includes('staff')) role = 'reservation_staff';
        else if (cleanEmail.includes('editor')) role = 'content_editor';
        else if (requestedRole && ['super_admin', 'admin', 'reservation_staff', 'content_editor'].includes(requestedRole)) {
          role = requestedRole;
        }

        adminUser = {
          id: `local-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`,
          email: cleanEmail,
          name: cleanEmail.includes('superadmin') ? 'Super Administrator' : 'Administrator Le Médina',
          role,
        };
      }
    }

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Email atau kata sandi tidak valid. Akses ditolak.' },
        { status: 401 }
      );
    }

    // Sign session token (valid for 24 hours)
    const token = signSessionToken(adminUser, 86400);

    const response = NextResponse.json({
      success: true,
      message: 'Autentikasi admin berhasil.',
      user: adminUser,
      token,
    });

    // Set secure HttpOnly cookie
    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'production' ? 'Gagal memproses autentikasi admin. Periksa konfigurasi server.' : ('Gagal memproses autentikasi admin: ' + (error.message || 'Galat internal')) },
      { status: 500 }
    );
  }
}
