import type { Metadata } from 'next';
import { getSiteConfig } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';
import { getCategories } from '@/lib/categories';
import { Category } from '@/types';
import './globals.css';
import ClientLayout from './client-layout';
import { detectLanguageServer } from '@/lib/i18n-server';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const lang = await detectLanguageServer();
  
  let domain = config.siteDomain || 'hidev.dev';
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }

  // Choose appropriate title based on detected language
  const defaultTitle = lang === 'vi' 
    ? config.seoTitle || 'hi_dev. - Cộng đồng bài viết lập trình'
    : 'hi_dev. - Developer Tools Community';

  const defaultDesc = lang === 'vi'
    ? config.seoDescription || 'Nền tảng chia sẻ và đánh giá các bài viết về phát triển phần mềm, thư viện mã nguồn mở hữu ích.'
    : 'A community platform to share, upvote, and discover developer tools and open-source libraries.';

  const keywords = lang === 'vi'
    ? 'công cụ lập trình, bài viết phát triển phần mềm, thư viện mã nguồn mở, JavaScript, TypeScript, Python, Go, Rust, web development, API, frontend, backend, DevOps, database'
    : 'developer tools, programming articles, open source libraries, JavaScript, TypeScript, Python, Go, Rust, web development, API documentation, frontend development, backend development, DevOps tools, database libraries';

  const ogImageUrl = `${domain}/logo.png`;

  return {
    title: {
      default: defaultTitle,
      template: `%s | ${config.siteName || 'hi_dev.'}`,
    },
    description: defaultDesc,
    keywords: keywords,
    metadataBase: new URL(domain),
    alternates: {
      canonical: '/',
      languages: {
        'vi-VN': '/?lang=vi',
        'en-US': '/?lang=en',
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: defaultTitle,
      description: defaultDesc,
      url: '/',
      siteName: config.siteName,
      locale: lang === 'vi' ? 'vi_VN' : 'en_US',
      alternateLocale: lang === 'vi' ? ['en_US'] : ['vi_VN'],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: config.siteName,
          type: 'image/png',
        }
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: defaultTitle,
      description: defaultDesc,
      images: [ogImageUrl],
      creator: '@hidev_dev',
    },
    icons: {
      icon: [
        { url: config.siteIcon },
        { url: config.siteIcon, sizes: '192x192', type: 'image/png' },
      ],
      shortcut: config.siteIcon,
      apple: [
        { url: config.siteIcon, sizes: '180x180', type: 'image/png' }
      ],
    },
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSiteConfig();
  const user = await getCurrentUser();
  const lang = await detectLanguageServer();
  
  // Load categories for the layout (cached)
  const categories: Category[] = await getCategories();

  let domain = config.siteDomain || 'hidev.dev';
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }

  // Schema.org Website Structured Data
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': config.siteName,
    'url': domain,
    'description': lang === 'vi' ? config.seoDescription : 'Bilingual dev community tools',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${domain}/?search={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };

  // Schema.org Organization Structured Data
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': config.siteName,
    'url': domain,
    'logo': config.siteLogo.startsWith('/') ? `${domain}${config.siteLogo}` : config.siteLogo,
  };

  return (
    <html lang={lang} suppressHydrationWarning data-scroll-behavior="smooth" className={`${plusJakartaSans.variable} ${jetBrainsMono.variable}`}>
      <head>
        <meta name="theme-color" content="#10b981" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })()
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body>
        <ClientLayout user={user} config={config} categories={categories}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
