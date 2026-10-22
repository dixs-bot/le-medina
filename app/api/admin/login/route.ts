import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import {
  signSessionToken,
  AdminUser,
} from '../../../../lib/auth';

import { Role } from '../../../../lib/types';

import {
  supabaseAdmin,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
} from '../../../../lib/supabaseClient';

/**
 * Role yang diperbolehkan untuk mengakses admin panel.
 * Role ditentukan dari database, bukan dari browser.
 */
const VALID_ROLES: Role[] = [
  'super_admin',
  'admin',
  'reservation_staff',
  'content_editor',
];

/**
 * Urutan prioritas jika seorang pengguna mempunyai
 * lebih dari satu role yang valid.
 */
const ROLE_PRIORITY: Role[] = [
  'super_admin',
  'admin',
  'reservation_staff',
  'content_editor',
];

/**
 * Akun fallback khusus development.
 *
 * Fallback tidak akan aktif di production,
 * sekalipun ADMIN_DEFAULT_PASSWORD terisi.
 */
const DEVELOPMENT_ADMIN_EMAILS = [
  'admin@lemedina.id',
  'superadmin@lemedina.id',
  'reservasi@lemedina.id',
  'editor@lemedina.id',
  'staff@lemedina.id',
];

/**
 * POST /api/admin/login
 *
 * Alur:
 * 1. Validasi input.
 * 2. Autentikasi melalui Supabase Auth.
 * 3. Baca profil dan role melalui client server.
 * 4. Buat token sesi dan cookie HttpOnly.
 */
