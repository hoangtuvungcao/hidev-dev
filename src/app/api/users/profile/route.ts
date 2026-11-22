import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, signToken } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ user: currentUser });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này' }, { status: 401 });
    }

    const { username, email, avatar_url } = await req.json();

    if (!username || !email) {
      return NextResponse.json({ error: 'Tài khoản và Email không được để trống' }, { status: 400 });
    }

    // Check unique username
    const usernameCheck = await query<{ id: number }[]>(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, currentUser.id]
    );
    if (usernameCheck && usernameCheck.length > 0) {
      return NextResponse.json({ error: 'Tên tài khoản này đã được sử dụng' }, { status: 400 });
    }

    // Check unique email
    const emailCheck = await query<{ id: number }[]>(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, currentUser.id]
    );
    if (emailCheck && emailCheck.length > 0) {
      return NextResponse.json({ error: 'Email này đã được sử dụng' }, { status: 400 });
    }

    // Update profile
    await query(
      'UPDATE users SET username = ?, email = ?, avatar_url = ? WHERE id = ?',
      [username, email, avatar_url || null, currentUser.id]
    );

    // Get updated user record to ensure data integrity
    const users = await query<any[]>(
      'SELECT id, username, email, role, avatar_url, session_version FROM users WHERE id = ?',
      [currentUser.id]
    );
    const updatedUser = users[0];

    // Re-sign JWT including session_version
    const token = signToken({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      avatar_url: updatedUser.avatar_url,
      session_version: updatedUser.session_version,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar_url: updatedUser.avatar_url,
      }
    });

    const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-hidev_session' : 'hidev_session';

    // Reset session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
