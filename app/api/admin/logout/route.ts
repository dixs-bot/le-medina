import { NextResponse } from 'next/server';

export async function POST() {
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
