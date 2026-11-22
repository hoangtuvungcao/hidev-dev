'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Category } from '@/types';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { parseMarkdown } from '@/lib/markdown';
import Link from 'next/link';

export default function SubmitPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [lang, setLang] = useState<Language>('en');
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [link, setLink] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [content, setContent] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  useEffect(() => {
    const detected = detectLanguageClient();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detected);

    fetch('/api/users/profile')
      .then((res) => {
        if (!res.ok) {
          showToast(detected === 'vi' ? 'Bạn cần đăng nhập để đăng bài viết' : 'You must log in to create a post', 'error');
          router.push('/login');
        }
      })
      .catch(() => {
        showToast(detected === 'vi' ? 'Bạn cần đăng nhập để đăng bài viết' : 'You must log in to create a post', 'error');
        router.push('/login');
      });

    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
          if (data.length > 0) {
            setCategoryId(String(data[0].id));
          }
        }
      })
      .catch(err => console.error('Error fetching categories:', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    const formData = new FormData();
    formData.append('files', file);

    setLoading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.files && data.files.length > 0) {
        setThumbnail(data.files[0].file_url);
        showToast(lang === 'vi' ? 'Tải ảnh lên thành công!' : 'Image uploaded successfully!', 'success');
      } else {
        showToast(data.error || (lang === 'vi' ? 'Tải ảnh lên thất bại' : 'Failed to upload image'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(lang === 'vi' ? 'Lỗi kết nối khi tải ảnh' : 'Connection error during upload', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (!title || !summary || !link || !content || !categoryId) {
      showToast(lang === 'vi' ? 'Vui lòng nhập đầy đủ các thông tin bắt buộc' : 'Please fill in all required fields', 'error');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          link,
          thumbnail,
          categoryId,
          content,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || (lang === 'vi' ? 'Có lỗi xảy ra khi gửi bài' : 'An error occurred while submitting'), 'error');
      } else {
        showToast(
          lang === 'vi' 
            ? 'Gửi bài viết thành công! Đang chuyển hướng...' 
            : 'Submission successful! Redirecting...', 
          'success'
        );
        setSuccessMsg(data.message);
        setTitle('');
        setSummary('');
        setLink('');
        setThumbnail('');
        setContent('');
        
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 2000);
      }
    } catch (err) {
      console.error('Submit post error:', err);
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ, vui lòng thử lại' : 'Server connection error, please try again', 'error');
    } finally {
      setLoading(false);
    }
  };

  const t = translations[lang] || translations.en;

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 32px',
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      boxShadow: 'var(--shadow-lg)'
    }} className="page-fade-in">
      <Link href="/" className="back-link-general" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', fontWeight: 600 }}>
        &larr; {lang === 'vi' ? 'Quay lại trang chủ' : 'Back to Home'}
      </Link>

      <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>
        {lang === 'vi' ? 'Đăng bài viết mới' : 'Create a New Post'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px' }}>
        {lang === 'vi' 
          ? 'Chia sẻ kiến thức, công cụ, tài nguyên hữu ích hoặc bài viết chất lượng cho cộng đồng.'
          : 'Share knowledge, tools, resources, or quality content with the developer community.'}
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

      {successMsg && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid var(--primary)',
          color: 'var(--primary)',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '24px'
        }}>
          🎉 {successMsg} {lang === 'vi' ? 'Đang chuyển hướng về trang chủ...' : 'Redirecting to homepage...'}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="title">{t.postTitle}</label>
          <input
            type="text"
            id="title"
            className="form-input"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={lang === 'vi' ? 'Ví dụ: Hướng dẫn sử dụng React Hooks...' : 'E.g. Getting Started with React Hooks...'}
            disabled={loading}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="categoryId">{t.categorySelect}</label>
            <select
              id="categoryId"
              className="form-select"
              required
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              disabled={loading}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="link">{t.postLink}</label>
            <input
              type="url"
              id="link"
              className="form-input"
              required
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://example.com"
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="thumbnail">{t.postThumbnail}</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              id="thumbnail"
              className="form-input"
              value={thumbnail}
              onChange={e => setThumbnail(e.target.value)}
              placeholder="https://example.com/image.jpg"
              disabled={loading}
              style={{ flex: 1 }}
            />
            <label 
              className="btn btn-secondary" 
              style={{ 
                margin: 0, 
                padding: '12px 18px', 
                whiteSpace: 'nowrap', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              {lang === 'vi' ? 'Chọn file' : 'Choose file'}
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                style={{ display: 'none' }}
                disabled={loading}
              />
            </label>
          </div>
          <span className="form-helper">{lang === 'vi' ? 'Nhập link ảnh hoặc chọn một ảnh từ máy của bạn' : 'Enter an image link or choose an image file from your computer'}</span>
          {thumbnail && (
            <div style={{ marginTop: '10px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={thumbnail} 
                alt="Thumbnail Preview" 
                style={{ maxHeight: '100px', borderRadius: '8px', border: '1px solid var(--border)' }} 
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="summary">{t.postSummary}</label>
          <input
            type="text"
            id="summary"
            className="form-input"
            required
            maxLength={150}
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder={lang === 'vi' ? 'Mô tả ngắn gọn nội dung bài viết...' : 'Brief summary of your post...'}
            disabled={loading}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="form-label" htmlFor="content" style={{ margin: 0 }}>{t.postContent}</label>
            
            {/* Write/Preview Mode Toggle */}
            <div className="preview-toggle-container">
              <button 
                type="button" 
                className={`preview-toggle-btn ${mode === 'write' ? 'active' : ''}`}
                onClick={() => setMode('write')}
              >
                {lang === 'vi' ? 'Viết bài' : 'Write'}
              </button>
              <button 
                type="button" 
                className={`preview-toggle-btn ${mode === 'preview' ? 'active' : ''}`}
                onClick={() => setMode('preview')}
              >
                {lang === 'vi' ? 'Xem trước' : 'Preview'}
              </button>
            </div>
          </div>

          {mode === 'write' ? (
            <textarea
              id="content"
              className="form-textarea"
              required
              rows={10}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={lang === 'vi' ? '# Giới thiệu\n\nMô tả chi tiết nội dung bài viết, hướng dẫn và thông tin hữu ích...' : '# Introduction\n\nWrite your post content with details, instructions and useful information...'}
              disabled={loading}
            ></textarea>
          ) : (
            <div 
              className="form-input markdown-body" 
              style={{ 
                minHeight: '220px', 
                maxHeight: '400px', 
                overflowY: 'auto', 
                backgroundColor: 'var(--surface-hover)', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid var(--border)' 
              }}
              dangerouslySetInnerHTML={{ __html: parseMarkdown(content) || `<p style="color:var(--text-muted);font-style:italic">${lang === 'vi' ? 'Nội dung trống' : 'Content is empty'}</p>` }}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => router.back()}
            disabled={loading}
          >
            {t.cancel}
          </button>
          <button 
            type="submit" 
            className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} 
            disabled={loading}
          >
            {loading ? '' : t.sendModeration}
          </button>
        </div>
      </form>
    </div>
  );
}
