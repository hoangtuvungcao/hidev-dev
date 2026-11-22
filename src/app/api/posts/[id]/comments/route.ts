import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createCommentSchema, updateCommentSchema, deleteCommentSchema, validateBody } from '@/lib/validations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id);

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'ID bài viết không hợp lệ' }, { status: 400 });
    }

    const comments = await query(
      `SELECT c.id, c.content, c.created_at, c.parent_id, c.user_id, u.username, u.avatar_url 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = ? 
       ORDER BY c.created_at ASC`,
      [postId]
    );

    return NextResponse.json(comments);
  } catch (error: any) {
    console.error('Fetch comments error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để viết bình luận' }, { status: 401 });
    }

    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id);

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'ID bài viết không hợp lệ' }, { status: 400 });
    }

    const body = await req.json();
    const validation = await validateBody(createCommentSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { content, parentId } = validation.data;

    // Check if parent comment belongs to the same post
    if (parentId) {
      const parentComments = await query<any[]>('SELECT post_id FROM comments WHERE id = ?', [parentId]);
      if (!parentComments || parentComments.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy bình luận gốc' }, { status: 404 });
      }
      if (parentComments[0].post_id !== postId) {
        return NextResponse.json({ error: 'Bình luận phản hồi không thuộc bài viết này' }, { status: 400 });
      }
    }

    // Insert comment
    const result = await query(
      'INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [postId, user.id, parentId || null, content]
    );

    // Fetch the created comment with user info for optimistic UI update
    const insertId = (result as any).insertId;
    const newComments = await query(
      `SELECT c.id, c.content, c.created_at, c.parent_id, c.user_id, u.username, u.avatar_url 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [insertId]
    );

    const newComment = Array.isArray(newComments) && newComments.length > 0 ? newComments[0] : null;

    // Fetch post author for notification
    const postInfo = await query('SELECT author_id, slug FROM posts WHERE id = ?', [postId]);
    const postAuthor = Array.isArray(postInfo) && postInfo.length > 0 ? postInfo[0] : null;

    // Notify post author if commenter is not the author
    if (newComment && postAuthor && newComment.user_id !== postAuthor.author_id) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES (?, 'comment', ?, ?, ?)`,
        [
          postAuthor.author_id,
          'New comment on your post',
          `${newComment.username} commented on your post`,
          `/posts/${postAuthor.slug}`,
        ]
      );
    }

    // If this is a reply, notify parent comment author
    if (newComment && newComment.parent_id) {
      const parentComment = await query('SELECT user_id FROM comments WHERE id = ?', [newComment.parent_id]);
      const parentAuthor = Array.isArray(parentComment) && parentComment.length > 0 ? parentComment[0] : null;

      if (parentAuthor && parentAuthor.user_id !== newComment.user_id) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES (?, 'reply', ?, ?, ?)`,
          [
            parentAuthor.user_id,
            'New reply to your comment',
            `${newComment.username} replied to your comment`,
            `/posts/${postAuthor.slug}`,
          ]
        );
      }
    }

    if (postAuthor?.slug) {
      revalidatePath(`/posts/${postAuthor.slug}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Đăng bình luận thành công!',
      comment: newComment
    });
  } catch (error: any) {
    console.error('Post comment error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này' }, { status: 401 });
    }

    const body = await req.json();
    const validation = await validateBody(deleteCommentSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { commentId } = validation.data;

    // Fetch comment to check owner/author and get post_id
    const comments = await query('SELECT user_id, post_id FROM comments WHERE id = ?', [commentId]);
    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy bình luận' }, { status: 404 });
    }

    const comment = comments[0];
    if (comment.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Bạn không có quyền xóa bình luận này' }, { status: 403 });
    }

    // Get post slug to revalidate
    const postInfo = await query('SELECT slug FROM posts WHERE id = ?', [comment.post_id]);
    const postSlug = Array.isArray(postInfo) && postInfo.length > 0 ? postInfo[0]?.slug : null;

    await query('DELETE FROM comments WHERE id = ?', [commentId]);

    if (postSlug) {
      revalidatePath(`/posts/${postSlug}`);
    }

    return NextResponse.json({ success: true, message: 'Xóa bình luận thành công!' });
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này' }, { status: 401 });
    }

    const body = await req.json();
    const validation = await validateBody(updateCommentSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { commentId, content } = validation.data;

    // Fetch comment to check owner/author and get post_id
    const comments = await query('SELECT user_id, post_id FROM comments WHERE id = ?', [commentId]);
    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy bình luận' }, { status: 404 });
    }

    const comment = comments[0];
    if (comment.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Bạn không có quyền sửa bình luận này' }, { status: 403 });
    }

    // Get post slug to revalidate
    const postInfo = await query('SELECT slug FROM posts WHERE id = ?', [comment.post_id]);
    const postSlug = Array.isArray(postInfo) && postInfo.length > 0 ? postInfo[0]?.slug : null;

    // Update comment
    await query(
      'UPDATE comments SET content = ? WHERE id = ?',
      [content, commentId]
    );

    if (postSlug) {
      revalidatePath(`/posts/${postSlug}`);
    }

    return NextResponse.json({ success: true, message: 'Sửa bình luận thành công!' });
  } catch (error: any) {
    console.error('Patch comment error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
