import { unstable_cache } from 'next/cache';
import { query } from './db';
import { SiteConfig } from '../types';

export const SITE_CONFIG_TAG = 'site-config';

async function loadSiteConfig(): Promise<SiteConfig> {
  const defaultConfig: SiteConfig = {
    siteName: 'hi_dev.',
    siteDomain: 'hidev.dev',
    siteEmail: 'contact@hidev.dev',
    sitePhone: '0862004792',
    seoTitle: 'hi_dev. - Cộng đồng chia sẻ bài viết lập trình & công nghệ',
    seoDescription: 'Nền tảng chia sẻ và đánh giá các bài viết về phát triển phần mềm, thư viện mã nguồn mở, tiện ích lập trình hữu ích dành cho các nhà phát triển.',
    seoKeywords: 'developer tools, bài viết lập trình, web dev, libraries, code tools',
    siteLogo: '/logo.png',
    siteIcon: '/icon.png',
    footerText: '© 2026 hi_dev. Bản quyền thuộc về cộng đồng lập trình viên.',
  };

  try {
    const rows = await query('SELECT key_name, value FROM settings');
    if (Array.isArray(rows) && rows.length > 0) {
      const config: Partial<SiteConfig> = {};
      
      const keyMap: Record<string, keyof SiteConfig> = {
        site_name: 'siteName',
        site_domain: 'siteDomain',
        site_email: 'siteEmail',
        site_phone: 'sitePhone',
        seo_title: 'seoTitle',
        seo_description: 'seoDescription',
        seo_keywords: 'seoKeywords',
        site_logo: 'siteLogo',
        site_icon: 'siteIcon',
        footer_text: 'footerText',
        qr_donation: 'qrDonation',
      };

      for (const row of rows as any[]) {
        const mappedKey = keyMap[row.key_name];
        if (mappedKey) {
          config[mappedKey] = row.value || '';
        }
      }

      return { ...defaultConfig, ...config };
    }
  } catch (error) {
    console.warn('Could not fetch settings from MySQL database, falling back to defaults:', error);
  }

  return defaultConfig;
}

// Cached across requests; invalidated via revalidateTag(SITE_CONFIG_TAG) when
// an admin saves settings, so a fresh SELECT only runs after an actual change
// instead of on every render.
export const getSiteConfig = unstable_cache(loadSiteConfig, ['site-config'], {
  tags: [SITE_CONFIG_TAG],
});
