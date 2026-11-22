import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { SITE_CONFIG_TAG } from '@/lib/settings';

// Secure input validation for qr_donation
function validateQrDonation(url: string): boolean {
  if (!url) return true; // empty/null is allowed (disables the feature)
  
  // Prevent HTML/script injection
  if (/[<>"'`]/.test(url)) return false;
  if (url.toLowerCase().startsWith('javascript:')) return false;

  // Must be local upload path or secure external HTTPS URL
  const isHttps = url.startsWith('https://');
  const isRelative = url.startsWith('/') && !url.startsWith('//'); // prevent protocol-relative (e.g. //evil.com)

  if (!isHttps && !isRelative) return false;

  // Extension check (PNG, JPG, JPEG, WEBP)
  const cleanUrl = url.split('?')[0]; // strip query parameters
  const dotIndex = cleanUrl.lastIndexOf('.');
  if (dotIndex === -1) return false;
  
  const extension = cleanUrl.slice(dotIndex).toLowerCase();
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

  return allowedExtensions.includes(extension);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const rows = await query('SELECT key_name, value FROM settings');
    const settingsObj: Record<string, string> = {};
    if (Array.isArray(rows)) {
      for (const row of rows as any[]) {
        settingsObj[row.key_name] = row.value || '';
      }
    }
    return NextResponse.json(settingsObj);
  } catch (error: any) {
    console.error('Admin get settings error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

async function handleUpdateSettings(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await req.json();

    const allowedKeys = [
      'site_name',
      'site_domain',
      'site_email',
      'site_phone',
      'seo_title',
      'seo_description',
      'seo_keywords',
      'site_logo',
      'site_icon',
      'footer_text',
      'qr_donation',
    ];

    // Validate QR Donation if provided
    if ('qr_donation' in body) {
      const qrVal = body.qr_donation !== undefined && body.qr_donation !== null ? String(body.qr_donation).trim() : '';
      if (qrVal && !validateQrDonation(qrVal)) {
        return NextResponse.json(
          { error: 'Mã QR không hợp lệ. Chỉ chấp nhận liên kết ảnh bảo mật (HTTPS), đường dẫn tệp tải lên cục bộ hợp lệ và định dạng PNG, JPG, JPEG, WEBP.' },
          { status: 400 }
        );
      }
      body.qr_donation = qrVal; // set trimmed value
    }

    // Build batch insert query
    for (const key of allowedKeys) {
      if (key in body) {
        const val = body[key] !== undefined && body[key] !== null ? String(body[key]) : '';
        await query(
          'INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
          [key, val, val]
        );
      }
    }

    // Bust the cached site config so the new values show up immediately.
    (revalidateTag as any)(SITE_CONFIG_TAG);
    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true, message: 'Đã cập nhật cài đặt website thành công!' });
  } catch (error: any) {
    console.error('Admin update settings error:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleUpdateSettings(req);
}

export async function PATCH(req: NextRequest) {
  return handleUpdateSettings(req);
}
