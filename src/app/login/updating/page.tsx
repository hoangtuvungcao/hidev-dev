'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { detectLanguageClient, Language } from '@/lib/i18n';
import { AppIcon } from '@/components/ui/icon';

export default function LoginUpdatingPage() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLanguageClient());
  }, []);

  return (
    <div style={{
      maxWidth: '500px',
      margin: '80px auto',
      padding: '48px 36px',
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '24px',
      boxShadow: 'var(--shadow-xl)',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '24px'
    }} className="page-fade-in">
      
      {/* Icon with rotate micro-animation */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid var(--warning)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--warning)',
        marginBottom: '8px'
      }}>
        <span style={{ display: 'inline-flex', animation: 'spin-slow 8s linear infinite' }}>
          <AppIcon name="Settings" size={48} />
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)' }}>
          {lang === 'vi' ? 'Đang Nâng Cấp Hệ Thống' : 'System Upgrades in Progress'}
        </h1>
        
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
          {lang === 'vi' 
            ? 'Tính năng kết nối tài khoản qua GitHub và Google hiện đang được bảo trì và hoàn thiện. Xin vui lòng quay lại sau!'
            : 'Connecting accounts via GitHub and Google is currently under development & maintenance. Please check back later!'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px', width: '100%', marginTop: '16px' }}>
        <Link 
          href="/login" 
          className="btn btn-secondary" 
          style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            padding: '14px'
          }}
        >
          <AppIcon name="ArrowLeft" size={16} />
          {lang === 'vi' ? 'Quay lại đăng nhập' : 'Back to Login'}
        </Link>
        
        <Link 
          href="/" 
          className="btn btn-primary" 
          style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '14px'
          }}
        >
          {lang === 'vi' ? 'Về Trang Chủ' : 'Go to Homepage'}
        </Link>
      </div>
    </div>
  );
}
