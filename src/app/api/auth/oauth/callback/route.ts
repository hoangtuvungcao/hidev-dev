import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

interface UserRecord {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar_url: string | null;
  session_version: number;
}

// POST - Handles Sandbox simulated login submit
export async function POST(req: NextRequest) {
  try {
    // C9: Guard sandbox POST in production
    if ((process.env.NODE_ENV as string) === 'production') {
      return NextResponse.json({ error: 'Sandbox mode is disabled in production' }, { status: 403 });
    }

    const { username, email, avatarUrl } = await req.json();

    if (!username || !email) {
      return NextResponse.json({ error: 'Thiếu thông tin người dùng giả lập' }, { status: 400 });
    }

    // C10: Hash a secure random placeholder password since this user logs in via OAuth
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const securePlaceholderHash = await bcrypt.hash(randomPassword, 10);

    // Check if user exists by email
    const users = await query<UserRecord[]>('SELECT * FROM users WHERE email = ?', [email]);
    let user: UserRecord;

    if (users && users.length > 0) {
      user = users[0];
      // Update avatar if changed
      if (avatarUrl && user.avatar_url !== avatarUrl) {
        await query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, user.id]);
        user.avatar_url = avatarUrl;
      }
    } else {
      // Ensure unique username
      let finalUsername = username;
      const userCheck = await query<{ id: number }[]>('SELECT id FROM users WHERE username = ?', [username]);
      if (userCheck && userCheck.length > 0) {
        finalUsername = `${username}_${Math.floor(Math.random() * 1000)}`;
      }

      await query(
        'INSERT INTO users (username, email, password_hash, role, avatar_url) VALUES (?, ?, ?, ?, ?)',
        [finalUsername, email, securePlaceholderHash, 'user', avatarUrl || null]
      );

      const newUsers = await query<UserRecord[]>('SELECT * FROM users WHERE email = ?', [email]);
      user = newUsers[0];
    }

    // Sign JWT
    const token = signToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      session_version: user.session_version,
    });

    const response = NextResponse.json({ success: true, user });

    const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-hidev_session' : 'hidev_session';

    // Set cookie — use 'lax' so cookie survives cross-site OAuth redirects
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: (process.env.NODE_ENV as string) === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('OAuth sandbox callback error:', error);
    return NextResponse.json({ error: 'Lỗi đăng nhập Sandbox' }, { status: 500 });
  }
}

// GET - Handles real OAuth callback code exchange redirect
export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const provider = searchParams.get('provider');
    const state = searchParams.get('state');

    // C3: State (CSRF) Verification
    const savedState = req.cookies.get('oauth_state')?.value;
    if (!savedState || !state || state !== savedState) {
      console.error('OAuth state mismatch');
      return NextResponse.redirect(`${siteUrl}/login/updating`);
    }

    if (!code || !provider) {
      console.error('OAuth missing code or provider');
      return NextResponse.redirect(`${siteUrl}/login/updating`);
    }

    let email = '';
    let username = '';
    let avatarUrl = '';

    if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error('GitHub OAuth - Missing credentials');
        return NextResponse.redirect(`${siteUrl}/login/updating`);
      }

      // Exchange code for token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        console.error('GitHub token error:', tokenData);
        return NextResponse.redirect(`${siteUrl}/login/updating`);
      }

      // Fetch user profile
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();

      if (!userData.login) {
        console.error('GitHub user data invalid:', userData);
        return NextResponse.redirect(`${siteUrl}/login/updating`);
      }

      username = userData.login;
      avatarUrl = userData.avatar_url;

      // Fetch email
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const emails = await emailRes.json();

      const primaryEmail = emails.find((e: { primary: boolean; email: string }) => e.primary);
      email = primaryEmail ? primaryEmail.email : userData.email;
    }

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error('Google OAuth - Missing credentials');
        return NextResponse.redirect(`${siteUrl}/login/updating`);
      }

      // C4: Read PKCE code verifier
      const codeVerifier = req.cookies.get('oauth_code_verifier')?.value;

      if (!codeVerifier) {
        console.error('Google OAuth - Missing code verifier');
        return NextResponse.redirect(`${siteUrl}/login/updating`);
      }

      // Exchange code for token with PKCE code_verifier
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${siteUrl}/api/auth/oauth/callback?provider=google`,
          code_verifier: codeVerifier,
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        console.error('Google token error:', tokenData);
        return NextResponse.redirect(`${siteUrl}/login/updating`);
      }

      // Fetch user profile
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();

      if (!userData.email) {
        console.error('Google user data invalid:', userData);
        return NextResponse.redirect(`${siteUrl}/login/updating`);
      }

      email = userData.email;
      username = userData.name.replace(/\s+/g, '').toLowerCase();
      avatarUrl = userData.picture;
    }

    if (!email) {
      return NextResponse.redirect(`${siteUrl}/login/updating`);
    }

    // Check database
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const securePlaceholderHash = await bcrypt.hash(randomPassword, 10);

    try {
      const users = await query<UserRecord[]>('SELECT * FROM users WHERE email = ?', [email]);
      let user: UserRecord;

      if (users && users.length > 0) {
        user = users[0];
        if (avatarUrl && user.avatar_url !== avatarUrl) {
          await query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, user.id]);
          user.avatar_url = avatarUrl;
        }
      } else {
        let finalUsername = username;
        const userCheck = await query<{ id: number }[]>('SELECT id FROM users WHERE username = ?', [username]);
        if (userCheck && userCheck.length > 0) {
          finalUsername = `${username}_${Math.floor(Math.random() * 1000)}`;
        }

        await query(
          'INSERT INTO users (username, email, password_hash, role, avatar_url) VALUES (?, ?, ?, ?, ?)',
          [finalUsername, email, securePlaceholderHash, 'user', avatarUrl || null]
        );

        const newUsers = await query<UserRecord[]>('SELECT * FROM users WHERE email = ?', [email]);
        user = newUsers[0];
      }

      // Sign JWT
      const token = signToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        session_version: user.session_version,
      });

      // Redirect về trang chủ với query parameter để trigger reload
      const response = NextResponse.redirect(`${siteUrl}?oauth_success=true`);

      const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-hidev_session' : 'hidev_session';

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: (process.env.NODE_ENV as string) === 'production',
        sameSite: (process.env.NODE_ENV as string) === 'production' ? 'strict' : 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      // Clear state and verifier cookies
      response.cookies.set({
        name: 'oauth_state',
        value: '',
        maxAge: 0,
        path: '/',
      });

      response.cookies.set({
        name: 'oauth_code_verifier',
        value: '',
        maxAge: 0,
        path: '/',
      });

      return response;
    } catch (dbError: unknown) {
      console.error('OAuth - Database error:', dbError);
      return NextResponse.redirect(`${siteUrl}/login/updating`);
    }
  } catch (error: unknown) {
    console.error('OAuth callback execution error:', error);
    return NextResponse.redirect(`${siteUrl}/login/updating`);
  }
}
