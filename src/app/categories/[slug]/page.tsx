import { Metadata } from 'next';
import { getSiteConfig } from '@/lib/settings';
import { getCategories } from '@/lib/categories';
import { detectLanguageServer } from '@/lib/i18n-server';
import Home from '../../page';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ search?: string; sort?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const config = await getSiteConfig();
  const lang = await detectLanguageServer();

  let name = slug;
  try {
    const categories = await getCategories();
    const category = categories.find(c => c.slug === slug);
    if (category) {
      name = category.name;
    }
  } catch (e) {
    console.warn('Could not fetch category name for metadata:', e);
  }

  const title = lang === 'vi'
    ? `Bài viết trong mục ${name} | ${config.siteName || 'hi_dev.'}`
    : `${name} Posts | ${config.siteName || 'hi_dev.'}`;

  const desc = lang === 'vi'
    ? `Khám phá các bài viết phát triển phần mềm, sản phẩm công nghệ và tiện ích lập trình thuộc nhóm ${name}.`
    : `Explore software development articles, tech products, and developer utilities under the ${name} category.`;

  let domain = config.siteDomain || 'hidev.dev';
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }

  const ogImageUrl = config.siteLogo.startsWith('/') ? `${domain}${config.siteLogo}` : config.siteLogo;

  return {
    title,
    description: desc,
    alternates: {
      canonical: `/categories/${slug}`,
    },
    openGraph: {
      title,
      description: desc,
      url: `/categories/${slug}`,
      siteName: config.siteName,
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${name} category`,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImageUrl],
    }
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  // We reuse the Home component page by forwarding parameters including sort
  const pageSearchParams = Promise.resolve({
    search: resolvedSearchParams.search,
    category: resolvedParams.slug,
    sort: resolvedSearchParams.sort
  });

  return <Home searchParams={pageSearchParams} />;
}
