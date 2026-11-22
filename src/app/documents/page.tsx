'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DocumentRecord } from '@/types';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { RESOURCE_TYPE_INFO } from '@/lib/provider-utils';
import { AppIcon } from '@/components/ui/icon';

const DOC_TYPE_MAP: Record<string, { vi: string; en: string }> = {
  de_thi: { vi: 'Đề thi', en: 'Exam' },
  de_cuong: { vi: 'Đề cương', en: 'Syllabus' },
  slide: { vi: 'Slide', en: 'Slide' },
  giao_trinh: { vi: 'Giáo trình', en: 'Textbook' },
  tai_lieu_tham_khao: { vi: 'Tham khảo', en: 'Reference' },
  bao_cao: { vi: 'Báo cáo', en: 'Report' },
  nghien_cuu: { vi: 'Nghiên cứu', en: 'Research' },
  khac: { vi: 'Khác', en: 'Other' },
};

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<Language>('en');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [docTypeFilter, setDocTypeFilter] = useState(searchParams.get('doc_type') || '');
  const [resourceTypeFilter, setResourceTypeFilter] = useState(searchParams.get('resource_type') || '');
  const [semesterFilter, setSemesterFilter] = useState(searchParams.get('semester') || '');
  const [yearFilter, setYearFilter] = useState(searchParams.get('academic_year') || '');
  const [showFilters, setShowFilters] = useState(false);

  const LIMIT = 20;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLanguageClient());
  }, []);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (docTypeFilter) params.set('doc_type', docTypeFilter);
      if (resourceTypeFilter) params.set('resource_type', resourceTypeFilter);
      if (semesterFilter) params.set('semester', semesterFilter);
      if (yearFilter) params.set('academic_year', yearFilter);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));

      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [search, docTypeFilter, resourceTypeFilter, semesterFilter, yearFilter, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocuments();
  }, [fetchDocuments]);

  const t = translations[lang] || translations.en;
  const totalPages = Math.ceil(total / LIMIT);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchDocuments();
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDocTypeFilter('');
    setResourceTypeFilter('');
    setSemesterFilter('');
    setYearFilter('');
    setPage(1);
  };

  const getSemesterLabel = (sem: string) => {
    if (sem === '1') return t.docSemester1;
    if (sem === '2') return t.docSemester2;
    if (sem === 'he') return t.docSemesterSummer;
    return sem;
  };
  return (
    <div className="page-fade-in">
      {/* Hero Banner */}
      <div className="hero-banner" style={{ marginBottom: '32px', padding: '48px 32px' }}>
        <div className="hero-content">
          <span className="hero-badge">{t.documentsHeroBadge}</span>
          <h1 className="hero-title" style={{ fontSize: '38px' }}>
            {t.documentsTitle}
          </h1>
          <p className="hero-subtitle">{t.documentsSubtitle}</p>
          
          {/* Search Bar */}
          <div style={{ width: '100%', maxWidth: '600px', marginTop: '16px' }}>
            <div className="doc-search-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AppIcon name="Search" size="md" className="text-muted flex-shrink-0" />
              <input
                type="text"
                className="doc-search-input"
                placeholder={t.docSearchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearch}
                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', color: 'var(--text)' }}
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                  <AppIcon name="X" size="sm" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Filters + Submit Button */}
      <div className="doc-toolbar">
        <div className="doc-toolbar-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
          
          {/* Resource Type filters row (No Emojis, clean badges) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
            <button
              className={`doc-type-tab ${!resourceTypeFilter ? 'active' : ''}`}
              onClick={() => { setResourceTypeFilter(''); setPage(1); }}
              style={{ padding: '8px 14px', borderRadius: '10px' }}
            >
              {lang === 'vi' ? 'Tất cả loại tài nguyên' : 'All Resources'}
            </button>
            {[
              { type: 'project', vi: 'Dự án', en: 'Projects' },
              { type: 'git_repository', vi: 'Mã nguồn / Git', en: 'Git Repos' },
              { type: 'upload_file', vi: 'File đính kèm', en: 'Files' },
              { type: 'cloud_storage', vi: 'Cloud Storage', en: 'Cloud Storages' },
              { type: 'documentation', vi: 'Tài liệu', en: 'Docs' },
              { type: 'demo_website', vi: 'Demo Site', en: 'Demos' },
              { type: 'api_endpoint', vi: 'API Endpoint', en: 'APIs' },
            ].map(item => (
              <button
                key={item.type}
                className={`doc-type-tab ${resourceTypeFilter === item.type ? 'active' : ''}`}
                onClick={() => { setResourceTypeFilter(item.type); setPage(1); }}
                style={{ padding: '8px 14px', borderRadius: '10px' }}
              >
                {lang === 'vi' ? item.vi : item.en}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {/* Doc Type Filter Tabs */}
            <div className="doc-type-tabs">
              <button
                className={`doc-type-tab ${!docTypeFilter ? 'active' : ''}`}
                onClick={() => { setDocTypeFilter(''); setPage(1); }}
              >
                {t.docFilterAll}
              </button>
              {Object.entries(DOC_TYPE_MAP).map(([key, val]) => (
                <button
                  key={key}
                  className={`doc-type-tab ${docTypeFilter === key ? 'active' : ''}`}
                  onClick={() => { setDocTypeFilter(key); setPage(1); }}
                >
                  {lang === 'vi' ? val.vi : val.en}
                </button>
              ))}
            </div>

            {/* Advanced Filters Toggle */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '13px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
                onClick={() => setShowFilters(!showFilters)}
              >
                <AppIcon name="Filter" size="sm" />
                {showFilters ? (lang === 'vi' ? 'Ẩn bộ lọc' : 'Hide Filters') : (lang === 'vi' ? 'Bộ lọc' : 'Filters')}
              </button>

              <Link href="/documents/submit" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <AppIcon name="Plus" size="sm" /> {t.submitDocument}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="doc-filters-panel">
          <div className="doc-filter-group">
            <label className="form-label" style={{ fontSize: '12px' }}>{t.docSemester}</label>
            <select className="form-select" value={semesterFilter} onChange={e => { setSemesterFilter(e.target.value); setPage(1); }} style={{ padding: '8px 12px', fontSize: '13px' }}>
              <option value="">{t.docFilterAll}</option>
              <option value="1">{t.docSemester1}</option>
              <option value="2">{t.docSemester2}</option>
              <option value="he">{t.docSemesterSummer}</option>
            </select>
          </div>
          <div className="doc-filter-group">
            <label className="form-label" style={{ fontSize: '12px' }}>{t.docAcademicYear}</label>
            <input
              className="form-input"
              placeholder="2024-2025"
              value={yearFilter}
              onChange={e => { setYearFilter(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', fontSize: '13px' }}
            />
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '12px', alignSelf: 'flex-end' }}
            onClick={clearFilters}
          >
            {lang === 'vi' ? 'Xóa bộ lọc' : 'Clear Filters'}
          </button>
        </div>
      )}

      {/* Results info */}
      <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        {total > 0 ? (
          <span>{lang === 'vi' ? `Hiển thị ${documents.length} / ${total} tài nguyên` : `Showing ${documents.length} of ${total} resources`}</span>
        ) : !loading ? (
          <span>{t.docNoResults}</span>
        ) : null}
      </div>

      {/* Document Cards Grid */}
      {loading ? (
        <div className="posts-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-thumb" style={{ width: '100%', height: '140px', borderRadius: '12px' }} />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text-short" />
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <AppIcon name="FolderOpen" size={48} className="text-muted" style={{ margin: '0 auto' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '16px' }}>{t.docNoResults}</p>
          <Link href="/documents/submit" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <AppIcon name="Plus" size="sm" /> {t.submitDocument}
          </Link>
        </div>
      ) : (
        <div className="posts-grid">
          {documents.map(doc => {
            const rtInfo = RESOURCE_TYPE_INFO[doc.resource_type] || { vi: 'Tài liệu', en: 'Doc', color: 'var(--primary)' };
            return (
              <Link href={`/documents/${doc.slug}`} key={doc.id} style={{ textDecoration: 'none' }}>
                <div className="doc-card" style={{ borderTop: `4px solid ${rtInfo.color}` }}>
                  {/* Image Preview */}
                  {doc.images && doc.images.length > 0 ? (
                    <div className="doc-card-image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doc.images[0].image_url}
                        alt={doc.title}
                        style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '0 0 12px 12px' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {doc.images.length > 1 && (
                        <span className="doc-card-image-count" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                          <AppIcon name="Image" size={12} /> +{doc.images.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="doc-card-image-placeholder" style={{ background: `${rtInfo.color}05`, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: rtInfo.color, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {lang === 'vi' ? rtInfo.vi : rtInfo.en}
                      </span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="doc-card-body">
                    {/* Type Badge */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span className="doc-type-badge" style={{ backgroundColor: `${rtInfo.color}10`, color: rtInfo.color, borderColor: `${rtInfo.color}20` }}>
                        {lang === 'vi' ? rtInfo.vi : rtInfo.en}
                      </span>
                      {doc.semester && (
                        <span className="doc-semester-badge">{getSemesterLabel(doc.semester)}</span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="doc-card-title">{doc.title}</h3>

                    {/* Meta info (Typography-first, no emojis) */}
                    <div className="doc-card-meta" style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      {doc.course_code && <span className="doc-meta-item">{doc.course_code}</span>}
                      {doc.academic_year && <span className="doc-meta-item">{doc.academic_year}</span>}
                      {doc.version && <span className="doc-meta-item">v{doc.version}</span>}
                    </div>

                    {/* Description */}
                    {doc.description && (
                      <p className="doc-card-desc">{doc.description.length > 100 ? doc.description.substring(0, 100) + '...' : doc.description}</p>
                    )}

                    {/* Tags */}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="doc-card-tags">
                        {doc.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="doc-tag">#{tag}</span>
                        ))}
                        {doc.tags.length > 3 && <span className="doc-tag">+{doc.tags.length - 3}</span>}
                      </div>
                    )}

                    {/* Footer Stats (Clean AppIcons for downloads/views) */}
                    <div className="doc-card-footer">
                      <span className="doc-card-stat" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AppIcon name="Eye" size={12} /> {doc.view_count}
                      </span>
                      <span className="doc-card-stat" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AppIcon name="Download" size={12} /> {doc.download_count}
                      </span>
                      <span className="doc-card-date" suppressHydrationWarning>
                        {new Date(doc.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="doc-pagination">
          <button
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            ← {lang === 'vi' ? 'Trước' : 'Previous'}
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {lang === 'vi' ? `Trang ${page} / ${totalPages}` : `Page ${page} of ${totalPages}`}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            {lang === 'vi' ? 'Tiếp' : 'Next'} →
          </button>
        </div>
      )}
    </div>
  );
}
