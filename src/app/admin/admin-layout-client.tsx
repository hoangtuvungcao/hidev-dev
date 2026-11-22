'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { AppIcon } from '@/components/ui/icon';

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const [lang, setLang] = useState<Language>('en');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLanguageClient());
    // Auto-collapse on smaller screens
    const checkWidth = () => {
      if (window.innerWidth < 1024) setCollapsed(true);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const t = translations[lang] || translations.en;

  const navItems = [
    { href: '/admin', label: t.adminOverview, icon: <AppIcon name="LayoutDashboard" size={18} />, exact: true },
    { href: '/admin/posts', label: lang === 'vi' ? 'Bài viết' : 'Posts', icon: <AppIcon name="FileText" size={18} /> },
    { href: '/admin/documents', label: t.docManage, icon: <AppIcon name="BookOpen" size={18} /> },
    { href: '/admin/users', label: t.adminUsers, icon: <AppIcon name="Users" size={18} /> },
    { href: '/admin/categories', label: t.categories, icon: <AppIcon name="Tag" size={18} /> },
    { href: '/admin/moderation', label: t.adminModeration, icon: <AppIcon name="Shield" size={18} /> },
    { href: '/admin/settings', label: lang === 'vi' ? 'Cài đặt' : 'Settings', icon: <AppIcon name="Settings" size={18} /> },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', gap: 0 }}>
      {/* Sidebar Overlay for mobile */}
      {mobileMenuOpen && (
        <div 
          className="admin-sidebar-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          width: collapsed ? '64px' : '256px',
          minHeight: '100%',
          borderRight: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          transition: 'width 0.2s ease, transform 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: '72px',
          height: 'calc(100vh - 72px)',
          overflow: 'hidden',
          flexShrink: 0,
          zIndex: 41,
        }}
      >
        {/* Sidebar Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '16px 8px' : '16px 20px',
          borderBottom: '1px solid var(--border)',
          minHeight: '56px',
        }}>
          {!collapsed && (
            <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              {t.adminDashboard}
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="admin-sidebar-toggle"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', transition: 'var(--transition)',
            }}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <AppIcon name="ChevronRight" size={16} /> : <AppIcon name="ChevronLeft" size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`admin-nav-item ${isActive(item.href, item.exact) ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? '0' : '12px',
                padding: collapsed ? '10px' : '10px 14px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: isActive(item.href, item.exact) ? 700 : 500,
                color: isActive(item.href, item.exact) ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: isActive(item.href, item.exact) ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                textDecoration: 'none',
                transition: 'var(--transition)',
                justifyContent: collapsed ? 'center' : 'flex-start',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              title={collapsed ? item.label : undefined}
            >
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Back to site */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 8px' }}>
          <Link
            href="/"
            className="admin-nav-item"
            style={{
              display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '12px',
              padding: collapsed ? '10px' : '10px 14px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)',
              textDecoration: 'none', transition: 'var(--transition)',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            title={collapsed ? (lang === 'vi' ? 'Về trang chủ' : 'Back to Site') : undefined}
          >
            <AppIcon name="Home" size={18} />
            {!collapsed && <span>{lang === 'vi' ? 'Về trang chủ' : 'Back to Site'}</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile bottom toggle */}
      <button
        className="admin-mobile-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: 'none',
          position: 'fixed', bottom: '20px', left: '20px', zIndex: 50,
          width: '48px', height: '48px', borderRadius: '50%',
          backgroundColor: 'var(--primary)', border: 'none',
          color: '#fff', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <AppIcon name="LayoutDashboard" size={18} />
      </button>

      {/* Main Content */}
      <div className="admin-main" style={{ flex: 1, minWidth: 0, padding: '32px', overflow: 'auto' }}>
        {children}
      </div>

      <style jsx global>{`
        @media (max-width: 1024px) {
          .admin-sidebar {
            position: fixed !important;
            left: 0;
            top: 72px;
            transform: translateX(-100%);
            z-index: 41;
            width: 256px !important;
          }
          .admin-sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          .admin-sidebar-toggle {
            display: none !important;
          }
          .admin-mobile-toggle {
            display: flex !important;
          }
          .admin-main {
            padding: 20px !important;
          }
        }
        .admin-nav-item:hover {
          background-color: var(--surface-hover) !important;
          color: var(--text) !important;
        }
        .admin-nav-item.active:hover {
          background-color: rgba(16, 185, 129, 0.12) !important;
        }
        .admin-sidebar-toggle:hover {
          background-color: var(--surface-hover) !important;
          color: var(--text) !important;
        }
      `}</style>
    </div>
  );
}
