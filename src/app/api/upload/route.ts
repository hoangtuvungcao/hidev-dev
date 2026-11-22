import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ALLOWED_EXTENSIONS = new Set([
  // Documents
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  // Archives
  '.zip', '.rar',
  // Text
  '.txt', '.md',
  // Images
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
]);

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;
  
  const hex = buffer.toString('hex', 0, 8).toLowerCase();
  
  switch (ext) {
    case '.pdf':
      return hex.startsWith('25504446'); // %PDF
    case '.png':
      return hex.startsWith('89504e470d0a1a0a'); // PNG
    case '.jpg':
    case '.jpeg':
      return hex.startsWith('ffd8ff'); // JPEG
    case '.gif':
      return hex.startsWith('47494638'); // GIF8
    case '.webp':
      return hex.startsWith('52494646') && buffer.toString('utf8', 8, 12) === 'WEBP'; // RIFF....WEBP
    case '.zip':
    case '.docx':
    case '.xlsx':
    case '.pptx':
      return hex.startsWith('504b0304'); // PK.. (ZIP)
    case '.rar':
      return hex.startsWith('52617221'); // Rar!
    case '.doc':
    case '.xls':
    case '.ppt':
      return hex.startsWith('d0cf11e0'); // OLE header
    case '.svg':
      const text = buffer.toString('utf8', 0, Math.min(buffer.length, 512)).trim().toLowerCase();
      return text.includes('<svg') || text.includes('<?xml');
    case '.txt':
    case '.md':
      // Ensure no binary null bytes in first 512 bytes
      for (let i = 0; i < Math.min(buffer.length, 512); i++) {
        if (buffer[i] === 0) return false;
      }
      return true;
    default:
      return false;
  }
}

const limitCache = new Map<string, number[]>();

function checkUploadRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = 5;
  const windowMs = 60 * 1000; // 1 minute
  
  const timestamps = limitCache.get(ip) || [];
  const valid = timestamps.filter(t => now - t < windowMs);
  
  if (valid.length >= limit) {
    limitCache.set(ip, valid);
    return true;
  }
  
  valid.push(now);
  limitCache.set(ip, valid);
  
  // Prune cache to avoid leaks
  if (limitCache.size > 2000) {
    limitCache.clear();
  }
  
  return false;
}

function sendResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status });
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (checkUploadRateLimit(ip)) {
      console.warn(`[SECURITY] [RATE_LIMIT] Upload limit exceeded. IP: ${ip}`);
      return sendResponse({ error: 'Quá nhiều yêu cầu upload. Vui lòng thử lại sau.' }, 429);
    }

    // Validate CSRF manually since /api/upload is excluded from the global middleware matcher
    const csrfCookie = req.cookies.get('csrf_token')?.value;
    const csrfHeader = req.headers.get('x-csrf-token');
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      console.warn(`[SECURITY] [CSRF_FAILURE] Token mismatch or missing on upload API. IP: ${ip}`);
      return sendResponse(
        { error: 'Yêu cầu không hợp lệ (CSRF token validation failed). Vui lòng tải lại trang.' },
        403
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return sendResponse({ error: 'Bạn cần đăng nhập để upload file' }, 401);
    }
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return sendResponse({ error: 'Không có file nào được chọn' }, 400);
    }

    const results: Array<{
      file_name: string;
      file_url: string;
      file_size: number;
      file_type: string;
    }> = [];

    // Create upload directory with date-based subfolder
    const dateFolder = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents', dateFolder);
    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return sendResponse(
          { error: `File "${file.name}" vượt quá giới hạn 200MB` },
          400
        );
      }

      // Validate extension
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return sendResponse(
          { error: `Định dạng file "${ext}" không được hỗ trợ` },
          400
        );
      }

      // Read file bytes
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Validate magic bytes
      if (!validateMagicBytes(buffer, ext)) {
        console.warn(`[SECURITY] [UPLOAD_INVALID_MAGIC] File type spoofing attempt blocked. File: ${file.name}, Declared Ext: ${ext}, IP: ${ip}`);
        return sendResponse(
          { error: `Nội dung file "${file.name}" không hợp lệ hoặc không khớp với phần mở rộng "${ext}"` },
          400
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const safeBaseName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_');
      const uniqueName = `${timestamp}_${randomSuffix}_${safeBaseName}`;

      // Write file
      const filePath = path.join(uploadDir, uniqueName);
      await writeFile(filePath, buffer);

      const fileUrl = `/uploads/documents/${dateFolder}/${uniqueName}`;
      
      results.push({
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        file_type: ext.replace('.', ''),
      });
    }

    return sendResponse({ success: true, files: results });
  } catch (error: unknown) {
    console.error('Error uploading file:', error);
    return sendResponse({ error: 'Có lỗi xảy ra khi upload file. Vui lòng thử lại sau.' }, 500);
  }
}
