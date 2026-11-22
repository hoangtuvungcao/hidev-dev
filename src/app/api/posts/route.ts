import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getFeedPosts } from '@/lib/posts';
import { createPostSchema, validateBody } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const categorySlug = searchParams.get('category') || undefined;
    const searchTerm = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 12;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const offset = (page - 1) * limit;
    const user = await getCurrentUser();

    const posts = await getFeedPosts({
      userId: user?.id,
      categorySlug,
      searchTerm,
      sort: 'hot', // API defaults to hot sort
      limit,
      offset,
    });

    return NextResponse.json(posts);
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    // If table doesn't exist, return empty array rather than crashing
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để đăng bài' }, { status: 401 });
    }

    const body = await req.json();
    const validation = await validateBody(createPostSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { title, summary, link, content, categoryId, thumbnail } = validation.data;

    // Generate slug from title
    let slug = title
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accent marks
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '') // remove special chars
      .replace(/[\s-]+/g, '-'); // replace spaces/hyphens with single hyphen

    // Check slug uniqueness, append timestamp if duplicate
    const checkSlug = await query('SELECT id FROM posts WHERE slug = ?', [slug]);
    if (Array.isArray(checkSlug) && checkSlug.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // Insert post
    await query(
      'INSERT INTO posts (title, slug, summary, link, content, category_id, thumbnail, author_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        slug,
        summary,
        link,
        content,
        categoryId,
        thumbnail || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
        user.id,
        user.role === 'admin' ? 'approved' : 'pending', // admin auto-approved
      ]
    );

    // Revalidate paths to show the post or update moderation queue immediately
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/posts');

    return NextResponse.json({
      success: true,
      message: user.role === 'admin' ? 'Đã đăng bài thành công!' : 'Đã gửi bài viết. Vui lòng chờ kiểm duyệt từ admin!',
      slug,
    });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
