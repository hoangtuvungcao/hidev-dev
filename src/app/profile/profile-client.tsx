'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, Post, Category } from '@/types';
import { Language } from '@/lib/i18n';
import { AppIcon } from '@/components/ui/icon';
import { useToast } from '@/components/Toast';

interface ProfileClientProps {
  user: User;
  initialPosts: Post[];
  initialVotedPosts: Post[];
  categories: Category[];
  lang: Language;
  qrDonation: string; // QR Donation image URL or relative path
}

export default function ProfileClient({ user, initialPosts, initialVotedPosts, lang, qrDonation }: ProfileClientProps) {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'posts' | 'voted'>('profile');
  
  // Profile inputs state
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState('');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // User posts state
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [votedPosts] = useState<Post[]>(initialVotedPosts);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Pagination states
  const [postsSearch, setPostsSearch] = useState('');
  const [postsPage, setPostsPage] = useState(1);
  const [votedSearch, setVotedSearch] = useState('');
  const [votedPage, setVotedPage] = useState(1);

  // QR Donation local UI states
  const [qrImageLoaded, setQrImageLoaded] = useState(false);
  const [qrLightboxOpen, setQrLightboxOpen] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(postsSearch.toLowerCase()) || 
    (p.category_name && p.category_name.toLowerCase().includes(postsSearch.toLowerCase()))
  );
  const totalPostsPages = Math.ceil(filteredPosts.length / 50) || 1;
  const paginatedPosts = filteredPosts.slice((postsPage - 1) * 50, postsPage * 50);

  const filteredVoted = votedPosts.filter(p => 
    p.title.toLowerCase().includes(votedSearch.toLowerCase()) || 
    (p.category_name && p.category_name.toLowerCase().includes(votedSearch.toLowerCase()))
  );
  const totalVotedPages = Math.ceil(filteredVoted.length / 50) || 1;
  const paginatedVoted = filteredVoted.slice((votedPage - 1) * 50, votedPage * 50);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    const formData = new FormData();
    formData.append('files', file);

    setProfileLoading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.files && data.files.length > 0) {
        setAvatarUrl(data.files[0].file_url);
        showToast(lang === 'vi' ? 'Tải ảnh đại diện lên thành công!' : 'Avatar uploaded successfully!', 'success');
      } else {
        showToast(data.error || (lang === 'vi' ? 'Tải ảnh lên thất bại' : 'Failed to upload image'), 'error');
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      showToast(errorMsg || (lang === 'vi' ? 'Lỗi kết nối khi tải ảnh' : 'Connection error during upload'), 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // 1. Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, avatar_url: avatarUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Lỗi cập nhật hồ sơ', 'error');
        setError(data.error || 'Lỗi cập nhật hồ sơ');
      } else {
        showToast(
          lang === 'vi' ? 'Cập nhật hồ sơ thành công!' : 'Profile updated successfully!',
          'success'
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showToast(errorMsg, 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // 2. Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      const err = lang === 'vi' ? 'Mật khẩu mới không khớp!' : 'New passwords do not match!';
      setPasswordError(err);
      showToast(err, 'error');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Lỗi đổi mật khẩu');
        showToast(data.error || 'Lỗi đổi mật khẩu', 'error');
      } else {
        showToast(
          lang === 'vi' ? 'Đổi mật khẩu thành công!' : 'Password changed successfully!',
          'success'
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showToast(errorMsg, 'error');
      setPasswordError(errorMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // 3. Delete User Post
  const handleDeletePost = async (postId: number) => {
    const msg = lang === 'vi' 
      ? 'Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.' 
      : 'Are you sure you want to delete this tool? This action cannot be undone.';
    
    if (!window.confirm(msg)) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Lỗi xóa bài đăng', 'error');
      } else {
        showToast(
          lang === 'vi' ? 'Xóa bài đăng thành công!' : 'Tool deleted successfully!',
          'success'
        );
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showToast(errorMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogoutProfile = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        showToast(
          lang === 'vi' ? 'Đăng xuất thành công!' : 'Logged out successfully!',
          'success'
        );
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      } else {
        showToast('Error logging out', 'error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showToast(errorMsg, 'error');
    }
  };

  const handleDownloadQr = async () => {
    if (!qrDonation) return;
    setDownloadingQr(true);
    try {
      const response = await fetch(qrDonation);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'hidev-support-qr.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast(lang === 'vi' ? 'Tải mã QR thành công!' : 'QR image downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      // Fallback for CORS: open in new tab
      window.open(qrDonation, '_blank');
    } finally {
      setDownloadingQr(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }} className="page-fade-in">
      <Link href="/" className="back-link-general" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', fontWeight: 600 }}>
        &larr; {lang === 'vi' ? 'Quay lại trang chủ' : 'Back to Home'}
      </Link>
      
      {/* Profile Header Card */}
      <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'} 
          alt={user.username} 
          style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--primary)', backgroundColor: 'var(--border)' }}
        />
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', margin: 0 }}>@{user.username}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            {lang === 'vi' 
              ? `Thành viên Ban quản trị (${user.role.toUpperCase()})` 
              : `Member Role: ${user.role.toUpperCase()}`}
          </p>
        </div>
      </div>
 
      {/* Tabs Menu Navigation */}
      <div className="profile-tabs-container">
        <div className="profile-tab-header" style={{ marginBottom: '24px' }}>
          <button 
            className={`profile-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
              <AppIcon name="Settings" size={18} />
              {lang === 'vi' ? 'Thông tin cá nhân' : 'Edit Profile'}
            </span>
          </button>
          <button 
            className={`profile-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
              <AppIcon name="FileText" size={18} />
              {lang === 'vi' ? 'Bài viết của tôi' : 'My Posts'} ({posts.length})
            </span>
          </button>
          <button 
            className={`profile-tab-btn ${activeTab === 'voted' ? 'active' : ''}`}
            onClick={() => setActiveTab('voted')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
              <AppIcon name="Heart" size={18} />
              {lang === 'vi' ? 'Đã vote' : 'Voted'} ({votedPosts.length})
            </span>
          </button>
        </div>

        {/* Tab content 1: Edit Profile Settings & Change Password */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* ❤️ Support hidev Card (New) */}
            {qrDonation && (
              <div className="admin-card" style={{ border: '1px solid rgba(139, 92, 246, 0.2)', background: 'linear-gradient(135deg, var(--surface) 0%, rgba(139, 92, 246, 0.02) 100%)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', color: 'var(--text)' }}>
                  ❤️ {lang === 'vi' ? 'Hỗ trợ phát triển hidev' : 'Support hidev Development'}
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '24px', alignItems: 'center' }} className="support-card-grid">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {lang === 'vi' 
                        ? 'hidev là nền tảng miễn phí dành cho cộng đồng lập trình viên.' 
                        : 'hidev is a free community platform created for developers.'}
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {lang === 'vi'
                        ? 'Nếu bạn thấy hidev hữu ích, hãy cân nhắc quét mã QR dưới đây để ủng hộ và giúp duy trì máy chủ, tên miền, lưu trữ cũng như phát triển thêm nhiều tính năng mới.'
                        : 'If you find hidev useful, please consider scanning the QR code below to support us and help maintain servers, domains, hosting, and build awesome new features.'}
                    </p>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', fontWeight: 600, margin: 0, fontStyle: 'italic' }}>
                      {lang === 'vi' ? 'Mọi sự đóng góp đều được trân trọng.' : 'Every contribution is deeply appreciated.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', justifySelf: 'center' }}>
                    <div 
                      onClick={() => setQrLightboxOpen(true)}
                      style={{ 
                        position: 'relative', width: '180px', height: '180px', 
                        backgroundColor: 'white', border: '1px solid var(--border)', 
                        borderRadius: '12px', padding: '10px', cursor: 'zoom-in',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s',
                        overflow: 'hidden'
                      }}
                      className="qr-img-wrapper"
                    >
                      {/* Skeleton loader for QR */}
                      {!qrImageLoaded && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', animation: 'pulse 1.5s infinite'
                        }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #ddd', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                        </div>
                      )}
                      
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={qrDonation} 
                        alt="Donation QR" 
                        onLoad={() => setQrImageLoaded(true)}
                        style={{ 
                          maxWidth: '100%', maxHeight: '100%', 
                          objectFit: 'contain', display: qrImageLoaded ? 'block' : 'none',
                          imageRendering: 'auto'
                        }}
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}
                      disabled={downloadingQr}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      {downloadingQr ? (lang === 'vi' ? 'Đang tải...' : 'Saving...') : (lang === 'vi' ? 'Lưu ảnh QR' : 'Save QR Image')}
                    </button>
                  </div>
                </div>

                <style jsx>{`
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                  }
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                  .qr-img-wrapper:hover {
                    transform: scale(1.02);
                  }
                  @media (max-width: 600px) {
                    .support-card-grid {
                      grid-template-columns: 1fr !important;
                    }
                  }
                `}</style>
              </div>
            )}

            {/* Update profile details */}
            <form className="admin-card" onSubmit={handleUpdateProfile}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', margin: 0 }}>
                {lang === 'vi' ? 'Cập nhật tài khoản' : 'Update Profile Settings'}
              </h2>

              {error && (
                <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--destructive)', borderRadius: '8px', color: '#fca5a5', fontSize: '13.5px', marginBottom: '20px' }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{lang === 'vi' ? 'Tên tài khoản (Username)' : 'Username'}</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  disabled={profileLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={profileLoading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">{lang === 'vi' ? 'Ảnh đại diện (Avatar URL)' : 'Avatar Image URL'}</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="form-input"
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    disabled={profileLoading}
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
                      onChange={handleAvatarUpload}
                      style={{ display: 'none' }}
                      disabled={profileLoading}
                    />
                  </label>
                </div>
                <span className="form-helper" style={{ display: 'block', marginTop: '6px' }}>
                  {lang === 'vi' 
                    ? 'Nhập link ảnh hoặc chọn một ảnh từ máy của bạn'
                    : 'Enter an image link or choose an image file from your computer'}
                </span>

                {/* Avatar Live Preview */}
                {avatarUrl && (
                  <div className="avatar-preview-container">
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {lang === 'vi' ? 'Xem trước:' : 'Preview:'}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={avatarUrl} 
                      alt="Avatar Preview" 
                      className="avatar-preview-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback';
                      }}
                    />
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className={`btn btn-primary ${profileLoading ? 'btn-loading' : ''}`} 
                disabled={profileLoading}
              >
                {profileLoading ? '' : (lang === 'vi' ? 'Lưu thay đổi' : 'Save Changes')}
              </button>
            </form>

            {/* Change Password form */}
            <form className="admin-card" onSubmit={handleChangePassword}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', margin: 0 }}>
                {lang === 'vi' ? 'Đổi mật khẩu tài khoản' : 'Change Account Password'}
              </h2>

              {passwordError && (
                <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--destructive)', borderRadius: '8px', color: '#fca5a5', fontSize: '13.5px', marginBottom: '20px' }}>
                  {passwordError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{lang === 'vi' ? 'Mật khẩu hiện tại' : 'Current Password'}</label>
                <input 
                  type="password" 
                  className="form-input"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder={lang === 'vi' ? 'Nhập mật khẩu cũ...' : 'Enter old password...'}
                  disabled={passwordLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'vi' ? 'Mật khẩu mới' : 'New Password'}</label>
                <input 
                  type="password" 
                  className="form-input"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={lang === 'vi' ? 'Mật khẩu mới (tối thiểu 6 ký tự)...' : 'New password (min 6 characters)...'}
                  disabled={passwordLoading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">{lang === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'}</label>
                <input 
                  type="password" 
                  className="form-input"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={lang === 'vi' ? 'Nhập lại mật khẩu mới...' : 'Re-type new password...'}
                  disabled={passwordLoading}
                />
              </div>

              <button 
                type="submit" 
                className={`btn btn-primary ${passwordLoading ? 'btn-loading' : ''}`} 
                disabled={passwordLoading}
              >
                {passwordLoading ? '' : (lang === 'vi' ? 'Thay đổi mật khẩu' : 'Update Password')}
              </button>
            </form>

            {/* Session Management / Log Out Card */}
            <div className="admin-card" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#f87171', margin: 0 }}>
                {lang === 'vi' ? 'Đăng xuất khỏi tài khoản' : 'Account Session'}
              </h2>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                {lang === 'vi' ? 'Đăng xuất khỏi phiên làm việc hiện tại trên thiết bị này.' : 'Sign out of your active developer session on this device.'}
              </p>
              <button
                type="button"
                onClick={handleLogoutProfile}
                className="btn"
                style={{ backgroundColor: 'var(--destructive)', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                {lang === 'vi' ? 'Đăng xuất' : 'Log Out'}
              </button>
            </div>
          </div>
        )}

        {/* Tab content 2: My Posts list and actions */}
        {activeTab === 'posts' && (
          <div className="admin-card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', margin: 0 }}>
              {lang === 'vi' ? 'Danh sách bài viết đã đăng' : 'Published Posts'}
            </h2>

            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                {lang === 'vi' ? 'Bạn chưa đăng bài viết nào.' : "You haven't published any posts yet."}
                <div style={{ marginTop: '16px' }}>
                  <Link href="/submit" className="btn btn-primary">{lang === 'vi' ? 'Đăng ngay' : 'Post Now'}</Link>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="text"
                    placeholder={lang === 'vi' ? 'Tìm kiếm trong bài viết của tôi...' : 'Search my posts...'}
                    className="form-input"
                    value={postsSearch}
                    onChange={e => {
                      setPostsSearch(e.target.value);
                      setPostsPage(1);
                    }}
                  />
                </div>

                {filteredPosts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                    {lang === 'vi' ? 'Không tìm thấy bài viết nào khớp với từ khóa.' : 'No posts matched your search.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {paginatedPosts.map(post => (
                      <div 
                        key={post.id} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '16px', 
                          border: '1px solid var(--border)', 
                          borderRadius: '12px',
                          backgroundColor: 'var(--surface-hover)' 
                        }}
                      >
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', margin: 0 }}>
                            <Link href={`/posts/${post.slug}`} style={{ color: 'var(--text)', textDecoration: 'none' }} className="post-title-link">
                              {post.title}
                            </Link>
                          </h3>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                            <span className="post-category" style={{ padding: '2px 8px', fontSize: '10px', margin: 0 }}>
                              {post.category_name}
                            </span>
                            
                            {/* Status Badge */}
                            <span className={`status-badge status-${post.status}`} style={{ fontSize: '10px', margin: 0, padding: '2px 8px' }}>
                              {post.status === 'approved' 
                                ? (lang === 'vi' ? 'Đã duyệt' : 'Approved') 
                                : post.status === 'pending'
                                  ? (lang === 'vi' ? 'Chờ duyệt' : 'Pending')
                                  : (lang === 'vi' ? 'Từ chối' : 'Rejected')}
                            </span>
                          </div>
                        </div>

                        {/* Actions buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link 
                            href={`/posts/edit/${post.id}`} 
                            className="btn btn-secondary"
                            style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center' }}
                            title={lang === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                          >
                            <AppIcon name="Pencil" size="sm" />
                          </Link>
                          <button 
                            onClick={() => handleDeletePost(post.id)}
                            disabled={actionLoading}
                            className="btn"
                            style={{ 
                              padding: '8px 12px', 
                              fontSize: '12px', 
                              borderRadius: '8px', 
                              backgroundColor: 'rgba(239, 68, 68, 0.06)', 
                              border: '1px solid rgba(239, 68, 68, 0.15)', 
                              color: '#fca5a5',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                            title={lang === 'vi' ? 'Xóa bài viết' : 'Delete'}
                          >
                            <AppIcon name="Trash2" size="sm" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {totalPostsPages > 1 && (
                  <div className="doc-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
                    <button
                      className="btn btn-secondary"
                      disabled={postsPage === 1}
                      onClick={() => setPostsPage(prev => Math.max(prev - 1, 1))}
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      {lang === 'vi' ? 'Trước' : 'Previous'}
                    </button>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
                      {lang === 'vi' ? `Trang ${postsPage} / ${totalPostsPages}` : `Page ${postsPage} of ${totalPostsPages}`}
                    </span>
                    <button
                      className="btn btn-secondary"
                      disabled={postsPage === totalPostsPages}
                      onClick={() => setPostsPage(prev => Math.min(prev + 1, totalPostsPages))}
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      {lang === 'vi' ? 'Sau' : 'Next'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab content 3: Voted Posts */}
        {activeTab === 'voted' && (
          <div className="admin-card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', margin: 0 }}>
              {lang === 'vi' ? 'Bài viết đã vote' : 'Voted Posts'}
            </h2>

            {votedPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                {lang === 'vi' ? 'Bạn chưa vote bài viết nào.' : "You haven't voted for any posts yet."}
                <div style={{ marginTop: '16px' }}>
                  <Link href="/" className="btn btn-primary">{lang === 'vi' ? 'Khám phá ngay' : 'Explore Now'}</Link>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="text"
                    placeholder={lang === 'vi' ? 'Tìm kiếm trong bài viết đã vote...' : 'Search voted posts...'}
                    className="form-input"
                    value={votedSearch}
                    onChange={e => {
                      setVotedSearch(e.target.value);
                      setVotedPage(1);
                    }}
                  />
                </div>

                {filteredVoted.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                    {lang === 'vi' ? 'Không tìm thấy bài viết nào khớp với từ khóa.' : 'No posts matched your search.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {paginatedVoted.map(post => (
                      <div 
                        key={post.id} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '16px', 
                          border: '1px solid var(--border)', 
                          borderRadius: '12px',
                          backgroundColor: 'var(--surface-hover)' 
                        }}
                      >
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', margin: 0 }}>
                            <Link href={`/posts/${post.slug}`} style={{ color: 'var(--text)', textDecoration: 'none' }} className="post-title-link">
                              {post.title}
                            </Link>
                          </h3>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                            <span className="post-category" style={{ padding: '2px 8px', fontSize: '10px', margin: 0 }}>
                              {post.category_name}
                            </span>
                            
                            {/* Status Badge */}
                            <span className={`status-badge status-${post.status}`} style={{ fontSize: '10px', margin: 0, padding: '2px 8px' }}>
                              {post.status === 'approved' 
                                ? (lang === 'vi' ? 'Đã duyệt' : 'Approved') 
                                : post.status === 'pending'
                                  ? (lang === 'vi' ? 'Chờ duyệt' : 'Pending')
                                  : (lang === 'vi' ? 'Từ chối' : 'Rejected')}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <AppIcon name="Heart" size={20} color="var(--primary)" fill="var(--primary)" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {totalVotedPages > 1 && (
                  <div className="doc-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
                    <button
                      className="btn btn-secondary"
                      disabled={votedPage === 1}
                      onClick={() => setVotedPage(prev => Math.max(prev - 1, 1))}
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      {lang === 'vi' ? 'Trước' : 'Previous'}
                    </button>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
                      {lang === 'vi' ? `Trang ${votedPage} / ${totalVotedPages}` : `Page ${votedPage} of ${totalVotedPages}`}
                    </span>
                    <button
                      className="btn btn-secondary"
                      disabled={votedPage === totalVotedPages}
                      onClick={() => setVotedPage(prev => Math.min(prev + 1, totalVotedPages))}
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      {lang === 'vi' ? 'Sau' : 'Next'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / Zoom Modal for QR Donation (New) */}
      {qrLightboxOpen && qrDonation && (
        <div 
          onClick={() => setQrLightboxOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 99999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', animation: 'fadeIn 0.2s ease', backdropFilter: 'blur(8px)',
            padding: '24px'
          }}
        >
          <button 
            type="button"
            onClick={() => setQrLightboxOpen(false)}
            style={{
              position: 'absolute', top: '20px', right: '24px',
              background: 'rgba(255, 255, 255, 0.1)', border: 'none',
              color: 'white', cursor: 'pointer', padding: '10px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          
          <div 
            onClick={e => e.stopPropagation()}
            style={{ 
              maxWidth: '90vw', maxHeight: '75vh',
              backgroundColor: 'white', padding: '16px', 
              borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'default'
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={qrDonation} 
              alt="Donation QR Large" 
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              onClick={handleDownloadQr}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
              disabled={downloadingQr}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              {downloadingQr ? (lang === 'vi' ? 'Đang tải...' : 'Saving...') : (lang === 'vi' ? 'Lưu ảnh QR' : 'Save QR Image')}
            </button>
          </div>

          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
