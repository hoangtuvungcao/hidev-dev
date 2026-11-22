import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Đăng xuất thành công' });
  
  const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-hidev_session' : 'hidev_session';

  // Clear session cookie with full security flags
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: (process.env.NODE_ENV as string) === 'production',
    sameSite: 'lax',
  });

  // Also clear OAuth state cookie if present
  response.cookies.set({
    name: 'oauth_state',
    value: '',
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: (process.env.NODE_ENV as string) === 'production',
    sameSite: 'lax',
  });

  return response;
}
