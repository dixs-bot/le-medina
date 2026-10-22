import { NextRequest, NextResponse } from 'next/server';
import { signSessionToken, AdminUser } from '../../../../lib/auth';
import { Role } from '../../../../lib/types';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, requestedRole } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'MedinaAdmin2026!';

    let adminUser: AdminUser | null = null;

    // 1. If Supabase configured, attempt Supabase Auth
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: String(password),
        });

        if (!error && data.user) {
          const { data: roleRecord } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .maybeSingle();

          adminUser = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            name: data.user.user_metadata?.full_name || 'Admin Le Médina',
            role: (roleRecord?.role as Role) || 'reservation_staff',
          };
        }
      } catch (err) {
        console.warn('Supabase auth attempt failed, evaluating local credentials fallback', err);
      }
    }

    // 2. Local fallback credentials check
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
      { error: 'Gagal memproses autentikasi admin: ' + (error.message || 'Galat internal') },
      { status: 500 }
    );
  }
}
