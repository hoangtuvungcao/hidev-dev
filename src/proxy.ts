import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const JWT_SECRET = (() => {
  const envSecret = process.env.JWT_SECRET;
  const isProd = (process.env.NODE_ENV as string) === 'production';
  
  if (isProd) {
    if (!envSecret || envSecret === 'change_me_to_a_random_64_char_string') {
      throw new Error('JWT_SECRET must be set to a strong random value in production');
    }
    if (envSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long in production');
    }
    return envSecret;
  }
  
  return envSecret || 'hidev_dev_session_secret_key_123456';
})();

function padBase64(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  return base64;
}

// Edge-compatible JWT Verification using Web Crypto API
async function verifyTokenEdge(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode payload
    const payloadStr = atob(padBase64(payloadB64));
    const payload = JSON.parse(payloadStr);

    // Verify expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return null;
    }

    // Verify signature using HMAC SHA-256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(JWT_SECRET);
    const dataToSign = encoder.encode(`${headerB64}.${payloadB64}`);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // base64url to standard base64
    const base64 = padBase64(signatureB64);
    const signatureBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes,
      dataToSign
    );

    return isValid ? payload : null;
  } catch {
    return null;
  }
}

// In-memory store for rate limiting (Edge-compatible)
const limitCache = new Map<string, number[]>();

// Counter to run cleanup periodically rather than on every single request
let requestCounter = 0;

function checkRateLimit(ip: string, path: string, method: string): boolean {
  const now = Date.now();
  
  // Default limits
  let limit = 60;
  const windowMs = 60 * 1000; // 1 minute
  
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  
  // Specific endpoints rate limit (High priority actions)
  if (path === '/api/auth/login' && method === 'POST') {
    limit = 5;
  } else if (path === '/api/auth/register' && method === 'POST') {
    limit = 5;
  } else if (path === '/api/users/change-password' && method === 'POST') {
    limit = 5;
  } else if (path.startsWith('/api/posts') && isStateChanging) {
    limit = 10;
  } else if (path === '/api/upload' && method === 'POST') {
    limit = 5;
  } else if (path.startsWith('/api/documents') && isStateChanging) {
    limit = 10;
  }
  
  requestCounter++;
  
  // Clean up cache periodically (every 500 requests) to prevent CPU overhead
  if (requestCounter % 500 === 0) {
    if (limitCache.size > 2000) {
      // Emergency clear under heavy DDoS / high unique IP traffic to prevent OOM
      limitCache.clear();
    } else {
      for (const [key, timestamps] of limitCache.entries()) {
        const valid = timestamps.filter(t => now - t < 60 * 1000); // 1 min retention is enough for rate limits
        if (valid.length === 0) {
          limitCache.delete(key);
        } else {
          limitCache.set(key, valid);
        }
      }
    }
  }

  const cacheKey = `${method}:${path}:${ip}`;
  const timestamps = limitCache.get(cacheKey) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);
  
  if (validTimestamps.length >= limit) {
    limitCache.set(cacheKey, validTimestamps);
    return true;
  }
  
  validTimestamps.push(now);
  limitCache.set(cacheKey, validTimestamps);
  return false;
}

// Helper to generate a random hex token (Edge-compatible)
function generateCsrfToken(): string {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Array.from(arr, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. CORS Validation & Preflight
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean) as string[];

  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  if (request.method === 'OPTIONS' && path.startsWith('/api')) {
    const headers = new Headers();
    if (isAllowedOrigin && origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Access-Control-Max-Age', '86400');
    }
    return new NextResponse(null, { status: 204, headers });
  }

  const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-hidev_session' : 'hidev_session';

  // 2. CSRF Verification & Cookie Injection
  let csrfToken = request.cookies.get('csrf_token')?.value;
  let shouldSetCsrfCookie = false;

  if (!csrfToken) {
    csrfToken = generateCsrfToken();
    shouldSetCsrfCookie = true;
  }

  // Validate CSRF for state-changing API requests
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
  if (path.startsWith('/api') && isStateChanging) {
    const csrfHeader = request.headers.get('x-csrf-token');
    if (!csrfToken || !csrfHeader || csrfToken !== csrfHeader) {
      console.warn(`[SECURITY] [CSRF_FAILURE] Token mismatch or missing. IP: ${request.headers.get('x-forwarded-for') || '127.0.0.1'}, Path: ${path}, Method: ${request.method}`);
      return NextResponse.json(
        { error: 'Yêu cầu không hợp lệ (CSRF token validation failed). Vui lòng tải lại trang.' },
        { status: 403 }
      );
    }
  }
  
  // 3. Rate Limiting for API routes
  if (path.startsWith('/api')) {
    // Exempt notifications stream to allow continuous SSE / stream connection
    if (!path.startsWith('/api/notifications/stream')) {
      const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
      if (checkRateLimit(ip, path, request.method)) {
        console.warn(`[SECURITY] [RATE_LIMIT] Limit exceeded on ${path} (${request.method}) by IP: ${ip}`);
        return NextResponse.json(
          { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
          { status: 429 }
        );
      }
    }
  }

  // 4. Authentication and Route Protection
  const protectedRoutes = ['/submit', '/profile', '/admin'];
  const isAdminRoute = path.startsWith('/admin') || path.startsWith('/api/admin');
  const isProtectedPath = protectedRoutes.some(route => path.startsWith(route)) || isAdminRoute;

  let response: NextResponse;

  if (isProtectedPath) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    if (!token) {
      if (path.startsWith('/api')) {
        response = NextResponse.json({ error: 'Yêu cầu xác thực' }, { status: 401 });
      } else {
        response = NextResponse.redirect(new URL('/login', request.url));
      }
    } else {
      const decoded = await verifyTokenEdge(token);
      if (!decoded || !decoded.id) {
        console.warn(`[SECURITY] [JWT_INVALID] Attempted access with invalid token. Path: ${path}`);
        response = path.startsWith('/api')
          ? NextResponse.json({ error: 'Phiên làm việc hết hạn' }, { status: 401 })
          : NextResponse.redirect(new URL('/login', request.url));
        
        // Invalidate bad cookie
        response.cookies.set({
          name: SESSION_COOKIE_NAME,
          value: '',
          path: '/',
          maxAge: 0,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      } else if (isAdminRoute && decoded.role !== 'admin') {
        console.warn(`[SECURITY] [RBAC_VIOLATION] User unauthorized for admin path: ${path}`);
        response = path.startsWith('/api')
          ? NextResponse.json({ error: 'Quyền truy cập bị từ chối' }, { status: 403 })
          : NextResponse.redirect(new URL('/', request.url));
      } else {
        response = NextResponse.next();
      }
    }
  } else {
    response = NextResponse.next();
  }

  // Inject CSRF cookie if it was generated
  if (shouldSetCsrfCookie && response) {
    response.cookies.set({
      name: 'csrf_token',
      value: csrfToken,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  // 5. Inject CORS and Security Headers on API responses
  if (path.startsWith('/api') && response) {
    if (isAllowedOrigin && origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (uploaded files)
     * - public files
     * - api/upload (exclude upload API to prevent edge stream corruption)
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads|logo.png|manifest.json|robots.txt|sitemap.xml|llm.txt|llms.txt|api/upload).*)',
  ],
};
