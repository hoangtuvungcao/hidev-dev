import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { getSiteConfig } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';
import { Post, Comment } from '@/types';
import { parseMarkdown } from '@/lib/markdown';
import DbErrorNotice from '@/components/DbErrorNotice';
import PostDetailClient from './post-detail-client';
import { detectLanguageServer } from '@/lib/i18n-server';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

// Fetch helper
async function getPostData(slug: string, currentUserId?: number): Promise<{ post: Post | null; error: string }> {
  try {
    const sql = `
      SELECT p.*, u.username, u.avatar_url AS author_avatar, c.name AS category_name, c.slug AS category_slug,
        (SELECT COUNT(*) FROM upvotes WHERE post_id = p.id) AS upvotes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
        ${currentUserId ? ', EXISTS(SELECT 1 FROM upvotes WHERE user_id = ? AND post_id = p.id) AS has_upvoted' : ', 0 AS has_upvoted'}
      FROM posts p
      JOIN users u ON p.author_id = u.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.status = 'approved'
    `;
    const params = currentUserId ? [currentUserId, slug] : [slug];
    const rows = await query<Post[]>(sql, params);
    
    if (Array.isArray(rows) && rows.length > 0) {
      return { post: rows[0], error: '' };
    }
    return { post: null, error: '' };
  } catch (err: any) {
    console.error('Error fetching post detail from database:', err);
    return { post: null, error: err.message };
  }
}

// Fetch related posts: same-category first (ranked by popularity), backfilled
// with globally popular posts so the sidebar is always well-populated on desktop.
async function getRelatedPosts(postId: number, categoryId: number, limit = 5): Promise<Post[]> {
  try {
    const sameCategory = await query<Post[]>(
      `SELECT p.id, p.title, p.slug, p.summary, p.thumbnail, p.created_at,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT COUNT(*) FROM upvotes WHERE post_id = p.id) AS upvotes_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
       FROM posts p
       JOIN categories c ON p.category_id = c.id
       WHERE p.status = 'approved' AND p.category_id = ? AND p.id <> ?
       ORDER BY upvotes_count DESC, p.created_at DESC
       LIMIT ?`,
      [categoryId, postId, limit]
    );

    const collected: Post[] = Array.isArray(sameCategory) ? sameCategory : [];

    // Backfill with popular posts from other categories if we are short.
    if (collected.length < limit) {
      const excludeIds = [postId, ...collected.map(p => p.id)];
      const placeholders = excludeIds.map(() => '?').join(',');
      const fill = await query<Post[]>(
        `SELECT p.id, p.title, p.slug, p.summary, p.thumbnail, p.created_at,
                c.name AS category_name, c.slug AS category_slug,
                (SELECT COUNT(*) FROM upvotes WHERE post_id = p.id) AS upvotes_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
         FROM posts p
         JOIN categories c ON p.category_id = c.id
         WHERE p.status = 'approved' AND p.id NOT IN (${placeholders})
         ORDER BY upvotes_count DESC, p.created_at DESC
         LIMIT ?`,
        [...excludeIds, limit - collected.length]
      );
      if (Array.isArray(fill)) collected.push(...fill);
    }

    return collected;
  } catch (e) {
    console.warn('Could not fetch related posts:', e);
    return [];
  }
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { post } = await getPostData(resolvedParams.slug);
  const config = await getSiteConfig();
  
  if (!post) {
    return {
      title: 'Không tìm thấy bài viết',
    };
  }

  let domain = config.siteDomain || 'hidev.dev';
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }

  const ogImageUrl = post.thumbnail?.startsWith('http') ? post.thumbnail : `${domain}${post.thumbnail || '/logo.png'}`;

  return {
    title: post.title,
    description: post.summary,
    alternates: {
      canonical: `/posts/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | ${config.siteName}`,
      description: post.summary,
      url: `/posts/${post.slug}`,
      siteName: config.siteName,
      type: 'article',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at || post.created_at,
      authors: [`${domain}/users/${post.username}`],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | ${config.siteName}`,
      description: post.summary,
      images: [ogImageUrl],
    }
  };
}

export default async function PostDetailPage({ params }: PostPageProps) {
  const resolvedParams = await params;
  const user = await getCurrentUser();
  const { post, error } = await getPostData(resolvedParams.slug, user?.id);
  const lang = await detectLanguageServer();
  const config = await getSiteConfig();

  // If post not found, trigger Next.js notFound
  if (!post && !error) {
    notFound();
  }

  // Load comments
  let comments: Comment[] = [];
  let relatedPosts: Post[] = [];
  if (post) {
    try {
      comments = await query<Comment[]>(
        `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at, u.username, u.avatar_url
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.post_id = ?
         ORDER BY c.created_at DESC`,
        [post.id]
      );
    } catch (e) {
      console.warn('Could not fetch comments for post:', e);
    }

    relatedPosts = await getRelatedPosts(post.id, post.category_id, 5);
  }

  let domain = config.siteDomain || 'hidev.dev';
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }

  // S11: Schema.org Article Structured Data (Replacing fake SoftwareApplication & AggregateRating)
  const articleSchema = post ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': post.title,
    'description': post.summary,
    'image': post.thumbnail?.startsWith('http') ? post.thumbnail : `${domain}${post.thumbnail || '/logo.png'}`,
    'datePublished': post.created_at,
    'dateModified': post.updated_at || post.created_at,
    'author': {
      '@type': 'Person',
      'name': post.username,
      'url': `${domain}/users/${post.username}`
    },
    'publisher': {
      '@type': 'Organization',
      'name': config.siteName,
      'logo': {
        '@type': 'ImageObject',
        'url': config.siteLogo.startsWith('/') ? `${domain}${config.siteLogo}` : config.siteLogo
      }
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `${domain}/posts/${post.slug}`
    }
  } : null;

  // S14: Schema.org BreadcrumbList Structured Data
  const breadcrumbSchema = post ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': domain
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': post.category_name,
        'item': `${domain}/categories/${post.category_slug}`
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': post.title,
        'item': `${domain}/posts/${post.slug}`
      }
    ]
  } : null;

  // Fallback rendering on database failure
  if (error && !post) {
    return (
      <div>
        <DbErrorNotice errorMessage={error} />
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2>Mất kết nối dữ liệu / Database Offline</h2>
          <p>Không thể hiển thị bài viết do cơ sở dữ liệu MySQL đang ngoại tuyến.</p>
        </div>
      </div>
    );
  }

  const htmlContent = parseMarkdown(post!.content);

  return (
    <div>
      {articleSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(articleSchema),
          }}
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}

      <PostDetailClient
        post={post!}
        initialComments={comments}
        htmlContent={htmlContent}
        loggedIn={!!user}
        user={user}
        lang={lang}
        relatedPosts={relatedPosts}
      />
    </div>
  );
}
