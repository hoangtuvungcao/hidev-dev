import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { passwordSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới' }, { status: 400 });
    }

    const validationResult = passwordSchema.safeParse(newPassword);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ error: 'Mật khẩu mới không đủ mạnh: ' + errorMessage }, { status: 400 });
    }

    // Fetch user with password_hash
    const users = await query<any[]>(
      'SELECT password_hash FROM users WHERE id = ?',
      [currentUser.id]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const user = users[0];

    // Verify current password with bcrypt
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác' }, { status: 400 });
    }

    // Hash the new password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password and increment session_version to invalidate other active sessions
    await query(
      'UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?',
      [newPasswordHash, currentUser.id]
    );

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
