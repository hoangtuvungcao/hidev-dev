import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getCategories } from '@/lib/categories';
import { detectLanguageServer } from '@/lib/i18n-server';
import { getSiteConfig } from '@/lib/settings';
import { Post, Category } from '@/types';
import ProfileClient from './profile-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const lang = await detectLanguageServer();
  const config = await getSiteConfig();
  
  let posts: Post[] = [];
  let votedPosts: Post[] = [];
  let categories: Category[] = [];

  try {
    categories = await getCategories();

    posts = await query<Post[]>(
      `SELECT p.id, p.title, p.slug, p.summary, p.status, p.created_at, 
              c.name AS category_name, c.slug AS category_slug
       FROM posts p
       JOIN categories c ON p.category_id = c.id
       WHERE p.author_id = ?
       ORDER BY p.created_at DESC`,
      [user.id]
    );

    votedPosts = await query<Post[]>(
      `SELECT p.id, p.title, p.slug, p.summary, p.status, p.created_at, 
              c.name AS category_name, c.slug AS category_slug
       FROM posts p
       JOIN categories c ON p.category_id = c.id
       JOIN upvotes u ON u.post_id = p.id
       WHERE u.user_id = ?
       ORDER BY u.created_at DESC`,
      [user.id]
    );
  } catch (error) {
    console.error('Error loading profile page database records:', error);
  }

  return (
    <ProfileClient 
      user={user} 
      initialPosts={posts} 
      initialVotedPosts={votedPosts}
      categories={categories} 
      lang={lang} 
      qrDonation={config.qrDonation || ''}
    />
  );
}
