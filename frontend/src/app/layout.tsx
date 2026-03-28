import type { Metadata, Viewport } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { ClientProviders } from '@/providers/ClientProviders'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MobileBottomNav from '@/components/MobileBottomNav'
import DesktopSidebar from '@/components/DesktopSidebar'
import RightSidebar from '@/components/RightSidebar'
import BackToTop from '@/components/BackToTop'
import ScrollProgress from '@/components/ui/ScrollProgress'
import CustomCursor from '@/components/CustomCursor'
import ChangelogOverlay from '@/components/ChangelogOverlay'
import CommandPalette from '@/components/CommandPalette'
import OnboardingTour from '@/components/OnboardingTour'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import FloatingComposeButton from '@/components/FloatingComposeButton'
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
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://veil-sub.vercel.app'),
  title: {
    default: `${APP_NAME} — Private Creator Subscriptions on Aleo`,
    template: `%s | ${APP_NAME}`,
  },
  description: `Subscribe to creators without anyone knowing. ${APP_DESCRIPTION} — zero-knowledge proof verification, complete privacy for subscribers and creators.`,
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
    description: 'The private access layer for the creator economy. Subscribe privately, prove access, nobody sees who you support.',
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
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" sizes="192x192" href="/brand/veilsub-icon-192.png" />
        {/* Theme initialization script - runs before paint to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('veilsub_theme');
                const theme = (stored === 'light' || stored === 'dark') ? stored : null;
                const preferLight = window.matchMedia('(prefers-color-scheme: light)').matches;
                const resolved = theme ?? (preferLight ? 'light' : 'dark');
                if (resolved === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                }
              } catch (e) {
                // Fallback to dark (default in className)
              }
            `.replace(/\s+/g, ' '),
          }}
        />
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
        className={`${inter.variable} ${instrumentSerif.variable} font-sans bg-black text-white min-h-screen antialiased`}
      >
        <NextTopLoader color="#ffffff" height={2} showSpinner={false} shadow="0 0 10px rgba(255,255,255,0.15)" />
        <ScrollProgress />
        <ClientProviders>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:text-sm focus:font-medium"
          >
            Skip to main content
          </a>
          {/* Desktop left sidebar — hidden on mobile */}
          <DesktopSidebar />
          {/* Mobile header — hidden on desktop */}
          <Header />
          <div className="md:ml-[220px] lg:mr-[260px]">
            <main id="main-content" className="pt-16 md:pt-0 pb-20 md:pb-0">{children}</main>
            <Footer />
          </div>
          {/* Desktop right sidebar — hidden below 1024px */}
          <RightSidebar />
          <MobileBottomNav />
          <BackToTop />
          <CustomCursor />
          <ChangelogOverlay />
          <CommandPalette />
          <OnboardingTour />
          <PWAInstallPrompt />
          <KeyboardShortcuts />
          <FloatingComposeButton />
          <Toaster
            theme="dark"
            position="top-center"
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
