import React from 'react';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import DbErrorNotice from '@/components/DbErrorNotice';
import { detectLanguageServer } from '@/lib/i18n-server';
import AdminDashboardClient from './admin-dashboard-client';

async function getInitialData() {
  try {
    const postCountRows = await query('SELECT status, COUNT(*) AS total FROM posts GROUP BY status');
    const userCountRows = await query('SELECT COUNT(*) AS total FROM users');
    const commentCountRows = await query('SELECT COUNT(*) AS total FROM comments');
    
    // Fetch pending posts with username
    const pendingPosts = await query<{
      id: number;
      title: string;
      slug: string;
      created_at: string;
      username: string;
      category_name: string;
    }[]>(`
      SELECT p.id, p.title, p.slug, p.created_at, u.username, c.name AS category_name
      FROM posts p
      JOIN users u ON p.author_id = u.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    // Fetch documents counts
    let docTotal = 0;
    let docPending = 0;
    try {
      const docCountRows = await query('SELECT status, COUNT(*) AS total FROM documents GROUP BY status');
      if (Array.isArray(docCountRows)) {
        for (const row of docCountRows as any[]) {
          docTotal += row.total;
          if (row.status === 'pending') docPending = row.total;
        }
      }
    } catch {
      // documents table might not be initialized
    }

    const stats = {
      approvedPosts: 0,
      pendingPosts: 0,
      rejectedPosts: 0,
      totalUsers: (userCountRows as any)[0]?.total || 0,
      totalComments: (commentCountRows as any)[0]?.total || 0,
      totalDocuments: docTotal,
      pendingDocuments: docPending,
    };

    if (Array.isArray(postCountRows)) {
      for (const row of postCountRows as any[]) {
        if (row.status === 'approved') stats.approvedPosts = row.total;
        if (row.status === 'pending') stats.pendingPosts = row.total;
        if (row.status === 'rejected') stats.rejectedPosts = row.total;
      }
    }

    return { stats, pendingPosts, error: '' };
  } catch (err: any) {
    console.error('Initial stats load failed:', err);
    return {
      stats: { approvedPosts: 0, pendingPosts: 0, rejectedPosts: 0, totalUsers: 0, totalComments: 0, totalDocuments: 0, pendingDocuments: 0 },
      pendingPosts: [],
      error: err.message
    };
  }
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  const lang = await detectLanguageServer();
  
  if (!user || user.role !== 'admin') {
    notFound();
  }

  const { stats, pendingPosts, error } = await getInitialData();

  return (
    <div className="page-fade-in">
      {error && <DbErrorNotice errorMessage={error} />}
      <AdminDashboardClient 
        initialStats={stats}
        initialPending={pendingPosts}
        lang={lang}
        username={user.username}
      />
    </div>
  );
}
