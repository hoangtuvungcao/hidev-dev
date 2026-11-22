export const dynamic = 'force-dynamic';
export const revalidate = 0;
import Link from 'next/link';
import { getSiteConfig } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';
import { getCategories } from '@/lib/categories';
import { getFeedPosts } from '@/lib/posts';
import { Post, Category } from '@/types';
import DbErrorNotice from '@/components/DbErrorNotice';
import PostGridClient from './post-grid-client';
import { translations } from '@/lib/i18n';
import { detectLanguageServer } from '@/lib/i18n-server';

interface PageProps {
  searchParams: Promise<{ search?: string; category?: string; sort?: string; page?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const config = await getSiteConfig();
  const user = await getCurrentUser();
  const lang = await detectLanguageServer();
  
  const resolvedSearchParams = await searchParams;
  const searchTerm = resolvedSearchParams.search || '';
  const categorySlug = resolvedSearchParams.category || '';
  const sort = resolvedSearchParams.sort === 'new' ? 'new' : 'hot';
  const page = parseInt(resolvedSearchParams.page || '1', 10) || 1;
  const limit = 12; // 12 posts per page
  const offset = (page - 1) * limit;

  const t = translations[lang] || translations.en;

  let dbError = '';
  let posts: Post[] = [];
  let categories: Category[] = [];
  let totalPosts = 0;

  try {
    // 1. Fetch categories (cached)
    categories = await getCategories();

    // 2. Fetch total count of approved posts matching filters
    const { getFeedPostsCount } = await import('@/lib/posts');
    totalPosts = await getFeedPostsCount({ categorySlug, searchTerm });

    // 3. Fetch posts with optimized query, limit, and offset
    posts = await getFeedPosts({
      userId: user?.id,
      categorySlug,
      searchTerm,
      sort,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Home page database error:', error);
    dbError = error.message;

    // Load static fallback mock data for preview if database fails
    posts = [
      {
        id: 1,
        title: lang === 'vi' ? 'Hướng dẫn sử dụng JSON Formatter' : 'JSON Formatting Tool - Web DevToys',
        slug: 'json-formatting-tool-web-devtoys',
        summary: lang === 'vi' 
          ? 'Định dạng, thu nhỏ và kiểm tra tính hợp lệ JSON chạy 100% client-side, hỗ trợ chuyển đổi YAML.'
          : 'JSON formatting, minifying, and validation tool running 100% client-side. Supports YAML conversion.',
        link: 'https://hidev.dev/tools/json',
        thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
        content: '',
        author_id: 1,
        category_id: 1,
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        username: 'admin',
        category_name: 'Developer Tools',
        upvotes_count: 42,
        comments_count: 5,
        has_upvoted: false
      },
      {
        id: 2,
        title: 'Phosphor Icons - Premium Vector Icons',
        slug: 'phosphor-icons-premium-vector-icons',
        summary: lang === 'vi'
          ? 'Bộ sưu tập icon dạng vector chất lượng cao, cực kỳ đa dạng và dễ sử dụng cho lập trình viên frontend.'
          : 'A flexible, premium family of vector icons for interfaces, styled cleanly for modern frontend.',
        link: 'https://phosphoricons.com',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        content: '',
        author_id: 1,
        category_id: 5,
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        username: 'admin',
        category_name: 'UI/UX Resources',
        upvotes_count: 28,
        comments_count: 2,
        has_upvoted: false
      }
    ];

    categories = [
      { id: 1, name: 'Developer Tools', slug: 'developer-tools' },
      { id: 2, name: 'AI Tools', slug: 'ai-tools' },
      { id: 3, name: 'Libraries & Frameworks', slug: 'libraries-frameworks' },
      { id: 4, name: 'Web Applications', slug: 'web-applications' },
      { id: 5, name: 'UI/UX Resources', slug: 'ui-ux-resources' }
    ];
  }

  // Get active category name if filtered
  const activeCategory = categorySlug 
    ? categories.find(c => c.slug === categorySlug)?.name 
    : '';

  const headerTitle = searchTerm 
    ? `${t.searchResults} "${searchTerm}"` 
    : activeCategory 
      ? `${t.categoryTools}${activeCategory}` 
      : t.allTools;

  return (
    <div>
      {dbError && <DbErrorNotice errorMessage={dbError} />}

      {/* Hero Banner Section */}
      <section className="hero-banner">
        <div className="hero-content">
          <span className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', color: 'var(--primary)' }}>
              <path d="M4.5 16.5c-1.5 1.25-2.5 3.5-2.5 3.5s2.25-1 3.5-2.5L18 5l-3-3L4.5 16.5z" />
              <path d="M12 9l6 6" />
              <path d="M9 15l3-3" />
              <path d="M19 3a2.1 2.1 0 0 1 2 2" />
            </svg>
            {t.heroBadge}
          </span>
          <h1 className="hero-title">
            {t.heroTitle} {config.siteName}
          </h1>
          <p className="hero-subtitle">
            {t.heroSubtitle}
          </p>
          <p className="hero-description" style={{ 
            fontSize: '14.5px', 
            lineHeight: '1.8', 
            color: 'var(--text-muted)', 
            maxWidth: '780px', 
            margin: '0 auto 16px auto',
            opacity: 0.85
          }}>
            {t.heroDescription}
          </p>
          <p style={{ 
            fontSize: '15px', 
            lineHeight: '1.7', 
            color: 'var(--text-secondary)', 
            maxWidth: '680px', 
            margin: '0 auto 28px auto',
            fontWeight: 500
          }}>
            {t.heroCta}
          </p>

          {/* CTA Buttons */}
          <div className="hero-cta-row" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'center',
            marginTop: '8px'
          }}>
            <Link href="/" className="btn btn-primary" style={{ padding: '10px 22px', fontSize: '13.5px', fontWeight: 700 }}>
              {t.heroExploreArticles}
            </Link>
            <Link href="/documents" className="btn btn-secondary" style={{ padding: '10px 22px', fontSize: '13.5px', fontWeight: 700 }}>
              {t.heroDiscoverResources}
            </Link>
            {user ? (
              <Link href="/submit" className="btn btn-secondary" style={{ padding: '10px 22px', fontSize: '13.5px', fontWeight: 700 }}>
                {t.heroStartWriting}
              </Link>
            ) : (
              <Link href="/login" className="btn btn-secondary" style={{ padding: '10px 22px', fontSize: '13.5px', fontWeight: 700 }}>
                {t.heroJoinCommunity}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Title & Filter Header with Sort Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '14px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: 0 }}>
          {headerTitle}
        </h2>

        {/* Sorting Tabs & Result Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="sort-tab-container">
            <Link 
              href={categorySlug ? `/categories/${categorySlug}?sort=hot${searchTerm ? `&search=${searchTerm}` : ''}` : `/?sort=hot${searchTerm ? `&search=${searchTerm}` : ''}`}
              className={`sort-tab-link ${sort === 'hot' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
              {lang === 'vi' ? 'Nổi bật' : 'Hot'}
            </Link>
            <Link 
              href={categorySlug ? `/categories/${categorySlug}?sort=new${searchTerm ? `&search=${searchTerm}` : ''}` : `/?sort=new${searchTerm ? `&search=${searchTerm}` : ''}`}
              className={`sort-tab-link ${sort === 'new' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {lang === 'vi' ? 'Mới nhất' : 'New'}
            </Link>
          </div>
          
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {t.showResults.replace('{n}', String(totalPosts))}
          </span>
        </div>
      </div>

      {/* Post Grid Client Wrapper */}
      <PostGridClient initialPosts={posts} loggedIn={!!user} lang={lang} />

      {/* Pagination controls */}
      {(() => {
        const totalPages = Math.ceil(totalPosts / limit);
        if (totalPages <= 1) return null;

        return (
          <div className="pagination-container" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '40px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            {/* Previous Page Link */}
            {page > 1 ? (
              <Link
                href={
                  categorySlug 
                    ? `/categories/${categorySlug}?page=${page - 1}&sort=${sort}${searchTerm ? `&search=${searchTerm}` : ''}`
                    : `/?page=${page - 1}&sort=${sort}${searchTerm ? `&search=${searchTerm}` : ''}`
                }
                className="pagination-btn"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'var(--transition)'
                }}
              >
                {lang === 'vi' ? '‹ Trước' : '‹ Prev'}
              </Link>
            ) : (
              <span
                className="pagination-btn disabled"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'not-allowed',
                  opacity: 0.5
                }}
              >
                {lang === 'vi' ? '‹ Trước' : '‹ Prev'}
              </span>
            )}

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
              // Only show current page, 2 pages before, 2 pages after, first page, and last page
              const isVisible = pNum === 1 || pNum === totalPages || Math.abs(pNum - page) <= 2;
              
              if (!isVisible) {
                // Render ellipsis if needed
                if (pNum === 2 || pNum === totalPages - 1) {
                  return (
                    <span key={`ellipsis-${pNum}`} style={{ color: 'var(--text-muted)', padding: '0 8px' }}>
                      ...
                    </span>
                  );
                }
                return null;
              }

              const isActive = pNum === page;
              return (
                <Link
                  key={pNum}
                  href={
                    categorySlug
                      ? `/categories/${categorySlug}?page=${pNum}&sort=${sort}${searchTerm ? `&search=${searchTerm}` : ''}`
                      : `/?page=${pNum}&sort=${sort}${searchTerm ? `&search=${searchTerm}` : ''}`
                  }
                  className={`pagination-btn ${isActive ? 'active' : ''}`}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: isActive ? 'var(--primary)' : 'var(--bg-card)',
                    color: isActive ? '#fff' : 'var(--text)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'var(--transition)'
                  }}
                >
                  {pNum}
                </Link>
              );
            })}

            {/* Next Page Link */}
            {page < totalPages ? (
              <Link
                href={
                  categorySlug
                    ? `/categories/${categorySlug}?page=${page + 1}&sort=${sort}${searchTerm ? `&search=${searchTerm}` : ''}`
                    : `/?page=${page + 1}&sort=${sort}${searchTerm ? `&search=${searchTerm}` : ''}`
                }
                className="pagination-btn"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'var(--transition)'
                }}
              >
                {lang === 'vi' ? 'Sau ›' : 'Next ›'}
              </Link>
            ) : (
              <span
                className="pagination-btn disabled"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'not-allowed',
                  opacity: 0.5
                }}
              >
                {lang === 'vi' ? 'Sau ›' : 'Next ›'}
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
