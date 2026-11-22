import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// GET - Lấy danh sách categories
export async function GET() {
  try {
    const categories = await query('SELECT id, name, slug, description FROM categories ORDER BY name ASC');
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

// POST - Thêm category mới (chỉ admin)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Thiếu tên hoặc slug' }, { status: 400 });
    }

    await query(
      'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
      [name, slug, description || null]
    );

    // Invalidate cache để cập nhật header
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
