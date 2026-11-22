import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này' }, { status: 401 });
    }

    const notifications = await query(
      `SELECT id, type, title, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id]
    );

    // Format is_read as boolean
    const formatted = Array.isArray(notifications)
      ? notifications.map((n: any) => ({
          ...n,
          is_read: n.is_read === 1 || n.is_read === true || n.is_read === '1',
        }))
      : [];

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
