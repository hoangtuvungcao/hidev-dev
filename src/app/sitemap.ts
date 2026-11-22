export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { MetadataRoute } from 'next';
import { query } from '@/lib/db';
import { getSiteConfig } from '@/lib/settings';

interface SitemapPost {
  slug: string;
  updated_at: string;
}

interface SitemapCategory {
  slug: string;
}

interface SitemapUser {
  username: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = await getSiteConfig();
  
  let domain = config.siteDomain || 'hidev.dev';
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }

  const routes: MetadataRoute.Sitemap = [
    {
      url: domain,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${domain}/leetcode`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${domain}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    }
  ];

  try {
    // 1. Fetch approved posts
    const posts = await query<SitemapPost[]>(
      "SELECT slug, updated_at FROM posts WHERE status = 'approved'"
    );

    if (Array.isArray(posts)) {
      for (const post of posts) {
        routes.push({
          url: `${domain}/posts/${post.slug}`,
          lastModified: new Date(post.updated_at || new Date()),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }

    // 2. Fetch categories
    const categories = await query<SitemapCategory[]>(
      "SELECT slug FROM categories"
    );

    if (Array.isArray(categories)) {
      for (const cat of categories) {
        routes.push({
          url: `${domain}/categories/${cat.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }

    // 3. Fetch public user profiles
    const users = await query<SitemapUser[]>(
      "SELECT username FROM users"
    );

    if (Array.isArray(users)) {
      for (const u of users) {
        routes.push({
          url: `${domain}/users/${u.username}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.4,
        });
      }
    }

    // 4. Fetch LeetCode problems from backend dynamically
    const primaryUrl = (process.env.INTERNAL_LEETCODE_URL || process.env.NEXT_PUBLIC_LEETCODE_URL || 'https://leetcode.vutrungocrong.fun').replace(/\/$/, '');
    const fallbackUrl = 'http://103.77.246.184:5005';
    
    try {
      let items: any[] = [];
      try {
        const res = await fetch(`${primaryUrl}/api/problems?limit=5000`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.items)) items = data.items;
        }
      } catch {}

      // Fallback if primary domain URL is protected by Cloudflare bot challenge on server-side
      if (items.length === 0) {
        const res = await fetch(`${fallbackUrl}/api/problems?limit=5000`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.items)) items = data.items;
        }
      }

      for (const item of items) {
        routes.push({
          url: `${domain}/leetcode/${item.problem_slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    } catch (e) {
      console.warn('Could not fetch LeetCode problems for sitemap:', e);
    }
  } catch (error) {
    console.warn('Could not fetch posts/categories/users/leetcode for sitemap, generating static only:', error);
  }

  return routes;
}
