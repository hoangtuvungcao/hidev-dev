'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { DocumentRecord, ResourceType, LinkProvider, DocumentLink } from '@/types';
import { detectProvider, PROVIDER_INFO, RESOURCE_TYPE_INFO } from '@/lib/provider-utils';
import Link from 'next/link';
import { AppIcon } from '@/components/ui/icon';

export default function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [lang, setLang] = useState<Language>('en');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [docId, setDocId] = useState<number>(0);

  // Form fields
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  const [docType, setDocType] = useState('tai_lieu_tham_khao');
  const [resourceType, setResourceType] = useState<ResourceType>('upload_file');
  const [description, setDescription] = useState('');
  const [sharerName, setSharerName] = useState('');
  const [major, setMajor] = useState('Công nghệ Thông tin');

  // Extended metadata
  const [version, setVersion] = useState('');
  const [language, setLanguage] = useState('');
  const [framework, setFramework] = useState('');
  const [license, setLicense] = useState('');
  const [homepage, setHomepage] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [checksumSha256, setChecksumSha256] = useState('');

  // Multi-source links
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [linkUrl, setLinkUrl] = useState('');

  // Collapsible sections
  const [showAcademicDetails, setShowAcademicDetails] = useState(false);
  const [showAdvancedMeta, setShowAdvancedMeta] = useState(false);

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Images & Files
  const [images, setImages] = useState<Array<{ image_url: string; sort_order: number; preview?: string }>>([]);
  const [files, setFiles] = useState<Array<{ file_name: string; file_url: string; file_size: number; file_type: string }>>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchDocument = async (id: number) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) { router.push('/documents'); return; }
      const doc: DocumentRecord = await res.json();
      setTitle(doc.title);
      setCourseCode(doc.course_code || '');
      setAcademicYear(doc.academic_year || '');
      setSemester(doc.semester || '');
      setDocType(doc.doc_type || 'tai_lieu_tham_khao');
      setResourceType(doc.resource_type || 'upload_file');
      setDescription(doc.description || '');
      setSharerName(doc.sharer_name || '');
      setMajor(doc.major || 'Công nghệ Thông tin');
      setTags(doc.tags || []);
      setImages((doc.images || []).map((img, i) => ({ image_url: img.image_url, sort_order: img.sort_order ?? i })));
      setFiles((doc.files || []).map(f => ({ file_name: f.file_name, file_url: f.file_url, file_size: f.file_size || 0, file_type: f.file_type })));
      setLinks((doc.links || []).map(l => ({ url: l.url, provider: l.provider || detectProvider(l.url), link_type: l.link_type || 'primary', label: l.label })));

      // Extended metadata
      setVersion(doc.version || '');
      setLanguage(doc.language || '');
      setFramework(doc.framework || '');
      setLicense(doc.license || '');
      setHomepage(doc.homepage || '');
      setRepositoryUrl(doc.repository_url || '');
      setDocumentationUrl(doc.documentation_url || '');
      setDemoUrl(doc.demo_url || '');
      setChecksumSha256(doc.checksum_sha256 || '');

      if (doc.course_code || doc.academic_year || doc.semester || doc.sharer_name) {
        setShowAcademicDetails(true);
      }
      if (doc.version || doc.language || doc.framework || doc.license || doc.repository_url || doc.demo_url) {
        setShowAdvancedMeta(true);
      }
    } catch {
      showToast('Error loading document', 'error');
      router.push('/documents');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    setLang(detectLanguageClient());
    params.then(({ id }) => {
      const parsed = parseInt(id);
      setDocId(parsed);
      fetchDocument(parsed);
    });
  }, [params]);

  const t = translations[lang] || translations.en;

  // Tag Handlers
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagInput('');
  };
  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  // Link Handlers
  const addLink = () => {
    if (!linkUrl.trim()) return;
    const provider = detectProvider(linkUrl);
    setLinks(prev => [...prev, {
      url: linkUrl.trim(),
      provider,
      link_type: links.length === 0 ? 'primary' : `mirror_${links.length}` as any,
      label: PROVIDER_INFO[provider]?.label || '',
    }]);
    setLinkUrl('');
  };
  const removeLink = (idx: number) => setLinks(links.filter((_, i) => i !== idx));

  // Upload Handler (Combined for images and files)
  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadingFiles(true);
    try {
      for (const file of Array.from(fileList)) {
        const isImage = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);
        const formData = new FormData();
        formData.append('files', file);
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.success && data.files.length > 0) {
            const uploaded = data.files[0];
            if (isImage) {
              setImages(prev => [...prev, { image_url: uploaded.file_url, sort_order: prev.length, preview: URL.createObjectURL(file) }]);
            } else {
              setFiles(prev => [...prev, uploaded]);
            }
          } else {
            showToast(data.error || `Upload "${file.name}" failed`, 'error');
          }
        } catch {
          showToast(`Lỗi upload "${file.name}"`, 'error');
        }
      }
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeImage = (idx: number) => setImages(images.filter((_, i) => i !== idx));
  const removeFile = (idx: number) => setFiles(files.filter((_, i) => i !== idx));

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !docType) {
      showToast(lang === 'vi' ? 'Vui lòng nhập tên tài liệu và chọn loại tài liệu' : 'Please enter title and document type', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, course_code: courseCode || null, academic_year: academicYear || null,
          semester: semester || null, doc_type: docType, resource_type: resourceType,
          description: description || null, sharer_name: sharerName || null, major, tags,
          images: images.map((img, i) => ({ image_url: img.image_url, sort_order: i })),
          files, links,
          version: version || null, language: language || null, framework: framework || null,
          license: license || null, homepage: homepage || null, repository_url: repositoryUrl || null,
          documentation_url: documentationUrl || null, demo_url: demoUrl || null,
          checksum_sha256: checksumSha256 || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Error', 'error');
      } else {
        showToast(t.docUpdateSuccess || 'Cập nhật tài liệu thành công!', 'success');
        setTimeout(() => { router.push('/documents'); router.refresh(); }, 1200);
      }
    } catch {
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resourceTypesList: ResourceType[] = ['upload_file', 'external_link', 'git_repository', 'cloud_storage', 'documentation', 'demo_website', 'project'];

  if (fetchLoading) {
    return (
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: '200px', height: '24px', margin: '0 auto 16px auto' }} />
        <div className="skeleton" style={{ width: '100%', height: '350px', borderRadius: '12px' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }} className="page-fade-in">
      <Link href="/documents" className="back-link-general" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '20px', fontSize: '14px', fontWeight: 600 }}>
        <AppIcon name="ArrowLeft" size="sm" /> {lang === 'vi' ? 'Quay lại kho tài liệu' : 'Back to Documents'}
      </Link>

      <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.02em' }}>
        {t.editDocument}
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>
        {lang === 'vi' ? 'Chỉnh sửa thông tin tài liệu, tệp đính kèm và tài nguyên chia sẻ.' : 'Edit document details, files and resource links.'}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Title */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="doc-title">{t.docCourseName} *</label>
          <input type="text" id="doc-title" className="form-input" required value={title} onChange={e => setTitle(e.target.value)} placeholder={lang === 'vi' ? 'Tên tài liệu / Dự án' : 'Document Title'} disabled={loading} />
        </div>

        {/* Document Type & Resource Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="doc-type">{t.docType} *</label>
            <select id="doc-type" className="form-select" required value={docType} onChange={e => setDocType(e.target.value)} disabled={loading}>
              <option value="de_thi">{t.docFilterExam}</option>
              <option value="de_cuong">{t.docFilterSyllabus}</option>
              <option value="slide">{t.docFilterSlide}</option>
              <option value="giao_trinh">{t.docFilterTextbook}</option>
              <option value="tai_lieu_tham_khao">{t.docFilterReference}</option>
              <option value="bao_cao">{t.docFilterReport}</option>
              <option value="nghien_cuu">{t.docFilterResearch}</option>
              <option value="khac">{t.docFilterOther}</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="resource-type">{t.resourceType}</label>
            <select id="resource-type" className="form-select" value={resourceType} onChange={e => setResourceType(e.target.value as ResourceType)} disabled={loading}>
              {resourceTypesList.map(rt => {
                const info = RESOURCE_TYPE_INFO[rt] || { vi: rt, en: rt };
                return <option key={rt} value={rt}>{lang === 'vi' ? info.vi : info.en}</option>;
              })}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="doc-desc">{t.docDescription}</label>
          <textarea id="doc-desc" className="form-textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder={lang === 'vi' ? 'Mô tả tóm tắt nội dung tài liệu...' : 'Brief description of the document...'} disabled={loading} style={{ minHeight: '76px' }} />
        </div>

        {/* Upload Files & Screenshots */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{lang === 'vi' ? 'Tệp đính kèm & Ảnh xem trước' : 'Attached Files & Screenshots'}</label>
          <div
            className={`doc-upload-zone ${dragOver ? 'active' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
            onClick={() => uploadInputRef.current?.click()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '24px', cursor: 'pointer', borderRadius: '12px' }}
          >
            <AppIcon name="UploadCloud" size="lg" className="text-primary" />
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              {lang === 'vi' ? 'Nhấn hoặc kéo thả tệp (PDF, Word, ZIP, Ảnh...) vào đây' : 'Click or drop files (PDF, Word, ZIP, Images...) here'}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Tải thêm tệp hoặc thay đổi các tệp hiện tại bên dưới</p>
          </div>
          <input ref={uploadInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />

          {uploadingFiles && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
              ⏳ {lang === 'vi' ? 'Đang tải tệp lên...' : 'Uploading files...'}
            </div>
          )}

          {/* Render Files & Images */}
          {(files.length > 0 || images.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {files.map((file, idx) => (
                <div key={`file-${idx}`} className="doc-file-item" style={{ padding: '8px 12px', borderRadius: '8px' }}>
                  <AppIcon name="FileText" size="sm" className="text-primary" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatFileSize(file.file_size)} • {file.file_type.toUpperCase()}</div>
                  </div>
                  <button type="button" onClick={() => removeFile(idx)} style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                    <AppIcon name="Trash2" size="sm" />
                  </button>
                </div>
              ))}

              {images.map((img, idx) => (
                <div key={`img-${idx}`} className="doc-image-preview-item" style={{ padding: '6px 12px', borderRadius: '8px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview || img.image_url} alt={`Preview ${idx + 1}`} className="doc-image-preview-thumb" style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {img.image_url.split('/').pop()} (Ảnh minh họa)
                  </span>
                  <button type="button" onClick={() => removeImage(idx)} style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                    <AppIcon name="Trash2" size="sm" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Source Link */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{lang === 'vi' ? 'Link tải từ bên ngoài (Google Drive, GitHub, OneDrive...)' : 'External Source Link'}</label>
          
          {links.length > 0 && (
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {links.map((link, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-alt)', fontSize: '12px' }}>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: `${PROVIDER_INFO[link.provider]?.color || '#6366f1'}15`, color: PROVIDER_INFO[link.provider]?.color || '#6366f1' }}>
                    {PROVIDER_INFO[link.provider]?.shortLabel || link.provider}
                  </span>
                  <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.url}</span>
                  <button type="button" onClick={() => removeLink(idx)} style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                    <AppIcon name="X" size="sm" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="form-input"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
              placeholder="https://drive.google.com/file/d/... hoặc https://github.com/..."
              disabled={loading}
              style={{ fontSize: '13px' }}
            />
            <button type="button" className="btn btn-secondary" onClick={addLink} style={{ padding: '8px 14px', flexShrink: 0, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <AppIcon name="Plus" size="xs" /> {lang === 'vi' ? 'Thêm link' : 'Add Link'}
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t.docTags}</label>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {tags.map(tag => (
                <span key={tag} className="doc-tag-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 2px', display: 'inline-flex', alignItems: 'center' }}>
                    <AppIcon name="X" size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input className="form-input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder={t.docTagsPlaceholder} disabled={loading} style={{ fontSize: '13px' }} />
            <button type="button" className="btn btn-secondary" onClick={addTag} style={{ padding: '8px 14px', flexShrink: 0 }}>
              <AppIcon name="Plus" size="sm" />
            </button>
          </div>
        </div>

        {/* Collapsible Academic Details */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={() => setShowAcademicDetails(!showAcademicDetails)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ transform: showAcademicDetails ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s', display: 'inline-flex' }}>▶</span>
            {lang === 'vi' ? 'Thông tin học phần & Người chia sẻ (Tùy chọn)' : 'Academic Details & Sharer (Optional)'}
          </button>

          {showAcademicDetails && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>{t.docCourseCode}</label>
                <input type="text" className="form-input" value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="CSE301" disabled={loading} style={{ fontSize: '13px' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>{t.docAcademicYear}</label>
                <input type="text" className="form-input" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2024-2025" disabled={loading} style={{ fontSize: '13px' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>{t.docSemester}</label>
                <select className="form-select" value={semester} onChange={e => setSemester(e.target.value)} disabled={loading} style={{ fontSize: '13px' }}>
                  <option value="">{lang === 'vi' ? '-- Chọn --' : '-- Select --'}</option>
                  <option value="1">{t.docSemester1}</option>
                  <option value="2">{t.docSemester2}</option>
                  <option value="he">{t.docSemesterSummer}</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>{t.docMajor}</label>
                <input type="text" className="form-input" value={major} onChange={e => setMajor(e.target.value)} disabled={loading} style={{ fontSize: '13px' }} />
              </div>
              <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>{t.docSharerName}</label>
                <input type="text" className="form-input" value={sharerName} onChange={e => setSharerName(e.target.value)} placeholder={lang === 'vi' ? 'Tên hiển thị người chia sẻ' : 'Sharer display name'} disabled={loading} style={{ fontSize: '13px' }} />
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Advanced Technical Metadata */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={() => setShowAdvancedMeta(!showAdvancedMeta)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ transform: showAdvancedMeta ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s', display: 'inline-flex' }}>▶</span>
            {lang === 'vi' ? 'Thông tin kỹ thuật dự án / Mã nguồn (Version, Git, License...)' : 'Advanced Technical Metadata'}
          </button>

          {showAdvancedMeta && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <input className="form-input" value={version} onChange={e => setVersion(e.target.value)} placeholder="Version (1.0.0)" disabled={loading} style={{ fontSize: '13px' }} />
              <input className="form-input" value={language} onChange={e => setLanguage(e.target.value)} placeholder="Language (JavaScript, Python...)" disabled={loading} style={{ fontSize: '13px' }} />
              <input className="form-input" value={framework} onChange={e => setFramework(e.target.value)} placeholder="Framework (React, Django...)" disabled={loading} style={{ fontSize: '13px' }} />
              <input className="form-input" value={license} onChange={e => setLicense(e.target.value)} placeholder="License (MIT, Apache 2.0)" disabled={loading} style={{ fontSize: '13px' }} />
              <input className="form-input" value={repositoryUrl} onChange={e => setRepositoryUrl(e.target.value)} placeholder="Repository URL (GitHub, GitLab)" disabled={loading} style={{ fontSize: '13px' }} />
              <input className="form-input" value={demoUrl} onChange={e => setDemoUrl(e.target.value)} placeholder="Demo URL (https://...)" disabled={loading} style={{ fontSize: '13px' }} />
              <input className="form-input" value={homepage} onChange={e => setHomepage(e.target.value)} placeholder="Homepage URL" disabled={loading} style={{ fontSize: '13px' }} />
              <input className="form-input" value={documentationUrl} onChange={e => setDocumentationUrl(e.target.value)} placeholder="Documentation URL" disabled={loading} style={{ fontSize: '13px' }} />
              <input className="form-input" value={checksumSha256} onChange={e => setChecksumSha256(e.target.value)} placeholder="SHA-256 Checksum" disabled={loading} style={{ fontSize: '12px', fontFamily: 'monospace', gridColumn: 'span 2' }} />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()} disabled={loading}>
            {t.cancel}
          </button>
          <button type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} disabled={loading}>
            {loading ? '' : (lang === 'vi' ? 'Lưu thay đổi' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  );
}
