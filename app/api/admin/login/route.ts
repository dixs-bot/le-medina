import { NextRequest, NextResponse } from 'next/server';
import { signSessionToken, AdminUser } from '../../../../lib/auth';
import { Role } from '../../../../lib/types';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabaseClient';

const VALID_ROLES: Role[] = [
  'super_admin',
  'admin',
  'reservation_staff',
  'content_editor',
];

const DEVELOPMENT_ADMIN_EMAILS = [
  'admin@lemedina.id',
  'superadmin@lemedina.id',
  'reservasi@lemedina.id',
  'editor@lemedina.id',
  'staff@lemedina.id',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body?.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    const password =
      typeof body?.password === 'string'
        ? body.password
        : '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const defaultPassword =
      process.env.ADMIN_DEFAULT_PASSWORD || '';

    const allowDevelopmentFallback =
      process.env.NODE_ENV !== 'production' &&
      process.env.ADMIN_DEV_LOGIN_ENABLED === 'true';

    let adminUser: AdminUser | null = null;

    // 1. Autentikasi utama melalui Supabase Auth.
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (!error && data.user) {
          const { data: roleRecord, error: roleError } =
            await supabase
              .from('user_roles')
              .select(
                'role, profiles!inner(auth_user_id, full_name, email)'
              )
              .eq('profiles.auth_user_id', data.user.id)
              .limit(1)
              .maybeSingle();

          if (
            !roleError &&
            roleRecord &&
            VALID_ROLES.includes(roleRecord.role as Role)
          ) {
            const profile = Array.isArray(
              (roleRecord as any).profiles
            )
              ? (roleRecord as any).profiles[0]
              : (roleRecord as any).profiles;

            adminUser = {
              id: data.user.id,
              email:
                data.user.email ||
                profile?.email ||
                email,
              name:
                profile?.full_name ||
                data.user.user_metadata?.full_name ||
                'Admin Le Médina',
              role: roleRecord.role as Role,
            };
          }
        }
      } catch {
        // Jangan membocorkan detail autentikasi ke pengunjung.
        console.warn(
          'Supabase authentication attempt failed.'
        );
      }
    }

    // 2. Fallback lokal hanya untuk development.
    // Role ditentukan server berdasarkan email yang diizinkan.
    // Role dari browser tidak pernah dipercaya.
    if (
      !adminUser &&
      allowDevelopmentFallback &&
      defaultPassword &&
      DEVELOPMENT_ADMIN_EMAILS.includes(email) &&
      password === defaultPassword
    ) {
      let role: Role = 'admin';

      if (email === 'superadmin@lemedina.id') {
        role = 'super_admin';
      } else if (
        email === 'reservasi@lemedina.id' ||
        email === 'staff@lemedina.id'
      ) {
        role = 'reservation_staff';
      } else if (email === 'editor@lemedina.id') {
        role = 'content_editor';
      }

      adminUser = {
        id: `local-${email.replace(/[^a-z0-9]/g, '-')}`,
        email,
        name:
          role === 'super_admin'
            ? 'Super Administrator'
            : 'Administrator Le Médina',
        role,
      };
    }

    // 3. Gagal tertutup jika kredensial atau role tidak valid.
    // Tidak ada fallback kata sandi lokal di production.
    if (!adminUser) {
      return NextResponse.json(
        {
          error:
            'Email atau kata sandi tidak valid. Akses ditolak.',
        },
        { status: 401 }
      );
    }

    // 4. Buat sesi admin selama 24 jam.
    const token = signSessionToken(adminUser, 86400);

    // Token disimpan dalam cookie HttpOnly, bukan dikirim
    // kembali dalam body JSON.
    const response = NextResponse.json({
      success: true,
      message: 'Autentikasi admin berhasil.',
      user: adminUser,
    });

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
  } catch (error: unknown) {
    const detail =
      error instanceof Error
        ? error.message
        : 'Galat internal';

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? 'Gagal memproses autentikasi admin. Periksa konfigurasi server.'
            : `Gagal memproses autentikasi admin: ${detail}`,
      },
      { status: 500 }
    );
  }
}