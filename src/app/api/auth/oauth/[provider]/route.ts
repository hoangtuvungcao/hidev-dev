import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  try {
    const resolvedParams = await params;
    const provider = resolvedParams.provider;

    const githubId = process.env.GITHUB_CLIENT_ID;
    const googleId = process.env.GOOGLE_CLIENT_ID;

    if (provider !== 'github' && provider !== 'google') {
      return NextResponse.redirect(`${siteUrl}/login/updating`);
    }

    // C3: Add state parameter (CSRF protection)
    const state = crypto.randomBytes(32).toString('hex');

    if (provider === 'github') {
      if (githubId) {
        // Real GitHub redirect
        const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${githubId}&redirect_uri=${encodeURIComponent(`${siteUrl}/api/auth/oauth/callback?provider=github`)}&scope=user:email&state=${state}`;
        const res = NextResponse.redirect(redirectUrl);
        res.cookies.set({
          name: 'oauth_state',
          value: state,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600, // 10 minutes
          path: '/',
        });
        return res;
      } else {
        // Fallback to developer sandbox
        return NextResponse.redirect(`${siteUrl}/login/oauth-sandbox?provider=github`);
      }
    }

    if (provider === 'google') {
      if (googleId) {
        // C4: Add PKCE for Google OAuth
        const codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = crypto
          .createHash('sha256')
          .update(codeVerifier)
          .digest('base64url');

        // Real Google redirect with state and PKCE
        const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleId}&redirect_uri=${encodeURIComponent(`${siteUrl}/api/auth/oauth/callback?provider=google`)}&response_type=code&scope=email%20profile&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        
        const res = NextResponse.redirect(redirectUrl);
        res.cookies.set({
          name: 'oauth_state',
          value: state,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600, // 10 minutes
          path: '/',
        });
        res.cookies.set({
          name: 'oauth_code_verifier',
          value: codeVerifier,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600, // 10 minutes
          path: '/',
        });
        return res;
      } else {
        // Fallback to developer sandbox
        return NextResponse.redirect(`${siteUrl}/login/oauth-sandbox?provider=google`);
      }
    }

    return NextResponse.redirect(`${siteUrl}/login/updating`);
  } catch (error) {
    console.error('OAuth redirect error:', error);
    return NextResponse.redirect(`${siteUrl}/login/updating`);
  }
}
