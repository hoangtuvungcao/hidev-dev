import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getCategories } from '@/lib/categories';
import { detectLanguageServer } from '@/lib/i18n-server';
import { Post, Category } from '@/types';
import EditPostClient from './edit-post-client';

interface EditPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const resolvedParams = await params;
  const postId = parseInt(resolvedParams.id);
  
  if (isNaN(postId)) {
    notFound();
  }

  const lang = await detectLanguageServer();
  let post: Post | null = null;
  let categories: Category[] = [];

  try {
    categories = await getCategories();

    const posts = await query<Post[]>('SELECT * FROM posts WHERE id = ?', [postId]);
    if (posts && posts.length > 0) {
      post = posts[0];
    }
  } catch (error) {
    console.error('Error loading post edit page database details:', error);
  }

  if (!post) {
    notFound();
  }

  // Verify that current user is the author or an admin
  if (post.author_id !== user.id && user.role !== 'admin') {
    redirect('/');
  }

  return (
    <EditPostClient 
      post={post} 
      categories={categories} 
      lang={lang} 
    />
  );
}
