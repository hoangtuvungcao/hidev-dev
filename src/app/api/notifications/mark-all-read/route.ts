import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này' }, { status: 401 });
    }

    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
