'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { translations, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { AppIcon } from '@/components/ui/icon';

interface PostSummary {
  id: number;
  title: string;
  slug: string;
  username: string;
  category_name: string;
  created_at: string;
}

interface Stats {
  approvedPosts: number;
  pendingPosts: number;
  rejectedPosts: number;
  totalUsers: number;
  totalComments: number;
  totalDocuments: number;
  pendingDocuments: number;
}

interface AdminDashboardClientProps {
  initialStats: Stats;
  initialPending: PostSummary[];
  lang: Language;
  username: string;
}

export default function AdminDashboardClient({
  initialStats,
  initialPending,
  lang,
  username,
}: AdminDashboardClientProps) {
  const { showToast } = useToast();
  const [stats, setStats] = useState<Stats>(initialStats);
  const [pendingPosts, setPendingPosts] = useState<PostSummary[]>(initialPending);
  const [loading, setLoading] = useState(false);

  const t = translations[lang] || translations.en;

  // Auto-refresh stats and pending queue every 30s
  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        const statsRes = await fetch('/api/admin/stats');
        if (statsRes.ok) {
          const newStats = await statsRes.json();
          setStats(newStats);
        }

        const pendingRes = await fetch('/api/admin/posts');
        if (pendingRes.ok) {
          const posts = await pendingRes.json();
          if (Array.isArray(posts)) {
            setPendingPosts(posts.filter((p: any) => p.status === 'pending'));
          }
        }
      } catch (err) {
        console.error('Auto-refresh dashboard data failed:', err);
      }
    };

    const interval = setInterval(fetchLatestData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleModeration = async (id: number, status: 'approved' | 'rejected') => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(
          status === 'approved'
            ? (lang === 'vi' ? 'Đã phê duyệt bài viết!' : 'Post approved!')
            : (lang === 'vi' ? 'Đã từ chối bài viết!' : 'Post rejected!'),
          'success'
        );
        // Optimistic UI updates
        setPendingPosts(prev => prev.filter(p => p.id !== id));
        setStats(prev => ({
          ...prev,
          pendingPosts: Math.max(0, prev.pendingPosts - 1),
          approvedPosts: status === 'approved' ? prev.approvedPosts + 1 : prev.approvedPosts,
          rejectedPosts: status === 'rejected' ? prev.rejectedPosts + 1 : prev.rejectedPosts,
        }));
      } else {
        showToast(data.error || 'Thao tác thất bại', 'error');
      }
    } catch {
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: t.pendingPosts, value: stats.pendingPosts, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', iconName: 'Clock' },
    { label: t.approvedPosts, value: stats.approvedPosts, color: 'var(--primary)', bg: 'rgba(16, 185, 129, 0.08)', iconName: 'CheckCircle' },
    { label: lang === 'vi' ? 'Bài bị từ chối' : 'Rejected', value: stats.rejectedPosts, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', iconName: 'XCircle' },
    { label: t.members, value: stats.totalUsers, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', iconName: 'Users' },
    { label: t.totalComments, value: stats.totalComments, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)', iconName: 'MessageSquare' },
    { label: t.docTotalDocs, value: stats.totalDocuments, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)', iconName: 'BookOpen' },
    { label: t.docPending, value: stats.pendingDocuments, color: '#f97316', bg: 'rgba(249, 115, 22, 0.08)', iconName: 'ClipboardList' },
    { label: lang === 'vi' ? 'Tổng bài viết' : 'Total Posts', value: stats.approvedPosts + stats.pendingPosts + stats.rejectedPosts, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', iconName: 'BarChart2' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            {t.adminOverview}
          </h1>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '20px',
            fontSize: '11px', fontWeight: 700, color: 'var(--primary)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
          }}>
            <AppIcon name="TrendingUp" size={12} /> LIVE
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
          {lang === 'vi'
            ? `Chào mừng trở lại, @${username}. Tổng quan hệ thống và kiểm duyệt nội dung.`
            : `Welcome back, @${username}. System overview and content moderation.`}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {statCards.map((card, i) => (
          <div key={i} style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            backgroundColor: card.bg,
            transition: 'var(--transition)',
            cursor: 'default',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {card.label}
              </span>
              <AppIcon name={card.iconName} size={18} color={card.color} />
            </div>
            <span style={{ fontSize: '32px', fontWeight: 800, color: card.color, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {card.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Moderation Queue */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        backgroundColor: 'var(--surface)',
        overflow: 'hidden',
        marginBottom: '32px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcon name="Zap" size={16} className="text-warning" /> {lang === 'vi' ? 'Hàng chờ duyệt nhanh' : 'Quick Moderation Queue'}
            <span style={{
              padding: '2px 8px', borderRadius: '10px',
              fontSize: '11px', fontWeight: 700,
              backgroundColor: stats.pendingPosts > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.1)',
              color: stats.pendingPosts > 0 ? '#f59e0b' : 'var(--primary)',
            }}>
              {pendingPosts.length}
            </span>
          </h2>
          <Link href="/admin/posts" style={{ fontSize: '13px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            {lang === 'vi' ? 'Xem tất cả' : 'View All'} →
          </Link>
        </div>

        {pendingPosts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, fontStyle: 'italic' }}>
              ✨ {lang === 'vi' ? 'Không có bài viết nào đang chờ duyệt.' : 'All caught up! No posts pending moderation.'}
            </p>
          </div>
        ) : (
          <div>
            {pendingPosts.slice(0, 8).map((post, i) => (
              <div
                key={post.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: i < pendingPosts.length - 1 ? '1px solid var(--border)' : 'none',
                  gap: '16px',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Link href={`/posts/${post.slug}`} target="_blank" style={{
                      fontSize: '14px', fontWeight: 600, color: 'var(--text)',
                      textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {post.title}
                    </Link>
                    <Link href={`/posts/${post.slug}`} target="_blank" style={{ color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <AppIcon name="ExternalLink" size={12} />
                    </Link>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span style={{
                      padding: '1px 6px', borderRadius: '4px',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1',
                      fontWeight: 600, fontSize: '11px',
                    }}>
                      {post.category_name}
                    </span>
                    <span>@{post.username}</span>
                    <span suppressHydrationWarning>{new Date(post.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleModeration(post.id, 'approved')}
                    disabled={loading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 14px', fontSize: '12px', fontWeight: 700,
                      borderRadius: '6px', border: 'none', cursor: 'pointer',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: 'var(--primary)', transition: 'var(--transition)',
                    }}
                  >
                    <AppIcon name="Check" size={14} /> {lang === 'vi' ? 'Duyệt' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleModeration(post.id, 'rejected')}
                    disabled={loading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 14px', fontSize: '12px', fontWeight: 700,
                      borderRadius: '6px', border: 'none', cursor: 'pointer',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444', transition: 'var(--transition)',
                    }}
                  >
                    <AppIcon name="X" size={14} /> {lang === 'vi' ? 'Từ chối' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {[
          { href: '/admin/posts', iconName: 'FileText', label: lang === 'vi' ? 'Quản lý bài viết' : 'Manage Posts', desc: lang === 'vi' ? 'Duyệt, chỉnh sửa và quản lý bài viết cộng đồng.' : 'Review, edit and manage community posts.', color: 'var(--primary)' },
          { href: '/admin/documents', iconName: 'BookOpen', label: t.docManage, desc: lang === 'vi' ? 'Duyệt tài liệu, dự án và tài nguyên kỹ thuật.' : 'Review documents, projects and technical resources.', color: '#8b5cf6' },
          { href: '/admin/users', iconName: 'Users', label: t.adminUsers, desc: lang === 'vi' ? 'Quản lý tài khoản, phân quyền và kiểm soát truy cập.' : 'Manage accounts, roles and access control.', color: '#6366f1' },
          { href: '/admin/categories', iconName: 'Tag', label: t.categories, desc: lang === 'vi' ? 'Thêm, sửa, xóa danh mục bài viết.' : 'Add, edit, delete post categories.', color: '#f59e0b' },
          { href: '/admin/settings', iconName: 'Settings', label: lang === 'vi' ? 'Cấu hình hệ thống' : 'System Settings', desc: lang === 'vi' ? 'Cài đặt website, SEO và thông tin liên hệ.' : 'Website settings, SEO and contact info.', color: '#3b82f6' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              textDecoration: 'none',
              transition: 'var(--transition)',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}
            className="admin-quick-link"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AppIcon name={item.iconName} size={24} color={item.color} />
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{item.label}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              {item.desc}
            </p>
          </Link>
        ))}
      </div>

      <style jsx global>{`
        .admin-quick-link:hover {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.2);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
