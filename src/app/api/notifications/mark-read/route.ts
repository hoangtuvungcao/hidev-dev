import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này' }, { status: 401 });
    }

    const { notificationId } = await req.json();

    if (!notificationId) {
      return NextResponse.json({ error: 'Thiếu ID thông báo' }, { status: 400 });
    }

    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
