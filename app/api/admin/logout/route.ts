import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '../../../../lib/auth';
import { writeAdminAudit } from '../../../../lib/adminAudit';

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedAdmin(request);
  if (user) await writeAdminAudit(request, user, 'logout', 'session', user.id, {});
  const response = NextResponse.json({
    success: true,
    message: 'Sesi admin berhasil diakhiri.',
  });

  response.cookies.set({
    name: 'admin_session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}
