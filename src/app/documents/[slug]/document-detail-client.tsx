'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocumentRecord, User, LinkProvider } from '@/types';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { PROVIDER_INFO, RESOURCE_TYPE_INFO, isPreviewable, formatFileSize } from '@/lib/provider-utils';
import { AppIcon } from '@/components/ui/icon';
import { 
  GithubLogo, 
  GitlabLogo, 
  GoogleDriveLogo, 
  OnedriveLogo, 
  DropboxLogo, 
  MegaLogo, 
  HuggingfaceLogo, 
  CloudflareLogo, 
  AwsLogo 
} from '@/assets/providers';

// Helper to resolve official brand logos
function getProviderLogo(provider: LinkProvider, size = 16) {
  switch (provider) {
    case 'github_repo':
    case 'github_release':
      return <GithubLogo size={size} />;
    case 'gitlab':
      return <GitlabLogo size={size} />;
    case 'google_drive':
      return <GoogleDriveLogo size={size} />;
    case 'onedrive':
      return <OnedriveLogo size={size} />;
    case 'dropbox':
      return <DropboxLogo size={size} />;
    case 'mega':
      return <MegaLogo size={size} />;
    case 'huggingface':
      return <HuggingfaceLogo size={size} />;
    case 'cloudflare_r2':
      return <CloudflareLogo size={size} />;
    case 'aws_s3':
      return <AwsLogo size={size} />;
    default:
      return null;
  }
}

// Preview content renderer component (PDF, image, video, code, text, markdown)
const PreviewContentRenderer = ({ fileUrl, fileName, lang }: { fileUrl: string; fileName: string; lang: Language }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const previewInfo = isPreviewable(fileName);

  useEffect(() => {
    if (previewInfo.type === 'text' || previewInfo.type === 'markdown' || previewInfo.type === 'code') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      fetch(fileUrl)
        .then(res => {
          if (!res.ok) throw new Error(lang === 'vi' ? 'Lỗi tải nội dung preview' : 'Failed to load file content');
          return res.text();
        })
        .then(text => {
          setContent(text);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Error loading preview');
          setLoading(false);
        });
    }
  }, [fileUrl, previewInfo.type, lang]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)', gap: '12px' }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          border: '2px solid var(--border)', borderTopColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span>{lang === 'vi' ? 'Đang tải preview...' : 'Loading preview...'}</span>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#ef4444', padding: '20px' }}>
        <AppIcon name="AlertTriangle" size="md" className="mr-2" /> {error}
      </div>
    );
  }

  if (previewInfo.type === 'image') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', padding: '20px', overflow: 'auto' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={fileUrl} 
          alt={fileName} 
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }} 
        />
      </div>
    );
  }

  if (previewInfo.type === 'video') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', padding: '20px' }}>
        <video 
          src={fileUrl} 
          controls 
          style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }} 
        />
      </div>
    );
  }

  if (previewInfo.type === 'pdf') {
    return (
      <iframe 
        src={fileUrl} 
        title={fileName} 
        style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'white' }}
      />
    );
  }

  if (previewInfo.type === 'text' || previewInfo.type === 'code') {
    return (
      <div style={{ padding: '24px', height: '100%', overflow: 'auto', backgroundColor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'var(--font-mono, monospace)', fontSize: '13.5px', lineHeight: '1.6' }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{content}</pre>
      </div>
    );
  }

  if (previewInfo.type === 'markdown') {
    return (
      <div className="markdown-body" style={{ padding: '32px', height: '100%', overflow: 'auto', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.7' }}>{content}</pre>
      </div>
    );
  }

  // Fallback to Google Docs viewer for doc, docx, xls, etc.
  const absoluteUrl = typeof window !== 'undefined' ? `${window.location.origin}${fileUrl}` : '';
  const src = `https://docs.google.com/gview?url=${encodeURIComponent(absoluteUrl)}&embedded=true`;
  return (
    <iframe 
      src={src} 
      title={fileName} 
      style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'white' }}
    />
  );
};

interface Props {
  document: DocumentRecord;
  currentUser: User | null;
}

