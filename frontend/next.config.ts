import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.explorer.provable.com https://api.aleoscan.io https://*.supabase.co https://*.upstash.io",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
      // Cache Aleo API proxy responses to reduce upstream rate-limit pressure
      {
        source: '/api/aleo/program/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=30, stale-while-revalidate=60' },
        ],
      },
      {
        source: '/api/aleo/latest/height',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=10, stale-while-revalidate=30' },
        ],
      },
      {
        source: '/api/aleo/transaction/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
      {
        source: '/api/aleoscan/transaction/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/aleo/latest/height',
        destination: 'https://api.explorer.provable.com/v1/testnet/latest/height',
      },
      {
        source: '/api/aleo/program/:program/mapping/:mapping/:key',
        destination: 'https://api.explorer.provable.com/v1/testnet/program/:program/mapping/:mapping/:key',
      },
      {
        source: '/api/aleo/program/:program',
        destination: 'https://api.explorer.provable.com/v1/testnet/program/:program',
      },
      {
        source: '/api/aleo/transaction/:txId',
        destination: 'https://api.explorer.provable.com/v1/testnet/transaction/:txId',
      },
      {
        source: '/api/aleoscan/transaction/:txId',
        destination: 'https://api.aleoscan.io/v2/testnet/transaction/:txId',
      },
    ]
  },
};

export default nextConfig;