export async function POST(request: NextRequest) {
  try {
    // --------------------------------------------------
    // 1. Validasi input
    // --------------------------------------------------

    let parsedBody: unknown;

    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Format permintaan tidak valid.',
        },
        { status: 400 }
      );
    }

    const body =
      typeof parsedBody === 'object' &&
      parsedBody !== null
        ? (parsedBody as Record<string, unknown>)
        : {};

    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    const password =
      typeof body.password === 'string'
        ? body.password
        : '';

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email dan kata sandi wajib diisi.',
        },
        { status: 400 }
      );
    }

    // Jangan membaca atau mempercayai requestedRole
    // dari body request.
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const defaultPassword =
      process.env.ADMIN_DEFAULT_PASSWORD || '';

    const allowDevelopmentFallback =
      process.env.NODE_ENV !== 'production' &&
      process.env.ADMIN_DEV_LOGIN_ENABLED === 'true';

    let adminUser: AdminUser | null = null;

    let authenticatedBySupabase = false;

    let accountMissingRole = false;

    let adminLookupUnavailable = false;

    // --------------------------------------------------
    // 2. Autentikasi utama melalui Supabase Auth
    // --------------------------------------------------

    if (
      isSupabaseConfigured &&
      supabaseUrl &&
      supabaseAnonKey
    ) {
      /*
       * Buat client Auth khusus untuk request ini.
       * Sesi login tidak disimpan di singleton server,
       * sehingga autentikasi satu request tidak
       * mencemari request pengguna lain.
       */
      const authClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }
      );

      const {
        data: authData,
        error: authError,
      } = await authClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Jangan mencatat password atau token ke log.
        console.warn(
          '[admin/login] Supabase Auth rejected the credentials.',
          authError.code || 'unknown'
        );
      } else if (authData.user) {
        authenticatedBySupabase = true;

        // ------------------------------------------------
        // 3. Pastikan service-role client tersedia
        // ------------------------------------------------

        if (
          !isSupabaseAdminConfigured ||
          !supabaseAdmin
        ) {
          adminLookupUnavailable = true;

          console.error(
            '[admin/login] Server-side Supabase admin client is not configured.'
          );
        } else {
          // ----------------------------------------------
          // 4. Cari profil dengan ID Auth yang benar
          // ----------------------------------------------

          const {
            data: profile,
            error: profileError,
          } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email')
            .eq('auth_user_id', authData.user.id)
            .maybeSingle();

          if (profileError) {
            adminLookupUnavailable = true;

            console.error(
              '[admin/login] Profile lookup failed:',
              profileError.code || 'unknown'
            );
          } else if (!profile) {
            accountMissingRole = true;

            console.warn(
              '[admin/login] Authenticated user has no linked profile.'
            );
          } else {
            // --------------------------------------------
            // 5. Cari seluruh role dari profil tersebut
            // --------------------------------------------

            const {
              data: roleRecords,
              error: roleError,
            } = await supabaseAdmin
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.id)
              .in('role', VALID_ROLES);

            if (roleError) {
              adminLookupUnavailable = true;

              console.error(
                '[admin/login] Role lookup failed:',
                roleError.code || 'unknown'
              );
            } else {
              const assignedRoles: Role[] = (
                roleRecords || []
              )
                .map((record) => record.role)
                .filter(
                  (role): role is Role =>
                    VALID_ROLES.includes(role as Role)
                );

              // Pilih role berdasarkan prioritas server,
              // bukan pilihan role dari browser.
              const selectedRole =
                ROLE_PRIORITY.find((role) =>
                  assignedRoles.includes(role)
                );

              if (selectedRole) {
                adminUser = {
                  id: authData.user.id,

                  email:
                    authData.user.email ||
                    profile.email ||
                    email,

                  name:
                    profile.full_name ||
                    authData.user.user_metadata
                      ?.full_name ||
                    'Admin Le Médina',

                  role: selectedRole,
                };
              } else {
                accountMissingRole = true;

                console.warn(
                  '[admin/login] Authenticated user has no valid admin role.'
                );
              }
            }
          }
        }
      }
    } else {
      console.error(
        '[admin/login] Supabase public configuration is missing or invalid.'
      );

      adminLookupUnavailable = true;
    }

    // --------------------------------------------------
    // 6. Fallback lokal khusus development
    // --------------------------------------------------

    /*
     * Fallback ini hanya aktif ketika:
     * - NODE_ENV bukan production;
     * - ADMIN_DEV_LOGIN_ENABLED bernilai true;
     * - ADMIN_DEFAULT_PASSWORD diisi secara eksplisit;
     * - email berada dalam daftar yang diizinkan.
     *
     * Fallback ini tidak dapat digunakan di production.
     */

    if (
      !adminUser &&
      !authenticatedBySupabase &&
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

    // --------------------------------------------------
    // 7. Tangani login yang gagal
    // --------------------------------------------------

    if (!adminUser) {
      if (adminLookupUnavailable) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Layanan autentikasi admin belum dapat diakses. Periksa konfigurasi server.',
          },
          { status: 503 }
        );
      }

      if (authenticatedBySupabase || accountMissingRole) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Akun berhasil diautentikasi, tetapi profil atau role admin belum lengkap.',
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            'Email atau kata sandi tidak valid. Akses ditolak.',
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // 8. Buat token sesi admin
    // --------------------------------------------------

    /*
     * signSessionToken menggunakan ADMIN_SECRET_KEY.
     * Jika secret tidak dikonfigurasi dengan benar,
     * proses diteruskan ke error handler di bawah.
     */
    const token = signSessionToken(adminUser, 86400);

    // Token hanya ditempatkan di cookie HttpOnly.
    // Jangan kirim token sesi di response JSON.
    const response = NextResponse.json(
      {
        success: true,
        message: 'Autentikasi admin berhasil.',
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
        },
      },
      { status: 200 }
    );

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
    // Detail internal hanya dicatat di server.
    console.error(
      '[admin/login] Unexpected authentication error:',
      error instanceof Error
        ? error.message
        : 'Unknown server error'
    );

    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'Gagal memproses autentikasi admin. Periksa log server.'
            : error instanceof Error
              ? `Gagal memproses autentikasi admin: ${error.message}`
              : 'Gagal memproses autentikasi admin.',
      },
      { status: 500 }
    );
  }
}