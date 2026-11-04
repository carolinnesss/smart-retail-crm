import { NextResponse } from 'next/server';
import { CUSTOMER_SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logout pelanggan berhasil.',
  });

  response.cookies.set({
    name: CUSTOMER_SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
