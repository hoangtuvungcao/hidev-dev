import { MetadataRoute } from 'next';
import { getSiteConfig } from '@/lib/settings';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await getSiteConfig();
  
  let domain = config.siteDomain || 'hidev.dev';
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }

  const aiBots = [
    'GPTBot',
    'ClaudeBot',
    'Claude-Web',
    'Applebot-extended',
    'OAI-SearchBot',
    'CCBot',
    'cohere-ai',
    'anthropic-ai'
  ];

  const baseDisallows = [
    '/api/',
  ];

  const rules = [
    {
      userAgent: '*',
      allow: '/',
      disallow: [
        ...baseDisallows,
        '/search',
      ],
    },
    {
      userAgent: 'Googlebot',
      allow: '/',
      disallow: baseDisallows,
    },
    {
      userAgent: 'Bingbot',
      allow: '/',
      disallow: baseDisallows,
    },
    ...aiBots.map(bot => ({
      userAgent: bot,
      allow: '/',
      disallow: baseDisallows,
    }))
  ];

  return {
    rules,
    sitemap: `${domain}/sitemap.xml`,
  };
}
