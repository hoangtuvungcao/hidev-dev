import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { getCategories } from '@/lib/categories';
import { detectLanguageServer } from '@/lib/i18n-server';
import { getSiteConfig } from '@/lib/settings';
import { Post, User } from '@/types';
import PublicProfileClient from './public-profile-client';

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getUserData(username: string): Promise<User | null> {
  const users = await query<User[]>(
    'SELECT id, username, email, role, avatar_url, created_at FROM users WHERE username = ?',
    [username]
  );
  if (Array.isArray(users) && users.length > 0) {
    return users[0];
  }
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const user = await getUserData(resolvedParams.username);
  const config = await getSiteConfig();
  const lang = await detectLanguageServer();

  if (!user) {
    return { title: 'Không tìm thấy thành viên' };
  }

  const title = lang === 'vi'
    ? `@${user.username} - Hồ sơ thành viên | ${config.siteName || 'hi_dev.'}`
    : `@${user.username} - Developer Profile | ${config.siteName || 'hi_dev.'}`;

  const description = lang === 'vi'
    ? `Xem các bài viết đã đăng và lượt bình chọn của @${user.username} tại cộng đồng lập trình hi_dev.`
    : `Explore articles published and upvoted by @${user.username} on the hi_dev. developer community.`;

  let domain = config.siteDomain || 'hidev.dev';
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }

  const ogImageUrl = user.avatar_url || `${domain}/logo.png`;

  return {
    title,
    description,
    alternates: {
      canonical: `/users/${user.username}`,
    },
    openGraph: {
      title,
      description,
      url: `/users/${user.username}`,
      siteName: config.siteName,
      type: 'profile',
      images: [
        {
          url: ogImageUrl,
          width: 200,
          height: 200,
          alt: user.username,
        }
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [ogImageUrl],
    }
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const username = resolvedParams.username;
  const lang = await detectLanguageServer();

  // Fetch user by username
  const user = await getUserData(username);

  if (!user) {
    notFound();
  }

  // Fetch user's posts
  const posts = await query<Post[]>(
    `SELECT p.id, p.title, p.slug, p.summary, p.status, p.created_at, 
            c.name AS category_name, c.slug AS category_slug
     FROM posts p
     JOIN categories c ON p.category_id = c.id
     WHERE p.author_id = ? AND p.status = 'approved'
     ORDER BY p.created_at DESC`,
    [user.id]
  );

  // Fetch user's voted posts
  const votedPosts = await query<Post[]>(
    `SELECT p.id, p.title, p.slug, p.summary, p.status, p.created_at, 
            c.name AS category_name, c.slug AS category_slug
     FROM posts p
     JOIN categories c ON p.category_id = c.id
     JOIN upvotes u ON u.post_id = p.id
     WHERE u.user_id = ? AND p.status = 'approved'
     ORDER BY u.created_at DESC`,
    [user.id]
  );

  const categories = await getCategories();

  const profileSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    'mainEntity': {
      '@type': 'Person',
      'name': user.username,
      'image': user.avatar_url || '',
      'identifier': user.id,
      'jobTitle': user.role === 'admin' ? 'Administrator' : 'Contributor'
    }
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profileSchema),
        }}
      />
      <PublicProfileClient
        user={user}
        posts={posts || []}
        votedPosts={votedPosts || []}
        categories={categories}
        lang={lang}
      />
    </div>
  );
}
