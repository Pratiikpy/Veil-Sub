import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VeilSub — Private Creator Subscriptions',
    short_name: 'VeilSub',
    description: 'Subscribe privately. Prove access. Nobody sees who you support. Zero-knowledge subscriptions on Aleo.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#8B5CF6',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
  }
}
