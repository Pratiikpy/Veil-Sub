import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VeilSub—Private Creator Subscriptions',
    short_name: 'VeilSub',
    description: 'Subscribe privately. Prove access. Nobody sees who you support. Zero-knowledge subscriptions on Aleo.',
    start_url: '/feed',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#8B5CF6',
    orientation: 'portrait-primary',
    categories: ['finance', 'social', 'productivity'],
    icons: [
      {
        src: '/brand/veilsub-icon-64.png',
        sizes: '64x64',
        type: 'image/png',
      },
      {
        src: '/brand/veilsub-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/veilsub-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