export default function DocumentDetailClient({ document: doc, currentUser }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [lang, setLang] = useState<Language>('en');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<{ file_name: string; file_url: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLanguageClient());
  }, []);

  const t = translations[lang] || translations.en;
  const isOwner = currentUser?.id === doc.author_id;
  const isAdmin = currentUser?.role === 'admin';
  const canEdit = isOwner || isAdmin;

  const resourceInfo = RESOURCE_TYPE_INFO[doc.resource_type] || { vi: doc.resource_type, en: doc.resource_type, color: '#6b7280' };

  const getSemesterLabel = (sem?: string) => {
    if (sem === '1') return t.docSemester1;
    if (sem === '2') return t.docSemester2;
    if (sem === 'he') return t.docSemesterSummer;
    return '';
  };

  const handleDownload = async (fileUrl: string) => {
    try {
      await fetch(`/api/documents/${doc.id}/download`, { method: 'POST' });
    } catch { /* ignore */ }
    const link = document.createElement('a');
    link.href = fileUrl;
    const parts = fileUrl.split('/');
    const rawName = parts[parts.length - 1];
    const cleanName = rawName.replace(/^\d+_[a-z0-9]+_/, '');
    link.download = decodeURIComponent(cleanName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!confirm(t.docDeleteConfirm)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(t.docDeleteSuccess, 'success');
        setTimeout(() => { router.push('/documents'); router.refresh(); }, 1500);
      } else {
        const data = await res.json();
        showToast(data.error || 'Error', 'error');
      }
    } catch {
      showToast('Error', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(t.linkCopied, 'success');
  };

  const openLightbox = (idx: number) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const prevImage = () => setLightboxIdx(idx => idx !== null && idx > 0 ? idx - 1 : idx);
  const nextImage = () => setLightboxIdx(idx => idx !== null && doc.images && idx < doc.images.length - 1 ? idx + 1 : idx);

  // Group metadata for clean display (NO icons, clean typography-first style)
  const metadataList = [
    { label: t.metaVersion, value: doc.version },
    { label: t.metaLanguage, value: doc.language },
    { label: t.metaFramework, value: doc.framework },
    { label: t.metaLicense, value: doc.license },
    { label: t.metaOsSupport, value: doc.os_support },
    { label: t.metaArchitecture, value: doc.architecture },
    { label: t.metaMaintainer, value: doc.maintainer },
    { label: t.metaReleaseDate, value: doc.release_date ? new Date(doc.release_date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US') : null },
  ].filter(m => m.value);

  const linksList = [
    { label: t.metaHomepage, value: doc.homepage },
    { label: t.metaOfficialWebsite, value: doc.official_website },
    { label: t.metaRepository, value: doc.repository_url },
    { label: t.metaIssues, value: doc.issues_url },
    { label: t.metaDocumentation, value: doc.documentation_url },
    { label: t.metaDemoUrl, value: doc.demo_url },
  ].filter(l => l.value);

  return (
    <div className="page-fade-in" style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Back Link */}
      <Link href="/documents" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', fontWeight: 600 }} className="back-link-general">
        <AppIcon name="ArrowLeft" size="sm" /> {lang === 'vi' ? 'Quay lại kho tài liệu' : 'Back to Documents'}
      </Link>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }} className="doc-detail-grid">
        
        {/* Left Column: Info & Assets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Document Header */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
            
            {/* Status badge for pending */}
            {doc.status === 'pending' && (
              <div style={{ marginBottom: '16px' }}>
                <span className="status-badge status-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <AppIcon name="Clock" size="xs" /> {lang === 'vi' ? 'Đang chờ duyệt' : 'Pending Review'}
                </span>
              </div>
            )}

            {/* Type + Semester badges (Minimal visual weight) */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span className="doc-type-badge" style={{ fontSize: '12px', fontWeight: 600, padding: '5px 12px', border: `1px solid ${resourceInfo.color}25`, background: `${resourceInfo.color}08`, color: resourceInfo.color }}>
                {lang === 'vi' ? resourceInfo.vi : resourceInfo.en}
              </span>
              {doc.semester && (
                <span className="doc-semester-badge" style={{ fontSize: '12px', padding: '5px 12px' }}>
                  {getSemesterLabel(doc.semester)}
                </span>
              )}
              {doc.academic_year && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {doc.academic_year}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.25, marginBottom: '12px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
              {doc.title}
            </h1>

            {/* Course Code */}
            {doc.course_code && (
              <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 700, marginBottom: '18px' }}>
                {lang === 'vi' ? 'Mã học phần' : 'Course Code'}: {doc.course_code}
              </div>
            )}

            {/* Description */}
            {doc.description && (
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px', whiteSpace: 'pre-line' }}>
                {doc.description}
              </p>
            )}

            {/* Meta Info Bar (Clean icons for metadata key fields only) */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)', padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <AppIcon name="User" size="xs" /> {doc.sharer_name || doc.username || 'Anonymous'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} suppressHydrationWarning>
                <AppIcon name="Calendar" size="xs" /> {new Date(doc.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <AppIcon name="Eye" size="xs" /> {doc.view_count + 1} {t.docViewCount}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <AppIcon name="Download" size="xs" /> {doc.download_count} {t.docDownloadCount}
              </span>
              {doc.major && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <AppIcon name="BookOpen" size="xs" /> {doc.major}
                </span>
              )}
            </div>

            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {doc.tags.map(tag => (
                  <span key={tag} className="doc-tag-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AppIcon name="Hash" size="xs" /> {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons (Action buttons keep clear clean icons) */}
            {canEdit && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link href={`/documents/edit/${doc.id}`} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <AppIcon name="Pencil" size="sm" /> {t.editDocument}
                </Link>
                <button onClick={handleDelete} disabled={deleting} className="btn" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--destructive)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <AppIcon name="Trash2" size="sm" /> {lang === 'vi' ? 'Xóa' : 'Delete'}
                </button>
              </div>
            )}
          </div>

          {/* Multi-Source Download Links */}
          {((doc.links && doc.links.length > 0) || (doc.files && doc.files.length > 0)) && (
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                {lang === 'vi' ? 'Nguồn tải xuống & Liên kết' : 'Download Sources & Links'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Uploaded Files */}
                {doc.files && doc.files.map(file => (
                  <div key={file.id} className="doc-file-download-item" style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', border: '1px solid var(--border)', borderRadius: '12px', gap: '14px' }}>
                    <AppIcon name="FileText" size="md" className="text-primary flex-shrink-0" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.file_name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {formatFileSize(file.file_size)} • {file.file_type.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {isPreviewable(file.file_name).type && (
                        <button 
                          onClick={() => setPreviewFile({ file_name: file.file_name, file_url: file.file_url })} 
                          className="btn btn-secondary" 
                          style={{ padding: '8px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <AppIcon name="Eye" size="xs" /> {t.docPreview}
                        </button>
                      )}
                      <button 
                        onClick={() => handleDownload(file.file_url)} 
                        className="btn btn-primary" 
                        style={{ padding: '8px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <AppIcon name="Download" size="xs" /> {t.docDownload}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Cloud & External Links (Strictly Badges/SVG brand logos) */}
                {doc.links && doc.links.map(link => {
                  const provider = link.provider;
                  const pInfo = PROVIDER_INFO[provider] || { label: 'Direct URL', color: '#6366f1', shortLabel: 'URL' };
                  const logo = getProviderLogo(provider, 16);
                  
                  return (
                    <div key={link.id} style={{
                      display: 'flex', alignItems: 'center', padding: '14px 18px',
                      border: '1px solid var(--border)', borderRadius: '12px', gap: '14px',
                      backgroundColor: 'var(--surface-hover)',
                    }}>
                      {/* Brand logo container */}
                      <span style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: logo ? 'var(--border)' : `${pInfo.color}15`, 
                        color: pInfo.color,
                        flexShrink: 0
                      }}>
                        {logo ? logo : <span style={{ fontSize: '10px', fontWeight: 800 }}>{pInfo.shortLabel.substring(0, 3)}</span>}
                      </span>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {link.label || pInfo.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px', fontFamily: 'var(--font-mono, monospace)' }}>
                          {link.url}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* Text badge */}
                        <span style={{
                          padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          marginRight: '8px',
                          display: 'inline-block'
                        }}>
                          {link.link_type === 'primary' ? 'Primary' : 'Mirror'}
                        </span>
                        
                        <a 
                          href={link.url} target="_blank" rel="noopener noreferrer"
                          className="btn btn-secondary" 
                          style={{ padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title={t.linkOpenBrowser}
                        >
                          <AppIcon name="ExternalLink" size="sm" />
                        </a>
                        <button 
                          onClick={() => copyToClipboard(link.url)}
                          className="btn btn-secondary" 
                          style={{ padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title={t.linkCopy}
                        >
                          <AppIcon name="Copy" size="sm" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Image Gallery */}
          {doc.images && doc.images.length > 0 && (
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {t.docImages} ({doc.images.length})
              </h3>
              <div className="doc-gallery">
                {doc.images.map((img, idx) => (
                  <div key={img.id} className="doc-gallery-item" onClick={() => openLightbox(idx)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt={`${doc.title} - ${idx + 1}`} className="doc-gallery-img" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Metadata & Side Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Metadata profiles (No icons, clean text specification layout) */}
          {metadataList.length > 0 && (
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-md)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px', marginTop: 0 }}>
                Specifications
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {metadataList.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', borderBottom: idx < metadataList.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: idx < metadataList.length - 1 ? '10px' : 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{m.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '2px', wordBreak: 'break-all' }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links & Channels (No icons, clean list) */}
          {linksList.length > 0 && (
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-md)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px', marginTop: 0 }}>
                Links & URLs
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {linksList.map((l, idx) => (
                  <a 
                    key={idx} href={l.value} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
                      borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)',
                      textDecoration: 'none', color: 'var(--text-secondary)', transition: 'var(--transition)',
                      fontSize: '12.5px', fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.color = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label}</span>
                    <AppIcon name="ExternalLink" size="xs" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Checksum & Hash values */}
          {(doc.checksum_sha256 || doc.checksum_md5) && (
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-md)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px', marginTop: 0 }}>
                Hashes & Verification
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {doc.checksum_sha256 && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>SHA-256</span>
                      <button 
                        onClick={() => copyToClipboard(doc.checksum_sha256 || '')}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '10px', fontWeight: 700 }}
                      >
                        {t.linkCopy}
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', wordBreak: 'break-all', fontFamily: 'var(--font-mono, monospace)', backgroundColor: 'var(--surface-hover)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      {doc.checksum_sha256}
                    </span>
                  </div>
                )}
                {doc.checksum_md5 && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>MD5</span>
                      <button 
                        onClick={() => copyToClipboard(doc.checksum_md5 || '')}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '10px', fontWeight: 700 }}
                      >
                        {t.linkCopy}
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', wordBreak: 'break-all', fontFamily: 'var(--font-mono, monospace)', backgroundColor: 'var(--surface-hover)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      {doc.checksum_md5}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && doc.images && doc.images[lightboxIdx] && (
        <div className="doc-lightbox" onClick={closeLightbox}>
          <button className="doc-lightbox-close" onClick={closeLightbox}><AppIcon name="X" size={24} /></button>
          {lightboxIdx > 0 && (
            <button className="doc-lightbox-nav doc-lightbox-prev" onClick={e => { e.stopPropagation(); prevImage(); }}>
              <AppIcon name="ChevronLeft" size={32} />
            </button>
          )}
          {doc.images && lightboxIdx < doc.images.length - 1 && (
            <button className="doc-lightbox-nav doc-lightbox-next" onClick={e => { e.stopPropagation(); nextImage(); }}>
              <AppIcon name="ChevronRight" size={32} />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={doc.images[lightboxIdx].image_url} alt="Preview" className="doc-lightbox-img" onClick={e => e.stopPropagation()} />
          <div className="doc-lightbox-counter">
            {lightboxIdx + 1} / {doc.images.length}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewFile && (
        <div 
          className="doc-lightbox" 
          style={{ backdropFilter: 'blur(8px)', padding: '24px' }}
          onClick={() => setPreviewFile(null)}
        >
          <div 
            style={{
              width: '92vw', height: '92vh',
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <AppIcon name="FileText" size="md" className="text-primary" />
                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewFile.file_name}
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => handleDownload(previewFile.file_url)} 
                  className="btn btn-primary" 
                  style={{ padding: '8px 16px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <AppIcon name="Download" size="xs" /> {t.docDownload}
                </button>
                <button 
                  onClick={() => setPreviewFile(null)} 
                  style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex', borderRadius: '50%' }}
                >
                  <AppIcon name="X" size={18} />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <PreviewContentRenderer fileUrl={previewFile.file_url} fileName={previewFile.file_name} lang={lang} />
            </div>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        @media (max-width: 768px) {
          .doc-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
