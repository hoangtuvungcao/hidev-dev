import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getDocumentsFeed } from '@/lib/documents';
import { updateDocumentStatusSchema, validateBody } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { DocumentRecord } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const statusFilter = sp.get('status') || undefined;
    const search = sp.get('search') || undefined;
    const page = Math.max(1, parseInt(sp.get('page') || '1') || 1);
    const limit = Math.max(1, parseInt(sp.get('limit') || '50') || 50);

    // For admin, fetch all statuses if no filter
    const result = await getDocumentsFeed({
      status: statusFilter || undefined,
      search,
      page,
      limit,
    });

    // If no status filter, fetch ALL documents including pending
    if (!statusFilter) {
      const allDocs = await query<DocumentRecord[]>(
        `SELECT d.*, u.username, u.avatar_url AS author_avatar
         FROM documents d JOIN users u ON d.author_id = u.id
         ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
        [limit, (page - 1) * limit]
      );
      const countResult = await query<{ total: number }[]>('SELECT COUNT(*) AS total FROM documents');
      return NextResponse.json({ documents: allDocs, total: countResult[0]?.total || 0 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Admin documents API error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await req.json();
    const validation = await validateBody(updateDocumentStatusSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { id, status } = validation.data;

    await query('UPDATE documents SET status = ? WHERE id = ?', [status, id]);

    revalidatePath('/documents');
    revalidatePath('/admin');
    revalidatePath('/admin/documents');

    return NextResponse.json({ success: true, message: `Đã cập nhật trạng thái tài liệu!` });
  } catch (error: unknown) {
    console.error('Admin document status update error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
