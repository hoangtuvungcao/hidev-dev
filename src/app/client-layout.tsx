'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, Category, SiteConfig, Post } from '../types';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { NotificationToast } from '@/components/NotificationToast';
import ScrollToTop from '@/components/ScrollToTop';
import { ToastProvider } from '@/components/Toast';
import Image from 'next/image';

// Custom inline SVGs instead of Phosphor Icons
const IconCompass = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
);
const IconArticle = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);
const IconCaretDown = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ marginLeft: '4px' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
);
const IconPlusCircle = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
);
const IconBookOpen = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
);
const IconGear = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);
const IconSearch = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const IconSun = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
);
const IconMoon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
);
const IconX = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const IconList = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
);
const IconSignOut = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

// Global CSRF fetch interceptor
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const method = (init?.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const cookies = document.cookie.split(';');
      const csrfCookie = cookies.find(c => c.trim().startsWith('csrf_token='));
      if (csrfCookie) {
        const token = csrfCookie.trim().split('=')[1];
        if (token) {
          init = init || {};
          const headers = new Headers(init.headers);
          if (!headers.has('x-csrf-token')) {
            headers.set('x-csrf-token', token);
            init.headers = headers;
          }
        }
      }
    }
    return originalFetch(input, init);
  };
}

interface ClientLayoutProps {
  children: React.ReactNode;
  user: User | null;
  config: SiteConfig;
  categories: Category[];
}

