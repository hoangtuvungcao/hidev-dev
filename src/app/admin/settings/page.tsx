'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { AppIcon } from '@/components/ui/icon';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [lang, setLang] = useState<Language>('en');
  
  const [settings, setSettings] = useState({
    site_name: '',
    site_domain: '',
    site_email: '',
    site_phone: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    site_logo: '',
    site_icon: '',
    footer_text: '',
    qr_donation: '',
  });

  const [qrMode, setQrMode] = useState<'upload' | 'url'>('url');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLanguageClient());

    fetch('/api/admin/settings')
      .then(res => {
        if (res.status === 403) {
          router.push('/');
          return;
        }
        return res.json();
      })
      .then(data => {
        if (data && typeof data === 'object') {
          setSettings(prev => ({ ...prev, ...data }));
          
          // Auto-detect QR mode based on initial value
          const qrVal = data.qr_donation || '';
          if (qrVal.startsWith('/') && !qrVal.startsWith('//')) {
            setQrMode('upload');
          } else if (qrVal.startsWith('https://')) {
            setQrMode('url');
          } else {
            setQrMode('upload'); // default to upload
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching settings:', err);
        setError('Không thể tải cấu hình từ database');
        setLoading(false);
      });
  }, [router]);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    const formData = new FormData();
    formData.append('files', file);

    setUploadingQr(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.files && data.files.length > 0) {
        setSettings(prev => ({ ...prev, qr_donation: data.files[0].file_url }));
        showToast(lang === 'vi' ? 'Tải mã QR lên thành công!' : 'QR image uploaded successfully!', 'success');
      } else {
        showToast(data.error || (lang === 'vi' ? 'Tải ảnh lên thất bại' : 'Failed to upload image'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(lang === 'vi' ? 'Lỗi kết nối khi tải ảnh' : 'Connection error during upload', 'error');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(
          lang === 'vi' ? 'Đã cập nhật cấu hình website thành công!' : 'Website settings updated successfully!',
          'success'
        );
      } else {
        showToast(data.error || 'Cập nhật thất bại', 'error');
      }
    } catch {
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ, vui lòng thử lại' : 'Server connection error, please try again', 'error');
    } finally {
      setSaving(false);
    }
  };

  const t = translations[lang] || translations.en;

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>{t.loading}</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }} className="page-fade-in">
      <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }} className="back-link">
        <AppIcon name="ArrowLeft" size="sm" /> {lang === 'vi' ? 'Quay lại trang Admin' : 'Back to Admin'}
      </Link>

      <div className="admin-card" style={{ padding: '40px 32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>
          {t.siteSettings}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px' }}>
          {t.siteSettingsDesc}
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

        <form onSubmit={handleSubmit}>
          {/* Section: Basic Info */}
          <h3 style={{ fontSize: '18px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '20px', color: 'var(--primary)', letterSpacing: '-0.01em' }}>
            {t.basicInfo}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="site_name">{t.siteName}</label>
              <input
                type="text"
                id="site_name"
                className="form-input"
                required
                value={settings.site_name}
                onChange={e => setSettings({ ...settings, site_name: e.target.value })}
                placeholder="Ví dụ: hi_dev."
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="site_domain">{t.domain}</label>
              <input
                type="text"
                id="site_domain"
                className="form-input"
                required
                value={settings.site_domain}
                onChange={e => setSettings({ ...settings, site_domain: e.target.value })}
                placeholder="Ví dụ: hidev.dev"
                disabled={saving}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="site_email">{t.email}</label>
              <input
                type="email"
                id="site_email"
                className="form-input"
                required
                value={settings.site_email}
                onChange={e => setSettings({ ...settings, site_email: e.target.value })}
                placeholder="contact@hidev.dev"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="site_phone">{t.phone}</label>
              <input
                type="text"
                id="site_phone"
                className="form-input"
                required
                value={settings.site_phone}
                onChange={e => setSettings({ ...settings, site_phone: e.target.value })}
                placeholder="0987654321"
                disabled={saving}
              />
            </div>
          </div>

          {/* Section: Brand Assets */}
          <h3 style={{ fontSize: '18px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '20px', color: 'var(--primary)', marginTop: '20px', letterSpacing: '-0.01em' }}>
            {t.brandAssets}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="site_logo">{t.logoUrl}</label>
              <input
                type="text"
                id="site_logo"
                className="form-input"
                required
                value={settings.site_logo}
                onChange={e => setSettings({ ...settings, site_logo: e.target.value })}
                placeholder="Ví dụ: /logo.png"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="site_icon">{t.iconUrl}</label>
              <input
                type="text"
                id="site_icon"
                className="form-input"
                required
                value={settings.site_icon}
                onChange={e => setSettings({ ...settings, site_icon: e.target.value })}
                placeholder="Ví dụ: /icon.png"
                disabled={saving}
              />
            </div>
          </div>

          {/* Section: Donation Settings (New) */}
          <h3 style={{ fontSize: '18px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '20px', color: 'var(--primary)', marginTop: '20px', letterSpacing: '-0.01em' }}>
            ❤️ {lang === 'vi' ? 'Quyên góp & Hỗ trợ (Donation)' : 'Donation & Support'}
          </h3>

          <div className="form-group">
            <label className="form-label">{lang === 'vi' ? 'Phương thức nhập mã QR' : 'QR Code Input Mode'}</label>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                className={`btn ${qrMode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setQrMode('upload')}
                style={{ padding: '8px 16px', fontSize: '13px' }}
                disabled={saving}
              >
                📁 {lang === 'vi' ? 'Tải ảnh lên' : 'Upload Image'}
              </button>
              <button
                type="button"
                className={`btn ${qrMode === 'url' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setQrMode('url')}
                style={{ padding: '8px 16px', fontSize: '13px' }}
                disabled={saving}
              >
                🌐 {lang === 'vi' ? 'Đường dẫn ảnh bên ngoài' : 'External Image URL'}
              </button>
            </div>

            {qrMode === 'upload' ? (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label 
                    className="btn btn-secondary" 
                    style={{ 
                      margin: 0, 
                      padding: '12px 18px', 
                      whiteSpace: 'nowrap', 
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <AppIcon name="Upload" size="sm" />
                    {uploadingQr ? (lang === 'vi' ? 'Đang tải lên...' : 'Uploading...') : (lang === 'vi' ? 'Chọn ảnh QR' : 'Choose QR Image')}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrUpload}
                      style={{ display: 'none' }}
                      disabled={saving || uploadingQr}
                    />
                  </label>
                  <span className="form-helper" style={{ display: 'block', marginTop: '6px' }}>
                    {lang === 'vi' ? 'Chọn tập tin mã QR (PNG, JPG, JPEG, WEBP)' : 'Choose a QR code image file (PNG, JPG, JPEG, WEBP)'}
                  </span>
                </div>

                {settings.qr_donation && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', backgroundColor: 'var(--surface-hover)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={settings.qr_donation} 
                      alt="QR Preview" 
                      style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain', backgroundColor: 'white', padding: '4px', borderRadius: '6px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, qr_donation: '' })}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                      disabled={saving}
                    >
                      ❌ {lang === 'vi' ? 'Gỡ bỏ' : 'Remove'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  value={settings.qr_donation}
                  onChange={e => setSettings({ ...settings, qr_donation: e.target.value })}
                  placeholder="https://example.com/donation-qr.png"
                  disabled={saving}
                />
                <span className="form-helper">
                  {lang === 'vi' ? 'Nhập đường dẫn ảnh trực tiếp bắt đầu bằng https://' : 'Enter a direct image link starting with https://'}
                </span>
                
                {settings.qr_donation && (
                  <div style={{ marginTop: '12px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={settings.qr_donation} 
                      alt="QR Preview" 
                      style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain', backgroundColor: 'white', padding: '6px', borderRadius: '8px', border: '1px solid var(--border)' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
            )}

            {!settings.qr_donation && (
              <div style={{ 
                padding: '16px', 
                backgroundColor: 'rgba(245, 158, 11, 0.05)', 
                border: '1px dashed rgba(245, 158, 11, 0.2)', 
                borderRadius: '8px', 
                color: '#fbbf24', 
                fontSize: '13px',
                marginTop: '12px'
              }}>
                ⚠️ {lang === 'vi' 
                  ? 'Chưa cấu hình QR Quyên góp. Thẻ Hỗ trợ sẽ không hiển thị trên trang cá nhân của người dùng.' 
                  : 'QR Donation not configured. The Support card will not be shown on user profiles.'}
              </div>
            )}
          </div>

          {/* Section: SEO */}
          <h3 style={{ fontSize: '18px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '20px', color: 'var(--primary)', marginTop: '20px', letterSpacing: '-0.01em' }}>
            {t.seoTitle} & {t.seoKeywords}
          </h3>

          <div className="form-group">
            <label className="form-label" htmlFor="seo_title">{t.seoTitle}</label>
            <input
              type="text"
              id="seo_title"
              className="form-input"
              required
              value={settings.seo_title}
              onChange={e => setSettings({ ...settings, seo_title: e.target.value })}
              placeholder="SEO Title..."
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="seo_description">{t.seoDesc}</label>
            <textarea
              id="seo_description"
              className="form-textarea"
              required
              rows={3}
              value={settings.seo_description}
              onChange={e => setSettings({ ...settings, seo_description: e.target.value })}
              placeholder="SEO Description..."
              disabled={saving}
            ></textarea>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="seo_keywords">{t.seoKeywords}</label>
            <input
              type="text"
              id="seo_keywords"
              className="form-input"
              required
              value={settings.seo_keywords}
              onChange={e => setSettings({ ...settings, seo_keywords: e.target.value })}
              placeholder="developer tools, code..."
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="footer_text">{t.footerText}</label>
            <input
              type="text"
              id="footer_text"
              className="form-input"
              required
              value={settings.footer_text}
              onChange={e => setSettings({ ...settings, footer_text: e.target.value })}
              placeholder="© 2026..."
              disabled={saving}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
            <button 
              type="submit" 
              className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} 
              disabled={saving}
              style={{ padding: '14px 28px', fontSize: '13px' }}
            >
              {saving ? '' : t.saveSettings}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
