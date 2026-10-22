import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Role } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

// In production, ADMIN_SECRET_KEY MUST be set in environment variables
const ADMIN_SECRET =
  process.env.ADMIN_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'le-medina-singkawang-hmac-secret-auth-key-2026';

// Role hierarchy & permission matrices
export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 40,
  admin: 30,
  reservation_staff: 20,
  content_editor: 10,
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: [
    'reservations:read',
    'reservations:write',
    'reservations:delete',
    'content:read',
    'content:write',
    'rates:manage',
    'rooms:manage',
    'settings:manage',
    'users:manage',
  ],
  admin: [
    'reservations:read',
    'reservations:write',
    'content:read',
    'content:write',
    'rates:manage',
    'rooms:manage',
    'settings:manage',
  ],
  reservation_staff: [
    'reservations:read',
    'reservations:write',
    'rooms:read',
    'rates:read',
  ],
  content_editor: [
    'content:read',
    'content:write',
    'rooms:read',
    'rates:read',
    'settings:manage',
  ],
};

export function hasPermission(role: Role, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

// Cryptographic token signing using HMAC-SHA256
export function signSessionToken(user: AdminUser, expiresInSeconds = 86400): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: now,
      exp: now + expiresInSeconds,
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export function verifySessionToken(token: string): AdminUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', ADMIN_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const expectedBuf = Buffer.from(expectedSignature);
    const signatureBuf = Buffer.from(signature);

    if (
      expectedBuf.length !== signatureBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, signatureBuf)
    ) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (data.exp && data.exp < now) {
      return null; // Expired
    }

    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      role: data.role as Role,
    };
  } catch {
    return null;
  }
}

// Extract and verify admin session from Request
export async function getAuthenticatedAdmin(
  request: NextRequest
): Promise<AdminUser | null> {
  // 1. Check Authorization Bearer header
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Check Cookie (admin_session or sb-access-token)
  if (!token) {
    const cookies = request.cookies;
    token = cookies.get('admin_session')?.value || null;
  }

  // 3. Check direct API key header if configured
  const apiKeyHeader = request.headers.get('x-admin-key');
  if (apiKeyHeader && process.env.ADMIN_API_KEY && apiKeyHeader === process.env.ADMIN_API_KEY) {
    return {
      id: 'system-api-key',
      email: 'api@lemedina.id',
      name: 'System Admin API',
      role: 'super_admin',
    };
  }

  if (!token) {
    return null;
  }

  // First try verifying internal signed session token
  const internalUser = verifySessionToken(token);
  if (internalUser) {
    return internalUser;
  }

  // If Supabase is configured, verify token with Supabase Auth
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        // Query user role from public.user_roles joined with profiles
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        const role = (roleData?.role as Role) || 'reservation_staff';

        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff Hotel',
          role,
        };
      }
    } catch {
      // Fallback
    }
  }

  return null;
}

// Route Handler Authorization Guard
export async function requireAdminAuth(
  request: NextRequest,
  allowedRoles?: Role[]
): Promise<{ user: AdminUser } | { response: NextResponse }> {
  const user = await getAuthenticatedAdmin(request);

  if (!user) {
    return {
      response: NextResponse.json(
        {
          error: 'Autentikasi admin diperlukan. Sesi Anda tidak valid atau telah kedaluwarsa.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed =
      user.role === 'super_admin' || allowedRoles.includes(user.role);

    if (!isAllowed) {
      return {
        response: NextResponse.json(
          {
            error: `Akses ditolak. Peran '${user.role}' tidak memiliki izin untuk tindakan ini.`,
            code: 'FORBIDDEN',
            requiredRoles: allowedRoles,
          },
          { status: 403 }
        ),
      };
    }
  }

  return { user };
}
