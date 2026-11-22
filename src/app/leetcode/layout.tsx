import type { Metadata } from 'next';
import { getSiteConfig } from '@/lib/settings';
import { detectLanguageServer } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const lang = await detectLanguageServer();

  let domain = config.siteDomain || 'hidev.dev';
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }

  const title = lang === 'vi'
    ? 'Luyện Thuật Toán & Cấu Trúc Dữ Liệu Online'
    : 'Algorithm & Data Structure Practice Online';

  const description = lang === 'vi'
    ? 'Hệ thống luyện tập lập trình thuật toán chuẩn LeetCode với trình biên dịch đa ngôn ngữ trực tiếp. Hỗ trợ 2900+ bài tập, 11 ngôn ngữ: JavaScript, TypeScript, Python, C, C++, Java, Go, Rust, PHP, Ruby.'
    : 'Practice algorithms and data structures with a LeetCode-standard online judge supporting 2900+ problems and 11 programming languages: JavaScript, TypeScript, Python, C, C++, Java, Go, Rust, PHP, Ruby.';

  const ogImageUrl = `${domain}/logo.png`;

  return {
    title,
    description,
    keywords: lang === 'vi'
      ? 'luyện thuật toán, leetcode, cấu trúc dữ liệu, lập trình online, code online, JavaScript, Python, C++, Java, Go, Rust, competitive programming'
      : 'algorithm practice, leetcode, data structures, online coding, competitive programming, JavaScript, Python, C++, Java, Go, Rust',
    alternates: {
      canonical: '/leetcode',
    },
    openGraph: {
      title,
      description,
      url: '/leetcode',
      siteName: config.siteName,
      locale: lang === 'vi' ? 'vi_VN' : 'en_US',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        }
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function LeetcodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
