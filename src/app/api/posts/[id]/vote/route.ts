import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: any) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện bình chọn' }, { status: 401 });
    }

    // Handle dynamic params which can be a Promise or direct object
    const resolvedParams = typeof params.then === 'function' ? await params : params;
    const postId = parseInt(resolvedParams.id);

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'ID bài viết không hợp lệ' }, { status: 400 });
    }

    // Check if upvote already exists
    const votes = await query(
      'SELECT 1 FROM upvotes WHERE user_id = ? AND post_id = ?',
      [user.id, postId]
    );

    let hasUpvoted = false;

    if (Array.isArray(votes) && votes.length > 0) {
      // Vote exists, so remove it (unvote)
      await query(
        'DELETE FROM upvotes WHERE user_id = ? AND post_id = ?',
        [user.id, postId]
      );
      hasUpvoted = false;
    } else {
      // Check if post exists
      const postCheck = await query('SELECT id FROM posts WHERE id = ?', [postId]);
      if (!postCheck || !Array.isArray(postCheck) || postCheck.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy bài đăng' }, { status: 404 });
      }

      // Vote doesn't exist, add it (upvote)
      try {
        await query(
          'INSERT INTO upvotes (user_id, post_id) VALUES (?, ?)',
          [user.id, postId]
        );
        hasUpvoted = true;
      } catch (err: any) {
        if (err.code === 'ER_DUP_ENTRY') {
          hasUpvoted = true;
        } else {
          throw err;
        }
      }

      // Notify post author about the new vote
      const postInfo = await query('SELECT author_id, slug FROM posts WHERE id = ?', [postId]);
      const postAuthor = Array.isArray(postInfo) && postInfo.length > 0 ? postInfo[0] : null;

      if (postAuthor && postAuthor.author_id !== user.id) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES (?, 'vote', ?, ?, ?)`,
          [
            postAuthor.author_id,
            'New vote on your post',
            `${user.username} voted on your post`,
            `/posts/${postAuthor.slug}`,
          ]
        );
      }
    }

    // Get updated upvote count
    const countRows = await query(
      'SELECT COUNT(*) AS total FROM upvotes WHERE post_id = ?',
      [postId]
    );
    const upvotesCount = (countRows as any)[0]?.total || 0;

    // Get post slug to revalidate the post detail page
    const postSlugResult = await query('SELECT slug FROM posts WHERE id = ?', [postId]);
    const postSlug = Array.isArray(postSlugResult) && postSlugResult.length > 0 ? postSlugResult[0]?.slug : null;

    revalidatePath('/');
    if (postSlug) {
      revalidatePath(`/posts/${postSlug}`);
    }

    return NextResponse.json({
      success: true,
      hasUpvoted,
      upvotesCount,
    });
  } catch (error: any) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
