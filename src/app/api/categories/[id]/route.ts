import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// PUT - Cập nhật category (chỉ admin)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await req.json();
    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Thiếu tên hoặc slug' }, { status: 400 });
    }

    await query(
      'UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?',
      [name, slug, description || null, id]
    );

    // Invalidate cache để cập nhật header
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

// DELETE - Xóa category (chỉ admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    await query('DELETE FROM categories WHERE id = ?', [id]);

    // Invalidate cache để cập nhật header
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
