import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

// Next.js only serves files that exist in `public/` at build/startup time.
// Files written by the upload API at runtime are NOT in that static index, so
// in production (`next start`) they return 404 even though they're on disk.
// This handler serves them dynamically from public/uploads.

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  // Resolve within the uploads root and reject path traversal.
  const requested = path.join(UPLOADS_ROOT, ...segments);
  const normalized = path.normalize(requested);
  if (normalized !== UPLOADS_ROOT && !normalized.startsWith(UPLOADS_ROOT + path.sep)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const info = await stat(normalized);
    if (!info.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const buffer = await readFile(normalized);
    const ext = path.extname(normalized).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

    // Support ?download=1 to force browser download
    const forceDownload = req.nextUrl.searchParams.get('download') === '1';
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': String(info.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Security-Policy': "default-src 'none'; sandbox;",
      'X-Frame-Options': 'DENY',
    };

    if (forceDownload) {
      // Extract original filename by removing timestamp_random_ prefix
      const basename = path.basename(normalized);
      const cleanName = basename.replace(/^\d+_[a-z0-9]+_/, '');
      headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(decodeURIComponent(cleanName))}`;
      headers['Cache-Control'] = 'no-cache';
    }

    return new NextResponse(buffer as unknown as BodyInit, { headers });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
