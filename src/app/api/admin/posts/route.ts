import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { updatePostStatusSchema, validateBody } from '@/lib/validations';

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const posts = await query(`
      SELECT p.id, p.title, p.slug, p.summary, p.status, p.created_at, u.username, c.name AS category_name
      FROM posts p
      JOIN users u ON p.author_id = u.id
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json(posts);
  } catch (error: any) {
    console.error('Admin fetch posts error:', error);
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
    const validation = await validateBody(updatePostStatusSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { id, status } = validation.data;

    // Fetch post author and slug for notification
    const postInfo = await query('SELECT author_id, slug FROM posts WHERE id = ?', [id]);
    const postAuthor = Array.isArray(postInfo) && postInfo.length > 0 ? postInfo[0] : null;

    await query(
      'UPDATE posts SET status = ? WHERE id = ?',
      [status, id]
    );

    // Notify post author about status change
    if (postAuthor && (status === 'approved' || status === 'rejected')) {
      const notificationType = status === 'approved' ? 'post_approved' : 'post_rejected';
      const title = status === 'approved' ? 'Your post has been approved' : 'Your post has been rejected';
      await query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES (?, ?, ?, ?, ?)`,
        [
          postAuthor.author_id,
          notificationType,
          title,
          `Your post has been ${status}`,
          `/posts/${postAuthor.slug}`,
        ]
      );
    }

    // Revalidate pages so they show fresh data
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/posts');
    if (postAuthor?.slug) {
      revalidatePath(`/posts/${postAuthor.slug}`);
    }

    return NextResponse.json({ success: true, message: 'Đã cập nhật trạng thái bài viết thành công!' });
  } catch (error: any) {
    console.error('Admin update post error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
