import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { loginSchema, validateBody } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = await validateBody(loginSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { username, password } = validation.data;

    // Fetch user from DB
    const users = await query(
      'SELECT id, username, email, password_hash, role, avatar_url, session_version FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    let user = null;
    if (Array.isArray(users) && users.length > 0) {
      user = users[0];
    }

    // Dummy hash to prevent timing attacks / user enumeration via bcrypt execution time
    const dummyHash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7GP93BI5995JKTMJS.eC3pq';
    const passwordMatch = await bcrypt.compare(
      password,
      user ? user.password_hash : dummyHash
    );

    if (!user || !passwordMatch) {
      return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không chính xác' }, { status: 401 });
    }

    // Sign JWT
    const token = signToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      session_version: user.session_version,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
      }
    });

    const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-hidev_session' : 'hidev_session';

    // Set cookie with improved security
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: (process.env.NODE_ENV as string) === 'production',
      sameSite: (process.env.NODE_ENV as string) === 'production' ? 'strict' : 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra, vui lòng thử lại sau' }, { status: 500 });
  }
}
