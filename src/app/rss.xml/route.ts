import { query } from '@/lib/db';
import { getSiteConfig } from '@/lib/settings';

interface FeedPost {
  title: string;
  slug: string;
  summary: string;
  created_at: string;
  username: string;
}

export async function GET() {
  try {
    const config = await getSiteConfig();
    let domain = config.siteDomain || 'hidev.dev';
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = 'https://' + domain;
    }

    const posts = await query<FeedPost[]>(
      `SELECT p.title, p.slug, p.summary, p.created_at, u.username 
       FROM posts p 
       JOIN users u ON p.author_id = u.id 
       WHERE p.status = 'approved' 
       ORDER BY p.created_at DESC 
       LIMIT 50`
    );

    const itemsXml = Array.isArray(posts)
      ? posts
          .map(
            (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${domain}/posts/${post.slug}</link>
      <guid>${domain}/posts/${post.slug}</guid>
      <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(post.username)}</dc:creator>
      <description>${escapeXml(post.summary)}</description>
    </item>`
          )
          .join('')
      : '';

    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(config.siteName || 'hi_dev.')}</title>
    <link>${domain}</link>
    <description>${escapeXml(config.seoDescription || 'Developer Hub')}</description>
    <language>vi</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${domain}/rss.xml" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`;

    return new Response(rssXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=1800',
      },
    });
  } catch (error: any) {
    console.error('Error generating RSS feed:', error);
    return new Response('Error generating RSS feed', { status: 500 });
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
