import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VeilSub—Private Creator Subscriptions',
    short_name: 'VeilSub',
    description: 'Subscribe privately. Prove access. Nobody sees who you support. Zero-knowledge subscriptions on Aleo.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#8B5CF6',
    orientation: 'portrait-primary',
    categories: ['finance', 'social', 'productivity'],
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/opengraph-image',
        sizes: '1200x630',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
