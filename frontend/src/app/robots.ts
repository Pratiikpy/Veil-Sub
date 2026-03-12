import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'https://veil-sub.vercel.app'}/sitemap.xml`,
  }
}
