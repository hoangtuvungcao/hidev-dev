import crypto from 'crypto';
import { cookies } from 'next/headers';
import { User } from '../types';
import { query } from './db';

// Validate JWT_SECRET is set in production
if ((process.env.NODE_ENV as string) === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

// In development, warn if using the fallback and generate a random one
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
  
  // Development fallback
  if (!envSecret || envSecret === 'change_me_to_a_random_64_char_string') {
    console.warn('[AUTH] ⚠ Using default dev JWT_SECRET fallback. Set JWT_SECRET in .env for custom settings.');
    return 'hidev_dev_session_secret_key_123456';
  }
  return envSecret;
})();

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function signToken(payload: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_MAX_AGE_SECONDS,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');
    
  return `${base64Header}.${base64Payload}.${signature}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [base64Header, base64Payload, signature] = parts;
    
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${base64Header}.${base64Payload}`)
      .digest('base64url');
      
    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) return null;
    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expectedSignature);
    if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) return null;
    
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));

    // Verify expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return null; // Token expired
    }
    
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-hidev_session' : 'hidev_session';
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) return null;
    
    // Fetch latest user details and session_version from the DB
    const users = await query<any[]>(
      'SELECT id, username, email, role, avatar_url, session_version FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!users || users.length === 0) return null;
    
    const dbUser = users[0];
    
    // Validate session version
    if (decoded.session_version !== dbUser.session_version) {
      return null; // Session version mismatch, token is invalidated
    }
    
    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role as 'user' | 'admin',
      avatar_url: dbUser.avatar_url || undefined,
    };
  } catch {
    return null;
  }
}