export default function ClientLayout({ children, user, config, categories: initialCategories }: ClientLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [lang, setLang] = useState<Language>('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [cmdResults, setCmdResults] = useState<Post[]>([]);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const [categories, setCategories] = useState<Category[]>(initialCategories);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  const catRef = useRef<HTMLDivElement>(null);
  const catMenuRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    const initialLang = detectLanguageClient();
    setLang(initialLang);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(event.target as Node) && catMenuRef.current && !catMenuRef.current.contains(event.target as Node)) {
        setCatDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    if (catDropdownOpen && catRef.current && catMenuRef.current) {
      const rect = catRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 12,
        left: Math.max(12, rect.left + rect.width / 2 - 140)
      });
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [catDropdownOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCmdResults([]);
      return;
    }

    const controller = new AbortController();
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/posts?search=${encodeURIComponent(searchQuery)}&limit=5`, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load search posts (status: ${res.status})`);
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setCmdResults(data);
          }
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          console.error('Error fetching posts for search:', err);
        });
    }, 250);

    return () => {
      clearTimeout(delayDebounceFn);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('oauth_success')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      setTimeout(() => {
        window.location.reload();
      }, 0);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('hidev_lang', newLang);
    document.cookie = `hidev_lang=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/';
      }
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearchFocused(false);
      router.push(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const t = translations[lang] || translations.en;
  const isLeetcodeWorkspace = pathname?.startsWith('/leetcode/') && pathname !== '/leetcode';

  return (
    <ToastProvider>
      <div className="app-container">
        {/* Top Floating Navigation Header */}
        <header className="floating-nav">
          {/* Left Section: Branding Logo */}
          <Link href="/" className="logo-container">
            {!logoError && (
              <Image
                src={config.siteLogo || '/logo.png'}
                alt="Logo"
                className="header-logo-img"
                width={150}
                height={56}
                onError={() => {
                  setLogoError(true);
                }}
              />
            )}
            <span className="logo-text">{config.siteName}</span>
            <span className="logo-dot"></span>
          </Link>

          {/* Center Section: Navigation Links */}
          <nav className="nav-menu-center">
            <Link href="/" className={`nav-menu-link ${pathname === '/' ? 'active' : ''}`}>
              <IconCompass /> {t.explore}
            </Link>

            {/* Categories Dropdown with State Click-Toggle */}
            <div className="dropdown-container" ref={catRef}>
              <span
                className={`nav-menu-link ${pathname.startsWith('/categories') ? 'active' : ''}`}
                onClick={() => setCatDropdownOpen(!catDropdownOpen)}
              >
                <IconArticle /> {t.categories} <IconCaretDown />
              </span>
              <ul
                ref={catMenuRef}
                className={`dropdown-menu ${catDropdownOpen ? 'active' : ''}`}
                style={{
                  top: `${dropdownPos.top}px`,
                  left: `${dropdownPos.left}px`
                }}
              >
                {categories.map(cat => (
                  <li key={cat.id}>
                    <Link
                      href={`/categories/${cat.slug}`}
                      className="dropdown-item-link"
                      onClick={() => setCatDropdownOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {user && (
              <Link href="/submit" className={`nav-menu-link ${pathname === '/submit' ? 'active' : ''}`}>
                <IconPlusCircle /> {t.submit}
              </Link>
            )}

            <Link href="/documents" className={`nav-menu-link ${pathname.startsWith('/documents') ? 'active' : ''}`}>
              <IconBookOpen /> {t.documents}
            </Link>

            {process.env.NEXT_PUBLIC_LEETCODE_URL && (
              <Link href="/leetcode" className={`nav-menu-link ${pathname.startsWith('/leetcode') ? 'active' : ''}`}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ marginRight: '6px' }}><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                {lang === 'vi' ? 'Luyện thuật toán' : 'LeetCode'}
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link href="/admin" className={`nav-menu-link ${pathname.startsWith('/admin') ? 'active' : ''}`}>
                <IconGear /> {t.adminPanel}
              </Link>
            )}
          </nav>

          {/* Right Section: Actions & Utilities */}
          <div className="nav-actions-right">
            {/* Real Writeable Search Bar (Direct Typing with Suggestions) */}
            <div className="search-input-wrapper desktop-only" ref={searchRef}>
              <IconSearch />
              <input
                type="text"
                className="header-search-input"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={handleSearchSubmit}
              />

              {/* Inline Suggestions dropdown */}
              {searchFocused && searchQuery.trim() && (
                <ul className="search-suggestions-box">
                  {cmdResults.length === 0 ? (
                    <li style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {lang === 'vi' ? 'Không tìm thấy gợi ý' : 'No suggestions found'}
                    </li>
                  ) : (
                    cmdResults.map(post => (
                      <li key={post.id}>
                        <Link
                          href={`/posts/${post.slug}`}
                          className="search-suggestion-item"
                          onClick={() => {
                            setSearchFocused(false);
                            setSearchQuery('');
                          }}
                        >
                          <IconArticle size={16} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                              {post.title}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '280px' }}>
                              {post.summary}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            {/* Language toggle pill */}
            <div className="lang-toggle-btn desktop-only">
              <span
                className={lang === 'vi' ? 'active' : ''}
                onClick={() => handleLanguageChange('vi')}
              >
                VI
              </span>
              <span
                className={lang === 'en' ? 'active' : ''}
                onClick={() => handleLanguageChange('en')}
              >
                EN
              </span>
            </div>

            {/* Real-time Notification bell integrated in the header */}
            {user && (
              <NotificationToast isInline={true} />
            )}

            {/* Light/Dark mode switcher */}
            <button className="theme-switch-icon desktop-only" onClick={toggleTheme} title={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}>
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>

            {/* User authentication pill */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', height: '40px', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
                <Link href="/profile" title={lang === 'vi' ? 'Hồ sơ của tôi' : 'My Profile'} style={{ display: 'flex', alignItems: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                    alt={user.username}
                    width={38}
                    height={38}
                    style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid rgba(16, 185, 129, 0.25)', backgroundColor: 'var(--border)', cursor: 'pointer', transition: 'var(--transition)' }}
                    className="avatar-hover-effect"
                  />
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="btn btn-secondary desktop-only"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {t.login}
              </Link>
            )}

            {/* Mobile menu icon */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-trigger"
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <IconX /> : <IconList />}
            </button>
          </div>

          {/* Mobile Navigation Drawer Dropdown */}
          {mobileMenuOpen && (
            <div className="mobile-nav-drawer">
              {/* Search Input for Mobile inside Drawer */}
              <div className="search-input-wrapper" style={{ width: '100%' }}>
                <IconSearch />
                <input
                  type="text"
                  className="header-search-input"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setMobileMenuOpen(false);
                      router.push(`/?search=${encodeURIComponent(searchQuery)}`);
                    }
                  }}
                />
              </div>

              <Link href="/" className="nav-item-link" onClick={() => setMobileMenuOpen(false)}>
                <IconCompass /> {t.explore}
              </Link>

              {user && (
                <Link href="/submit" className="nav-item-link" onClick={() => setMobileMenuOpen(false)}>
                  <IconPlusCircle /> {t.submit}
                </Link>
              )}

              <Link href="/documents" className="nav-item-link" onClick={() => setMobileMenuOpen(false)}>
                <IconBookOpen /> {t.documents}
              </Link>

              {process.env.NEXT_PUBLIC_LEETCODE_URL && (
                <Link href="/leetcode" className="nav-item-link" onClick={() => setMobileMenuOpen(false)}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ marginRight: '8px' }}><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                  {lang === 'vi' ? 'Luyện thuật toán' : 'LeetCode'}
                </Link>
              )}

              {user?.role === 'admin' && (
                <Link href="/admin" className="nav-item-link" onClick={() => setMobileMenuOpen(false)}>
                  <IconGear /> {t.adminPanel}
                </Link>
              )}

              <div style={{ borderTop: '1px solid var(--border)', padding: '12px 0 5px 0' }}>
                <span className="category-title" style={{ margin: '0 0 10px 10px', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t.categories}</span>
                <div className="mobile-category-grid">
                  {categories.map(cat => (
                    <Link
                      key={cat.id}
                      href={`/categories/${cat.slug}`}
                      className="dropdown-item-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', padding: '12px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {lang === 'vi' ? 'Giao diện & Ngôn ngữ' : 'Language & Appearance'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="lang-toggle-btn" style={{ margin: 0 }}>
                    <span
                      className={lang === 'vi' ? 'active' : ''}
                      onClick={() => handleLanguageChange('vi')}
                    >
                      VI
                    </span>
                    <span
                      className={lang === 'en' ? 'active' : ''}
                      onClick={() => handleLanguageChange('en')}
                    >
                      EN
                    </span>
                  </div>
                  <button
                    className="theme-switch-icon"
                    onClick={toggleTheme}
                    style={{ margin: 0, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', padding: '10px 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {user ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--text)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                        alt={user.username}
                        width={32}
                        height={32}
                        style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>@{user.username}</span>
                    </Link>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', marginLeft: 'auto' }}>
                      <IconSignOut />
                    </button>
                  </div>
                ) : (
                  <Link href="/login" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setMobileMenuOpen(false)}>
                    {t.login}
                  </Link>
                )}
              </div>
            </div>
          )}
        </header>

        {/* CSS adjustments helper for responsive layout (1200px breakpoint) */}
        <style jsx global>{`
          @media (max-width: 1200px) {
            .mobile-trigger {
              display: flex !important;
              align-items: center;
            }
            .desktop-only {
              display: none !important;
            }
          }
        `}</style>

        {/* Main Content Viewport */}
        <main className={`main-content page-fade-in ${isLeetcodeWorkspace ? 'full-width-workspace' : ''}`}>
          {children}
        </main>

        {/* Premium Responsive Footer */}
        {!isLeetcodeWorkspace && (
          <footer className="site-footer">
            <div className="footer-inner">
              <div className="footer-brand">
                <h3 className="logo-text" style={{ fontWeight: 800 }}>
                  {config.siteName}
                  <span className="logo-dot" style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginLeft: '2px' }}></span>
                </h3>
                <p>
                  {lang === 'vi'
                    ? 'Nền tảng chia sẻ và đánh giá các bài viết về phát triển phần mềm, thư viện mã nguồn mở hữu ích dành cho lập trình viên.'
                    : 'A curated community of developer articles, open-source libraries, code utilities and dev-oriented resources.'}
                </p>
              </div>
              <div className="footer-section">
                <h4>{lang === 'vi' ? 'Liên kết' : 'Explore'}</h4>
                <Link href="/documents">{lang === 'vi' ? 'Tài liệu' : 'Documents'}</Link>
                <Link href="/leetcode">{lang === 'vi' ? 'Luyện thuật toán' : 'Algorithm Practice'}</Link>
                <Link href="/submit">{lang === 'vi' ? 'Đăng bài' : 'New Post'}</Link>
              </div>
              <div className="footer-section">
                <h4>{lang === 'vi' ? 'Danh mục' : 'Categories'}</h4>
                {categories.slice(0, 4).map(cat => (
                  <Link key={cat.id} href={`/categories/${cat.slug}`}>
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="footer-bottom">
              <span>{config.footerText || `© ${new Date().getFullYear()} ${config.siteName}.`}</span>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span style={{ color: 'var(--text-muted)' }}>v1.0.0 Stable</span>
              </div>
            </div>
          </footer>
        )}

        {/* Scroll-to-top button */}
        <ScrollToTop />
      </div>
    </ToastProvider>
  );
}
