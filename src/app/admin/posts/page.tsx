'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Post } from '@/types';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { AppIcon } from '@/components/ui/icon';

export default function AdminPostsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [lang, setLang] = useState<Language>('en');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<number | null>(null);
  
  // Tab filtering
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Client-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLanguageClient());

    fetch('/api/admin/posts')
      .then(res => {
        if (res.status === 403) {
          router.push('/');
          return;
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setPosts(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching admin posts:', err);
        setError('Không thể tải danh sách bài viết');
        setLoading(false);
      });
  }, [router]);

  const handleStatusUpdate = async (id: number, newStatus: 'approved' | 'rejected') => {
    try {
      setActionId(id);
      const res = await fetch('/api/admin/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(
          newStatus === 'approved' 
            ? (lang === 'vi' ? 'Đã duyệt bài viết thành công!' : 'Post approved successfully!') 
            : (lang === 'vi' ? 'Đã từ chối bài viết!' : 'Post rejected!'),
          'success'
        );
        setPosts(prev => prev.map(post => 
          post.id === id ? { ...post, status: newStatus } : post
        ));
      } else {
        showToast(data.error || 'Thao tác thất bại', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
      console.error('Moderation error:', err);
    } finally {
      setActionId(null);
    }
  };

  const handleDeletePost = async (id: number) => {
    const confirmMsg = lang === 'vi'
      ? 'Bạn có chắc chắn muốn xóa vĩnh viễn bài đăng này? Thao tác này không thể hoàn tác.'
      : 'Are you sure you want to permanently delete this tool? This action cannot be undone.';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      setActionId(id);
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        showToast(lang === 'vi' ? 'Xóa bài viết thành công!' : 'Post deleted successfully!', 'success');
        setPosts(prev => prev.filter(post => post.id !== id));
      } else {
        showToast(data.error || 'Xóa thất bại', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
      console.error('Delete post error:', err);
    } finally {
      setActionId(null);
    }
  };

  const t = translations[lang] || translations.en;

  const pendingCount = posts.filter(p => p.status === 'pending').length;
  const approvedCount = posts.filter(p => p.status === 'approved').length;
  const rejectedCount = posts.filter(p => p.status === 'rejected').length;

  const filteredPosts = posts.filter(post => {
    if (activeTab === 'all') return true;
    return post.status === activeTab;
  });

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="page-fade-in">
      <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }} className="back-link">
        <AppIcon name="ArrowLeft" size="sm" /> {lang === 'vi' ? 'Quay lại trang Admin' : 'Back to Admin'}
      </Link>

      <div className="admin-card" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>
          {t.moderationQueue}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px' }}>
          {t.moderationDesc}
        </p>

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--destructive)',
            color: '#fca5a5',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '24px'
          }}>
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="admin-filter-tabs">
          <button 
            className={`admin-filter-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
          >
            {lang === 'vi' ? 'Tất cả' : 'All'} <span className="admin-filter-count">{posts.length}</span>
          </button>
          <button 
            className={`admin-filter-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
          >
            {lang === 'vi' ? 'Chờ duyệt' : 'Pending'} <span className="admin-filter-count">{pendingCount}</span>
          </button>
          <button 
            className={`admin-filter-tab ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => { setActiveTab('approved'); setCurrentPage(1); }}
          >
            {lang === 'vi' ? 'Đã duyệt' : 'Approved'} <span className="admin-filter-count">{approvedCount}</span>
          </button>
          <button 
            className={`admin-filter-tab ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => { setActiveTab('rejected'); setCurrentPage(1); }}
          >
            {lang === 'vi' ? 'Từ chối' : 'Rejected'} <span className="admin-filter-count">{rejectedCount}</span>
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton skeleton-card" style={{ height: '100px' }}></div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {filteredPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '14.5px', fontStyle: 'italic' }}>
                {lang === 'vi' ? 'Không có bài viết nào phù hợp.' : 'No posts match this status filter.'}
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{lang === 'vi' ? 'Tiêu đề bài viết' : 'Post Title'}</th>
                    <th>{lang === 'vi' ? 'Danh mục' : 'Category'}</th>
                    <th>{lang === 'vi' ? 'Người đăng' : 'Author'}</th>
                    <th>{lang === 'vi' ? 'Ngày đăng' : 'Date Posted'}</th>
                    <th>{lang === 'vi' ? 'Trạng thái' : 'Status'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'Thao tác' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPosts.map(post => (
                    <tr key={post.id}>
                      <td>
                        <Link href={`/posts/${post.slug}`} target="_blank" style={{ fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }} className="post-title-link">
                          {post.title}
                        </Link>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                          {post.summary}
                        </div>
                      </td>
                      <td>
                        <span className="post-category" style={{ fontSize: '11px', margin: 0 }}>
                          {post.category_name}
                        </span>
                      </td>
                      <td>@{post.username}</td>
                      <td suppressHydrationWarning>
                        {new Date(post.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td>
                        <span className={`status-badge status-${post.status}`}>
                          {post.status === 'approved' && (lang === 'vi' ? 'Đã duyệt' : 'Approved')}
                          {post.status === 'pending' && (lang === 'vi' ? 'Chờ duyệt' : 'Pending')}
                          {post.status === 'rejected' && (lang === 'vi' ? 'Từ chối' : 'Rejected')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <Link
                            href={`/posts/edit/${post.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
                            title={lang === 'vi' ? 'Sửa' : 'Edit'}
                          >
                            <AppIcon name="Pencil" size={14} />
                          </Link>
                          {post.status !== 'approved' && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
                              onClick={() => handleStatusUpdate(post.id, 'approved')}
                              disabled={actionId === post.id}
                            >
                              <AppIcon name="Check" size={14} stroke={2.5} /> {lang === 'vi' ? 'Duyệt' : 'Approve'}
                            </button>
                          )}
                          {post.status !== 'rejected' && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24', borderRadius: '6px' }}
                              onClick={() => handleStatusUpdate(post.id, 'rejected')}
                              disabled={actionId === post.id}
                            >
                              <AppIcon name="XCircle" size={14} /> {lang === 'vi' ? 'Từ chối' : 'Reject'}
                            </button>
                          )}
                          <button
                            className="btn"
                            style={{ 
                              padding: '6px 12px', 
                              fontSize: '12px', 
                              borderRadius: '6px', 
                              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                              border: '1px solid rgba(239, 68, 68, 0.15)', 
                              color: '#fca5a5',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                            onClick={() => handleDeletePost(post.id)}
                            disabled={actionId === post.id}
                            title={lang === 'vi' ? 'Xóa bài viết' : 'Delete Post'}
                          >
                            <AppIcon name="Trash2" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="doc-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
                <button
                  className="btn btn-secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  ← {lang === 'vi' ? 'Trước' : 'Prev'}
                </button>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  {lang === 'vi' ? 'Sau' : 'Next'} →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
