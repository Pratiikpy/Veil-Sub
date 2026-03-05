import type { Metadata } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { ClientProviders } from '@/providers/ClientProviders'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MobileBottomNav from '@/components/MobileBottomNav'
import { Toaster } from 'sonner'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/config'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://veilsub.vercel.app'),
  title: `${APP_NAME} — Private Creator Subscriptions on Aleo`,
  description: `${APP_DESCRIPTION}. Zero-knowledge proof verification, 31 transitions, 30 mappings, 8 record types. Built for the Aleo Privacy Buildathon.`,
  keywords: ['Aleo', 'ZK', 'zero-knowledge', 'privacy', 'subscriptions', 'creator economy', 'blockchain', 'Leo'],
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    locale: 'en_US',
    title: `${APP_NAME} — Private Creator Subscriptions on Aleo`,
    description: 'Subscribe privately. Prove access. Nobody sees who you support. Zero-footprint verification powered by zero-knowledge proofs on Aleo.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Private Subscriptions on Aleo`,
    description: 'The private access layer for the creator economy. 31 transitions, 30 mappings, 8 record types.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${instrumentSerif.variable} font-sans bg-black text-white min-h-screen antialiased`}
      >
        <ClientProviders>
          <Header />
          <main className="pt-16 pb-20 md:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#ffffff',
                borderRadius: '16px',
              },
            }}
          />
        </ClientProviders>
      </body>
    </html>
  )
}
