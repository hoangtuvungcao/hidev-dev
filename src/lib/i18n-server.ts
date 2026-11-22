import { headers } from 'next/headers';
import { Language } from './i18n';

export async function detectLanguageServer(): Promise<Language> {
  try {
    const headersList = await headers();
    
    // Check custom cookie if saved
    const cookieHeader = headersList.get('cookie') || '';
    if (cookieHeader.includes('hidev_lang=vi')) return 'vi';
    if (cookieHeader.includes('hidev_lang=en')) return 'en';
    
    const acceptLanguage = headersList.get('accept-language') || '';
    if (acceptLanguage.toLowerCase().includes('vi')) {
      return 'vi';
    }
  } catch {}
  return 'en';
}
