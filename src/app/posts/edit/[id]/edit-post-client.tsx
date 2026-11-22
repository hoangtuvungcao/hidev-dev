'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Post, Category } from '@/types';
import { Language } from '@/lib/i18n';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { AppIcon } from '@/components/ui/icon';

interface EditPostClientProps {
  post: Post;
  categories: Category[];
  lang: Language;
}

export default function EditPostClient({ post, categories, lang }: EditPostClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [title, setTitle] = useState(post.title);
  const [summary, setSummary] = useState(post.summary);
  const [content, setContent] = useState(post.content);
  const [link, setLink] = useState(post.link);
  const [thumbnail, setThumbnail] = useState(post.thumbnail || '');
  const [categoryId, setCategoryId] = useState(String(post.category_id));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          content,
          link,
          thumbnail,
          category_id: parseInt(categoryId)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lỗi cập nhật bài đăng');
      } else {
        const msg = data.pending
          ? (lang === 'vi' ? 'Cập nhật thành công! Bài viết đã được gửi lại cho Admin phê duyệt...' : 'Update successful! The post has been re-submitted for Admin approval...')
          : (lang === 'vi' ? 'Cập nhật thành công! Đang chuyển hướng...' : 'Update successful! Redirecting...');
        setSuccess(msg);
        showToast(msg, 'success');
        setTimeout(() => {
          router.push(data.pending ? '/profile' : `/posts/${data.slug}`);
          router.refresh();
        }, 2000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '24px' }}>
        <Link href="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          <AppIcon name="ArrowLeft" size="sm" /> {lang === 'vi' ? 'Quay lại Hồ sơ' : 'Back to Profile'}
        </Link>
      </div>

      <div className="admin-table-container">
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>
          {lang === 'vi' ? 'Chỉnh sửa bài đăng' : 'Edit Tool Details'}
        </h1>

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'var(--primary)', fontSize: '13.5px', marginBottom: '20px' }}>
            <AppIcon name="CheckCircle" size={18} /> {success}
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--destructive)', borderRadius: '8px', color: '#fca5a5', fontSize: '13.5px', marginBottom: '20px' }}>
            <AppIcon name="AlertTriangle" size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{lang === 'vi' ? 'Tiêu đề bài viết' : 'Post Title'}</label>
            <input 
              type="text" 
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{lang === 'vi' ? 'Chuyên mục' : 'Category'}</label>
            <select 
              className="form-select"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              required
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{lang === 'vi' ? 'Liên kết website (URL)' : 'Website URL'}</label>
            <input 
              type="url" 
              className="form-input"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{lang === 'vi' ? 'Ảnh đại diện sản phẩm (URL)' : 'Product Thumbnail URL'}</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-input"
                value={thumbnail}
                onChange={e => setThumbnail(e.target.value)}
                placeholder="https://example.com/thumbnail.png"
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AppIcon name="Upload" size="sm" />
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
            <span className="form-helper" style={{ display: 'block', marginTop: '6px' }}>
              {lang === 'vi' 
                ? 'Nhập link ảnh hoặc chọn một ảnh từ máy của bạn'
                : 'Enter an image link or choose an image file from your computer'}
            </span>
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
            <label className="form-label">{lang === 'vi' ? 'Mô tả ngắn' : 'Short Summary'}</label>
            <input 
              type="text" 
              className="form-input"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              maxLength={200}
              required
            />
            <span className="form-helper">
              {lang === 'vi' ? 'Tối đa 200 ký tự hiển thị trên danh sách.' : 'Max 200 characters to show on grids.'}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">{lang === 'vi' ? 'Mô tả chi tiết (Markdown)' : 'Detailed Description (Markdown)'}</label>
            <textarea 
              className="form-textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
            <span className="form-helper">
              {lang === 'vi' 
                ? 'Hỗ trợ định dạng Markdown (tiêu đề, danh sách, khối code,...) để mô tả chi tiết sản phẩm.' 
                : 'Supports full Markdown structure to describe your tool details.'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu thay đổi' : 'Save Changes')}
            </button>
            <Link href="/profile" className="btn btn-secondary">
              {lang === 'vi' ? 'Hủy' : 'Cancel'}
            </Link>
          </div>
        </form>
      </div>

    </div>
  );
}
