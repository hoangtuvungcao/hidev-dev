'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppIcon } from '@/components/ui/icon';

interface MockProfile {
  username: string;
  email: string;
  avatarUrl: string;
  role: string;
}

function OAuthSandboxContent() {
  const searchParams = useSearchParams();
  const provider = searchParams.get('provider') || 'github';

  const [loadingProfile, setLoadingProfile] = useState<string | null>(null);
  const [error, setError] = useState('');

  const mockProfiles: MockProfile[] = [
    {
      username: provider === 'github' ? 'github_coder' : 'google_pm',
      email: provider === 'github' ? 'coder@github.com' : 'pm@gmail.com',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${provider === 'github' ? 'coder' : 'pm'}`,
      role: 'Full Stack Engineer'
    },
    {
      username: 'tech_lead',
      email: 'lead@hidev.dev',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=lead',
      role: 'Tech Lead Manager'
    },
    {
      username: 'ui_designer',
      email: 'designer@hidev.dev',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=designer',
      role: 'Product Designer'
    }
  ];

  const handleSimulateLogin = async (profile: MockProfile) => {
    setLoadingProfile(profile.username);
    setError('');

    try {
      const res = await fetch('/api/auth/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
          provider: provider
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lỗi đăng nhập Sandbox');
      } else {
        window.location.replace('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingProfile(null);
    }
  };

  return (
    <div className="admin-table-container" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        {provider === 'github' ? (
          <AppIcon name="Github" size={32} />
        ) : (
          <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--destructive)', width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%' }}>
            G
          </span>
        )}
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>
          Giả lập OAuth Sandbox ({provider.toUpperCase()})
        </h1>
      </div>

      {/* Sandbox Notice Banner */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        padding: '16px', 
        backgroundColor: 'rgba(16, 185, 129, 0.04)', 
        border: '1px solid var(--border)', 
        borderRadius: '12px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: '1.6',
        marginBottom: '28px'
      }}>
        <AppIcon name="Info" size={28} className="text-primary" style={{ flexShrink: 0 }} />
        <div>
          <strong>Chế độ thử nghiệm Localhost:</strong> <br />
          Bạn nhìn thấy trang này vì chưa cấu hình <code style={{ color: 'var(--primary)', background: 'var(--surface-hover)', padding: '2px 4px', borderRadius: '4px' }}>{provider.toUpperCase()}_CLIENT_ID</code> trong file <code style={{ color: 'var(--primary)', background: 'var(--surface-hover)', padding: '2px 4px', borderRadius: '4px' }}>.env</code>. <br />
          Nhấp chọn bất kỳ hồ sơ thử nghiệm nào dưới đây để giả lập đăng nhập OAuth và đăng ký dữ liệu vào DB ngay lập tức.
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--destructive)', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--text)' }}>
        Chọn một hồ sơ để giả lập đăng nhập:
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mockProfiles.map(profile => (
          <div 
            key={profile.username}
            onClick={() => !loadingProfile && handleSimulateLogin(profile)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              backgroundColor: 'var(--surface-hover)',
              cursor: loadingProfile ? 'not-allowed' : 'pointer',
              transition: 'var(--transition)',
              opacity: loadingProfile && loadingProfile !== profile.username ? 0.5 : 1
            }}
            className="post-card-hover"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={profile.avatarUrl} 
                alt={profile.username} 
                style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--border)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                  @{profile.username}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {profile.email} • {profile.role}
                </span>
              </div>
            </div>

            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px' }}
              disabled={!!loadingProfile}
            >
              {loadingProfile === profile.username ? 'Đang vào...' : 'Chọn'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OAuthSandboxPage() {
  return (
    <div style={{ maxWidth: '550px', margin: '40px auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          <AppIcon name="ArrowLeft" size={16} /> Quay lại Đăng nhập
        </Link>
      </div>

      <Suspense fallback={
        <div className="admin-table-container" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          Đang nạp giả lập Sandbox...
        </div>
      }>
        <OAuthSandboxContent />
      </Suspense>

      <style jsx global>{`
        .post-card-hover:hover {
          border-color: var(--primary) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.05);
        }
      `}</style>
    </div>
  );
}
