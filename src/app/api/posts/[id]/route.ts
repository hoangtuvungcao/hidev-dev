import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { updatePostSchema, validateBody } from '@/lib/validations';

// 1. DELETE - Delete a post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id);
    
    if (isNaN(postId)) {
      return NextResponse.json({ error: 'ID bài đăng không hợp lệ' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này' }, { status: 401 });
    }

    // Check if user is author or admin
    const posts = await query<any[]>('SELECT author_id, slug FROM posts WHERE id = ?', [postId]);
    if (!posts || posts.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy bài đăng' }, { status: 404 });
    }

    const post = posts[0];
    if (post.author_id !== currentUser.id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Bạn không có quyền xóa bài đăng này' }, { status: 403 });
    }

    await query('DELETE FROM posts WHERE id = ?', [postId]);

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/posts');
    if (post.slug) {
      revalidatePath(`/posts/${post.slug}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

// 2. PUT - Update a post
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id);
    
    if (isNaN(postId)) {
      return NextResponse.json({ error: 'ID bài đăng không hợp lệ' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này' }, { status: 401 });
    }

    const body = await req.json();
    const validation = await validateBody(updatePostSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { title, summary, content, link, thumbnail, category_id } = validation.data;

    // Check if user is author or admin
    const posts = await query<any[]>('SELECT author_id, slug FROM posts WHERE id = ?', [postId]);
    if (!posts || posts.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy bài đăng' }, { status: 404 });
    }

    const post = posts[0];
    if (post.author_id !== currentUser.id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa bài đăng này' }, { status: 403 });
    }

    // Auto-generate slug from title
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + postId;

    // If the updater is not an admin, reset the status to pending to require approval again
    const newStatus = currentUser.role === 'admin' ? 'approved' : 'pending';

    await query(
      `UPDATE posts 
       SET title = ?, slug = ?, summary = ?, content = ?, link = ?, thumbnail = ?, category_id = ?, status = ? 
       WHERE id = ?`,
      [title, slug, summary, content, link, thumbnail || null, category_id, newStatus, postId]
    );

    revalidatePath('/');
    if (post.slug) {
      revalidatePath(`/posts/${post.slug}`);
    }
    if (slug !== post.slug) {
      revalidatePath(`/posts/${slug}`);
    }

    return NextResponse.json({ success: true, pending: newStatus === 'pending', slug });
  } catch (error: any) {
    console.error('Update post error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
