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
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
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
