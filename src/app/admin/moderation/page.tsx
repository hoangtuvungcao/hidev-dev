'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';

interface PendingItem {
  id: number;
  title: string;
  slug: string;
  username: string;
  category_name?: string;
  created_at: string;
  type: 'post' | 'document';
  status: string;
  doc_type?: string;
  description?: string;
}

export default function AdminModerationPage() {
  const { showToast } = useToast();
  const [lang, setLang] = useState<Language>('en');
  const [tab, setTab] = useState<'posts' | 'documents'>('posts');
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLanguageClient());
  }, []);
  const t = translations[lang] || translations.en;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'posts') {
        const res = await fetch('/api/admin/posts');
        const data = await res.json();
        if (Array.isArray(data)) {
          setItems(data.filter((p: any) => p.status === 'pending').map((p: any) => ({ ...p, type: 'post' as const })));
        }
      } else {
        const res = await fetch('/api/admin/documents');
        const data = await res.json();
        if (data.documents) {
          setItems(data.documents.filter((d: any) => d.status === 'pending').map((d: any) => ({ ...d, type: 'document' as const })));
        }
      }
    } catch {
      showToast('Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, [fetchItems]);

  const handleModerate = async (id: number, status: 'approved' | 'rejected', type: 'post' | 'document') => {
    try {
      const endpoint = type === 'post' ? '/api/admin/posts' : '/api/admin/documents';
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        showToast(status === 'approved' ? 'Approved!' : 'Rejected!', 'success');
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed', 'error');
      }
    } catch {
      showToast('Server error', 'error');
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
        🛡️ {t.adminModeration}
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 28px 0' }}>
        {lang === 'vi' ? 'Kiểm duyệt nội dung do cộng đồng đăng tải.' : 'Review community-submitted content.'}
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {(['posts', 'documents'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', fontSize: '13px', fontWeight: tab === t ? 700 : 500,
              color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none', border: 'none', borderRadius: 0,
              cursor: 'pointer', transition: 'var(--transition)',
              marginBottom: '-1px',
            }}
          >
            {t === 'posts' ? (lang === 'vi' ? 'Bài viết' : 'Posts') : (lang === 'vi' ? 'Tài liệu' : 'Documents')}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        backgroundColor: 'var(--surface)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            ✨ {lang === 'vi' ? 'Không có nội dung nào cần kiểm duyệt!' : 'All caught up! Nothing to moderate.'}
          </div>
        ) : (
          items.map((item, i) => (
            <div
              key={`${item.type}-${item.id}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', gap: '16px',
                borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={item.type === 'post' ? `/posts/${item.slug}` : `/documents/${item.slug}`}
                  target="_blank"
                  style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}
                >
                  {item.title}
                </Link>
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                  {item.category_name && (
                    <span style={{
                      padding: '1px 6px', borderRadius: '4px',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1',
                      fontWeight: 600, fontSize: '11px',
                    }}>
                      {item.category_name}
                    </span>
                  )}
                  {item.doc_type && (
                    <span style={{
                      padding: '1px 6px', borderRadius: '4px',
                      backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4',
                      fontWeight: 600, fontSize: '11px',
                    }}>
                      {item.doc_type}
                    </span>
                  )}
                  <span>@{item.username}</span>
                  <span suppressHydrationWarning>{new Date(item.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => handleModerate(item.id, 'approved', item.type)}
                  style={{
                    padding: '6px 16px', fontSize: '12px', fontWeight: 700,
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)',
                    transition: 'var(--transition)',
                  }}
                >
                  ✓ {lang === 'vi' ? 'Duyệt' : 'Approve'}
                </button>
                <button
                  onClick={() => handleModerate(item.id, 'rejected', item.type)}
                  style={{
                    padding: '6px 16px', fontSize: '12px', fontWeight: 700,
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                    transition: 'var(--transition)',
                  }}
                >
                  ✗ {lang === 'vi' ? 'Từ chối' : 'Reject'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
