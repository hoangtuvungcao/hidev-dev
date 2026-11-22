import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: false, //bat proxy img
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
  async headers() {
    // Content Security Policy
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://cdn.jsdelivr.net;
      style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
      img-src 'self' blob: data: https:;
      font-src 'self' data: https://cdn.jsdelivr.net;
      object-src 'none';
      base-uri 'self';
      form-action 'self' https://github.com https://accounts.google.com;
      frame-ancestors 'self';
      frame-src 'self' https://view.officeapps.live.com https://docs.google.com;
      connect-src 'self' https://leetcode.vutrungocrong.fun https://github.com https://oauth2.googleapis.com https://api.github.com https://*.cloudflareinsights.com https://cloudflareinsights.com https://cdn.jsdelivr.net;
      worker-src 'self' blob:;
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/:file(logo.png|icon.png|favicon.ico|manifest.json)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; frame-ancestors 'self';`,
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
