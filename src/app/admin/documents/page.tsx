'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { AppIcon } from '@/components/ui/icon';

interface DocItem {
  id: number;
  title: string;
  slug: string;
  doc_type: string;
  course_code: string;
  academic_year: string;
  status: string;
  username: string;
  sharer_name: string;
  created_at: string;
  view_count: number;
  download_count: number;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  de_thi: 'Đề thi',
  de_cuong: 'Đề cương',
  slide: 'Slide',
  giao_trinh: 'Giáo trình',
  tai_lieu_tham_khao: 'Tham khảo',
  bao_cao: 'Báo cáo',
  nghien_cuu: 'Nghiên cứu',
  khac: 'Khác',
};

export default function AdminDocumentsPage() {
  const { showToast } = useToast();
  const [lang, setLang] = useState<Language>('en');
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Client-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [statusFilter, search]);

  const fetchDocs = async (status?: string, searchTerm?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (searchTerm) params.set('search', searchTerm);
      params.set('limit', '100');

      const res = await fetch(`/api/admin/documents?${params.toString()}`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      console.error('Error fetching admin documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLanguageClient());
    fetchDocs();
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        showToast(lang === 'vi' ? 'Đã cập nhật trạng thái!' : 'Status updated!', 'success');
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, status } : d));
      } else {
        showToast('Error', 'error');
      }
    } catch {
      showToast('Error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(lang === 'vi' ? 'Xóa tài liệu này?' : 'Delete this document?')) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(lang === 'vi' ? 'Đã xóa!' : 'Deleted!', 'success');
        setDocuments(prev => prev.filter(d => d.id !== id));
      }
    } catch {
      showToast('Error', 'error');
    }
  };

  const t = translations[lang] || translations.en;

  const statusCounts = {
    all: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    approved: documents.filter(d => d.status === 'approved').length,
    rejected: documents.filter(d => d.status === 'rejected').length,
    hidden: documents.filter(d => d.status === 'hidden').length,
  };

  const filteredDocs = statusFilter
    ? documents.filter(d => d.status === statusFilter)
    : documents;

  const searchedDocs = search
    ? filteredDocs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()) || (d.course_code || '').toLowerCase().includes(search.toLowerCase()))
    : filteredDocs;

  const totalPages = Math.ceil(searchedDocs.length / itemsPerPage);
  const paginatedDocs = searchedDocs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="page-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <AppIcon name="Shield" size={24} className="text-primary" />
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{t.docManage}</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
        {lang === 'vi' ? 'Duyệt, chỉnh sửa và quản lý tài liệu học tập.' : 'Review, edit and manage learning materials.'}
      </p>

      <Link href="/admin" className="back-link-general" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '24px', fontSize: '13px', fontWeight: 600 }}>
        &larr; {lang === 'vi' ? 'Quay lại Admin' : 'Back to Admin'}
      </Link>

      {/* Status Filter Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '20px' }}>
        {[
          { key: '', label: lang === 'vi' ? 'Tất cả' : 'All', count: statusCounts.all },
          { key: 'pending', label: lang === 'vi' ? 'Chờ duyệt' : 'Pending', count: statusCounts.pending },
          { key: 'approved', label: lang === 'vi' ? 'Đã duyệt' : 'Approved', count: statusCounts.approved },
          { key: 'rejected', label: lang === 'vi' ? 'Từ chối' : 'Rejected', count: statusCounts.rejected },
          { key: 'hidden', label: lang === 'vi' ? 'Ẩn' : 'Hidden', count: statusCounts.hidden },
        ].map(tab => (
          <button key={tab.key} className={`admin-filter-tab ${statusFilter === tab.key ? 'active' : ''}`} onClick={() => setStatusFilter(tab.key)}>
            {tab.label} <span className="admin-filter-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <div className="search-input-wrapper" style={{ width: '100%', maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
          <AppIcon name="Search" size={18} className="text-muted" />
          <input className="header-search-input" placeholder={t.docSearchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'none', outline: 'none', width: '100%', color: 'var(--text)', fontSize: '13px' }} />
        </div>
      </div>

      {/* Documents Table */}
      <div className="admin-table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : paginatedDocs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.docNoResults}</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{lang === 'vi' ? 'Tài liệu' : 'Document'}</th>
                <th>{lang === 'vi' ? 'Loại' : 'Type'}</th>
                <th>{lang === 'vi' ? 'Người đăng' : 'Author'}</th>
                <th>{lang === 'vi' ? 'Trạng thái' : 'Status'}</th>
                <th style={{ textAlign: 'center' }}>{lang === 'vi' ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocs.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <Link href={`/documents/${doc.slug}`} target="_blank" className="post-title-link" style={{ fontWeight: 700, color: 'var(--text)', textDecoration: 'none', fontSize: '14px' }}>
                        {doc.title}
                      </Link>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} suppressHydrationWarning>
                        {doc.course_code || ''} {doc.academic_year ? `• ${doc.academic_year}` : ''} • {new Date(doc.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}
                      </span>
                    </div>
                  </td>
                  <td><span style={{ fontSize: '12px' }}>{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</span></td>
                  <td style={{ fontSize: '13px' }}>@{doc.username}</td>
                  <td>
                    <span className={`status-badge status-${doc.status}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                      <Link href={`/documents/edit/${doc.id}`} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} title={lang === 'vi' ? 'Sửa' : 'Edit'}>
                        <AppIcon name="Pencil" size={14} />
                      </Link>
                      {doc.status !== 'approved' && (
                        <button onClick={() => handleStatusChange(doc.id, 'approved')} disabled={actionLoading} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} title="Approve">
                          <AppIcon name="Check" size={14} />
                        </button>
                      )}
                      {doc.status !== 'rejected' && (
                        <button onClick={() => handleStatusChange(doc.id, 'rejected')} disabled={actionLoading} className="btn" style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--destructive)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} title="Reject">
                          <AppIcon name="X" size={14} />
                        </button>
                      )}
                      {doc.status !== 'hidden' && (
                        <button onClick={() => handleStatusChange(doc.id, 'hidden')} disabled={actionLoading} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} title="Hide">
                          <AppIcon name="EyeOff" size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(doc.id)} className="btn" style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', color: 'var(--destructive)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} title="Delete">
                        <AppIcon name="Trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="doc-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px', paddingBottom: '24px' }}>
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
    </div>
  );
}
