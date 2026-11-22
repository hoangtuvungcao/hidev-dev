'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { AppIcon } from '@/components/ui/icon';
import Link from 'next/link';

function LoginPageContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const [lang, setLang] = useState<Language>('en');
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLanguageClient());
  }, []);

  useEffect(() => {
    if (errorParam === 'updating') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(
        lang === 'vi'
          ? 'Chức năng đăng nhập qua GitHub/Google đang được nâng cấp, vui lòng thử lại sau.'
          : 'GitHub/Google login is currently being updated, please try again later.'
      );
    }
  }, [errorParam, lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { username, password } 
      : { username, email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (lang === 'vi' ? 'Có lỗi xảy ra, vui lòng thử lại' : 'An error occurred, please try again'));
        showToast(data.error || (lang === 'vi' ? 'Lỗi xác thực' : 'Authentication error'), 'error');
      } else {
        if (isLogin) {
          showToast(lang === 'vi' ? 'Đăng nhập thành công!' : 'Logged in successfully!', 'success');
          // Force full page reload to re-render server layout with new session cookie
          setTimeout(() => {
            router.refresh();
            window.location.href = '/';
          }, 500);
        } else {
          setIsLogin(true);
          setError('');
          setPassword('');
          showToast(lang === 'vi' ? 'Đăng ký thành công! Hãy đăng nhập.' : 'Registration successful! Please log in.', 'success');
        }
      }
    } catch {
      setError(lang === 'vi' ? 'Lỗi kết nối server, vui lòng thử lại' : 'Connection error, please try again');
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const t = translations[lang] || translations.en;

  return (
    <div style={{
      maxWidth: '450px',
      margin: '40px auto',
      padding: '40px 32px',
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      boxShadow: 'var(--shadow-lg)'
    }} className="page-fade-in">
      <Link href="/" className="back-link-general" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', fontWeight: 600 }}>
        <AppIcon name="ArrowLeft" size="sm" /> {lang === 'vi' ? 'Quay lại trang chủ' : 'Back to Home'}
      </Link>

      <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>
        {isLogin ? t.loginTitle : t.registerTitle}
      </h2>
      <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
        {isLogin ? t.loginDesc : t.registerDesc}
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
        <div className="form-group">
          <label className="form-label" htmlFor="username">{t.usernameLabel}</label>
          <input
            type="text"
            id="username"
            className="form-input"
            required
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder={lang === 'vi' ? 'Nhập username hoặc email của bạn...' : 'Enter your username or email...'}
            disabled={loading}
          />
        </div>

        {!isLogin && (
          <div className="form-group">
            <label className="form-label" htmlFor="email">{t.emailLabel}</label>
            <input
              type="email"
              id="email"
              className="form-input"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={lang === 'vi' ? 'Nhập địa chỉ email chính xác...' : 'Enter your correct email address...'}
              disabled={loading}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="password">{t.passwordLabel}</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="form-input"
              style={{ paddingRight: '48px' }}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={lang === 'vi' ? 'Nhập mật khẩu...' : 'Enter password...'}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <AppIcon name="EyeOff" size={18} /> : <AppIcon name="Eye" size={18} />}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} 
          style={{ width: '100%', marginTop: '12px', padding: '14px' }}
          disabled={loading}
        >
          {loading ? '' : isLogin ? t.loginBtn : t.registerBtn}
        </button>
      </form>

      {/* Separator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        margin: '24px 0',
        color: 'var(--text-muted)',
        fontSize: '12px'
      }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
        <span style={{ padding: '0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {lang === 'vi' ? 'Hoặc đăng nhập bằng' : 'Or connect with'}
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
      </div>

      {/* Social login buttons row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={() => window.location.href = '/api/auth/oauth/github'}
          className="btn btn-secondary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px' }}
        >
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
            <path d="M208,104a80,80,0,0,0-160,0c0,38.25,24.4,70.82,58.26,82.07C107.56,186.53,108,183.18,108,180v-16.5C88.08,167.36,83,154.55,83,154.55c-4.33-11-10.57-14-10.57-14-9.35-6.39.71-6.26.71-6.26,10.33.72,15.77,10.61,15.77,10.61,9.19,15.74,24.11,11.19,30,8.56a21.72,21.72,0,0,1,6.5-13.58c-23.86-2.71-49-11.93-49-53a41.48,41.48,0,0,1,11-28.79,38.54,38.54,0,0,1,1-28.38s9,2.88,29.41,11A100.86,100.86,0,0,1,164,52a100.86,100.86,0,0,1,26.27,3.53c20.42-8.08,29.41-11,29.41-11a38.54,38.54,0,0,1,1,28.38,41.48,41.48,0,0,1,11,28.79c0,41.21-25.18,50.31-49.09,52.95A25.86,25.86,0,0,1,180,170v30c0,3.18.44,6.53,1.74,8.07C215.6,174.82,240,142.25,240,104A32,32,0,0,1,208,104Z"></path>
          </svg>
          GitHub
        </button>

        <button
          onClick={() => window.location.href = '/api/auth/oauth/google'}
          className="btn btn-secondary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px' }}
        >
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
            <path d="M228,128a100.09,100.09,0,0,1-100,100c-55.23,0-100-44.77-100-100S72.77,28,128,28a99.4,99.4,0,0,1,70.52,29.17l-22.63,22.63A67.43,67.43,0,0,0,128,60c-37.56,0-68,30.44-68,68s30.44,68,68,68,68-30.44,68-68a67.18,67.18,0,0,0-3.66-22H128V76h100A100,100,0,0,1,228,128Z"></path>
          </svg>
          Google
        </button>
      </div>

      <div style={{
        marginTop: '24px',
        textAlign: 'center',
        fontSize: '14px',
        color: 'var(--text-secondary)',
        borderTop: '1px solid var(--border)',
        paddingTop: '24px'
      }}>
        {isLogin ? (
          <>
            {t.noAccount}{' '}
            <button 
              onClick={() => { setIsLogin(false); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}
            >
              {t.registerNow}
            </button>
          </>
        ) : (
          <>
            {t.hasAccount}{' '}
            <button 
              onClick={() => { setIsLogin(true); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}
            >
              {t.loginHere}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
