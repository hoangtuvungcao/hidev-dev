import type { Metadata } from 'next';
import { getSiteConfig } from '@/lib/settings';
import { detectLanguageServer } from '@/lib/i18n-server';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = await getSiteConfig();
  const lang = await detectLanguageServer();

  let domain = config.siteDomain || 'hidev.dev';
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }

  // Fetch problem details from the LeetCode backend for dynamic metadata
  const primaryUrl = (process.env.INTERNAL_LEETCODE_URL || process.env.NEXT_PUBLIC_LEETCODE_URL || 'https://leetcode.vutrungocrong.fun').replace(/\/$/, '');
  const fallbackUrl = 'http://103.77.246.184:5005';

  let problemTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  let problemDifficulty = '';
  let problemTopics: string[] = [];

  try {
    let data: any = null;
    try {
      const res = await fetch(`${primaryUrl}/api/problems/${slug}`, { next: { revalidate: 3600 } });
      if (res.ok) data = await res.json();
    } catch {}

    if (!data || !data.title) {
      const res = await fetch(`${fallbackUrl}/api/problems/${slug}`, { next: { revalidate: 3600 } });
      if (res.ok) data = await res.json();
    }

    if (data) {
      if (data.title) problemTitle = data.title;
      if (data.difficulty) problemDifficulty = data.difficulty;
      if (data.topics) problemTopics = data.topics;
    }
  } catch {
    // Fallback to slug-based title
  }

  const title = lang === 'vi'
    ? `${problemTitle}${problemDifficulty ? ` (${problemDifficulty})` : ''} - Luyện Thuật Toán`
    : `${problemTitle}${problemDifficulty ? ` (${problemDifficulty})` : ''} - Algorithm Practice`;

  const description = lang === 'vi'
    ? `Giải bài tập thuật toán "${problemTitle}" trực tuyến với trình biên dịch đa ngôn ngữ. ${problemTopics.length > 0 ? `Chủ đề: ${problemTopics.join(', ')}.` : ''} Hỗ trợ JavaScript, Python, C++, Java, Go, Rust và nhiều ngôn ngữ khác.`
    : `Solve "${problemTitle}" algorithm problem online with a multi-language compiler. ${problemTopics.length > 0 ? `Topics: ${problemTopics.join(', ')}.` : ''} Supports JavaScript, Python, C++, Java, Go, Rust and more.`;

  const ogImageUrl = `${domain}/logo.png`;

  return {
    title,
    description,
    keywords: [
      problemTitle,
      ...(problemTopics || []),
      'leetcode', 'algorithm', 'data structure', 'coding practice',
      'JavaScript', 'Python', 'C++', 'Java', 'Go', 'Rust',
    ].join(', '),
    alternates: {
      canonical: `/leetcode/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/leetcode/${slug}`,
      siteName: config.siteName,
      locale: lang === 'vi' ? 'vi_VN' : 'en_US',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: problemTitle,
        }
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function LeetcodeSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
