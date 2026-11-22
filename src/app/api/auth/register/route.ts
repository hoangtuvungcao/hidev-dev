import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { registerSchema, validateBody } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = await validateBody(registerSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { username, email, password } = validation.data;

    // Check if user/email already exists
    const existing = await query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ error: 'Tên tài khoản hoặc email đã tồn tại' }, { status: 400 });
    }

    // Hash password with bcrypt (salt rounds: 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate random avatar using Dicebear
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

    // Insert user
    await query(
      'INSERT INTO users (username, email, password_hash, role, avatar_url) VALUES (?, ?, ?, ?, ?)',
      [username, email, passwordHash, 'user', avatarUrl]
    );

    return NextResponse.json({ success: true, message: 'Đăng ký tài khoản thành công!' });
  } catch (error: unknown) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra, vui lòng thử lại sau' }, { status: 500 });
  }
}
