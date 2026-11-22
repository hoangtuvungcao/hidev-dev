/**
 * SEO Configuration for hi_dev. Production Environment
 * This file documents all SEO optimizations and crawlability settings
 */

export const seoConfig = {
  // Core Site Information
  siteName: 'hi_dev.',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://hidev.dev',
  siteEmail: 'contact@hidev.dev',
  sitePhone: '+84-862004792',

  // Meta Information
  meta: {
    titleTemplate: '%s | hi_dev.',
    defaultTitle: 'hi_dev. - Developer Tools Community',
    description: 'A community platform to share, upvote, and discover developer tools and open-source libraries.',
    keywords: [
      'developer tools',
      'programming articles',
      'open source libraries',
      'JavaScript',
      'TypeScript',
      'Python',
      'Go',
      'Rust',
      'web development',
      'API documentation',
      'frontend development',
      'backend development',
      'DevOps tools',
      'database libraries',
      'software development',
      'code utilities',
      'tech community',
    ],
  },

  // Language Support
  languages: {
    vi: {
      title: 'hi_dev. - Cộng đồng bài viết lập trình',
      description:
        'Nền tảng chia sẻ và đánh giá các bài viết về phát triển phần mềm, thư viện mã nguồn mở hữu ích.',
      locale: 'vi_VN',
    },
    en: {
      title: 'hi_dev. - Developer Tools Community',
      description: 'A community platform to share, upvote, and discover developer tools and open-source libraries.',
      locale: 'en_US',
    },
  },

  // Canonical URLs
  canonical: {
    home: '/',
    posts: '/posts/[slug]',
    categories: '/categories/[slug]',
    users: '/users/[username]',
    search: '/search',
  },

  // Robots Configuration
  robots: {
    index: true,
    follow: true,
    maxSnippet: -1,
    maxImagePreview: 'large',
    maxVideoPreview: -1,
  },

  // Crawl Settings
  crawl: {
    // Allowed paths for crawlers
    allowedPaths: [
      '/',
      '/api/posts',
      '/categories/*',
      '/posts/*',
      '/users/*',
      '/search',
      '/rss.xml',
      '/sitemap.xml',
      '/manifest.json',
    ],

    // Disallowed paths (robots.txt)
    disallowedPaths: [
      '/admin/*',
      '/submit/*',
      '/profile/*',
      '/login*',
      '/api/auth/*',
      '/api/admin/*',
      '/api/notifications/*',
      '/api/users/profile',
      '/api/users/change-password',
      '/*.json$',
      '/*.tsx$',
      '/*.ts$',
    ],

    // Crawl delay (seconds)
    crawlDelay: 1,

    // User agents to prioritize
    priorityAgents: [
      'Googlebot',
      'Bingbot',
      'GPTBot', // OpenAI
      'Claude-Web', // Anthropic
      'CCBot', // Common Crawl
      'anthropic-ai',
    ],

    // Sitemaps
    sitemaps: ['/sitemap.xml', '/rss.xml'],
  },

  // Social Media Meta Tags
  social: {
    twitter: {
      handle: '@hidev_dev',
      card: 'summary_large_image',
    },
    openGraph: {
      type: 'website',
      imageWidth: 1200,
      imageHeight: 630,
      imageType: 'image/png',
    },
  },

  // Schema.org Structured Data
  schema: {
    organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'hi_dev.',
      url: 'https://hidev.dev',
      logo: 'https://hidev.dev/logo.png',
      description:
        'A community platform to share, upvote, and discover developer tools and open-source libraries.',
      sameAs: ['https://github.com/hidev-dev', 'https://twitter.com/hidev_dev'],
    },

    website: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'hi_dev.',
      url: 'https://hidev.dev',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://hidev.dev/?search={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },

    collectionPage: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Developer Posts',
      description: 'Collection of developer tool posts and articles',
    },

    article: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      // Individual articles use Post type with dynamic data
    },
  },

  // Performance & Caching
  cache: {
    rss: {
      clientMaxAge: 3600, // 1 hour
      serverMaxAge: 1800, // 30 minutes
    },
    sitemap: {
      clientMaxAge: 3600,
      serverMaxAge: 1800,
    },
    posts: {
      clientMaxAge: 300, // 5 minutes
      serverMaxAge: 60, // 1 minute (for freshness)
    },
  },

  // Content Optimization
  content: {
    minSummaryLength: 20,
    maxSummaryLength: 160,
    minTitleLength: 10,
    maxTitleLength: 70,
    minDescriptionLength: 30,
    maxDescriptionLength: 155,
  },

  // Pagination for SEO
  pagination: {
    postsPerPage: 20,
    maxPages: 100, // Prevent crawling infinite pages
  },

  // Image Optimization
  images: {
    formats: ['webp', 'jpeg', 'png'],
    thumbnailSizes: [52, 80, 150, 300],
    densities: [1, 2], // For retina displays
  },

  // Bilingual Configuration
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'vi'],
    localePath: '/',
  },

  // Headers for SEO
  headers: {
    'X-UA-Compatible': 'IE=edge',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },
};

// Helper functions for SEO
export const generateCanonicalUrl = (path: string) => {
  const baseUrl = seoConfig.siteUrl;
  return `${baseUrl}${path}`;
};

export const generateMetaDescription = (text: string) => {
  if (text.length > seoConfig.content.maxDescriptionLength) {
    return text.substring(0, seoConfig.content.maxDescriptionLength - 3) + '...';
  }
  return text;
};

export const generateOpenGraphImage = (postTitle?: string) => {
  if (postTitle) {
    // Could generate dynamic OG images
    return `${seoConfig.siteUrl}/logo.png`;
  }
  return `${seoConfig.siteUrl}/logo.png`;
};

export default seoConfig;
