import type { Metadata, Viewport } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { ClientProviders } from '@/providers/ClientProviders'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MobileBottomNav from '@/components/MobileBottomNav'
import BackToTop from '@/components/BackToTop'
import ChangelogOverlay from '@/components/ChangelogOverlay'
import { Toaster } from 'sonner'
import NextTopLoader from 'nextjs-toploader'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/config'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['italic'],
  variable: '--font-instrument-serif',
})

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://veil-sub.vercel.app'),
  title: `${APP_NAME} — Private Creator Subscriptions on Aleo`,
  description: `Subscribe to creators without anyone knowing. ${APP_DESCRIPTION} — zero-knowledge proof verification, zero addresses in finalize. 27 transitions, 25 mappings, 6 record types.`,
  keywords: ['Aleo', 'ZK', 'zero-knowledge', 'privacy', 'subscriptions', 'creator economy', 'blockchain', 'Leo'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    locale: 'en_US',
    title: `${APP_NAME} — Private Creator Subscriptions on Aleo`,
    description: 'Subscribe privately. Prove access. Nobody sees who you support. Zero-footprint verification powered by zero-knowledge proofs on Aleo.',
    url: '/',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'VeilSub — Private Creator Subscriptions on Aleo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Private Subscriptions on Aleo`,
    description: 'The private access layer for the creator economy. 27 transitions, 25 mappings, 6 record types. Zero addresses in finalize.',
    images: ['/opengraph-image'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://api.explorer.provable.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'VeilSub',
              description: 'Privacy-first creator subscription platform on Aleo blockchain',
              url: 'https://veil-sub.vercel.app',
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              creator: {
                '@type': 'Organization',
                name: 'VeilSub',
              },
            }),
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${instrumentSerif.variable} font-sans bg-background text-white min-h-screen antialiased`}
      >
        <NextTopLoader color="#8B5CF6" height={2} showSpinner={false} shadow="0 0 10px rgba(139,92,246,0.3)" />
        <ClientProviders>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
          >
            Skip to main content
          </a>
          <Header />
          <main id="main-content" className="pt-16 pb-20 md:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
          <BackToTop />
          <ChangelogOverlay />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
                borderRadius: 'var(--radius-md)',
              },
            }}
          />
        </ClientProviders>
      </body>
    </html>
  )
}
