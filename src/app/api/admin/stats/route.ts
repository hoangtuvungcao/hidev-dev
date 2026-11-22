import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const postCountRows = await query('SELECT status, COUNT(*) AS total FROM posts GROUP BY status');
    const userCountRows = await query('SELECT COUNT(*) AS total FROM users');
    const commentCountRows = await query('SELECT COUNT(*) AS total FROM comments');

    // Document stats
    let docTotal = 0;
    let docPending = 0;
    try {
      const docCountRows = await query('SELECT status, COUNT(*) AS total FROM documents GROUP BY status');
      if (Array.isArray(docCountRows)) {
        for (const row of docCountRows as any[]) {
          docTotal += row.total;
          if (row.status === 'pending') docPending = row.total;
        }
      }
    } catch {
      // documents table may not exist yet
    }

    const stats = {
      approvedPosts: 0,
      pendingPosts: 0,
      rejectedPosts: 0,
      totalUsers: (userCountRows as any)[0]?.total || 0,
      totalComments: (commentCountRows as any)[0]?.total || 0,
      totalDocuments: docTotal,
      pendingDocuments: docPending,
    };

    if (Array.isArray(postCountRows)) {
      for (const row of postCountRows as any[]) {
        if (row.status === 'approved') stats.approvedPosts = row.total;
        if (row.status === 'pending') stats.pendingPosts = row.total;
        if (row.status === 'rejected') stats.rejectedPosts = row.total;
      }
    }

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Admin API stats error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
