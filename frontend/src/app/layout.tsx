import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClientProviders } from '@/providers/ClientProviders'
import Header from '@/components/Header'
import MobileBottomNav from '@/components/MobileBottomNav'
import SmokeBackground from '@/components/SmokeBackground'
import { Toaster } from 'sonner'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/config'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://veilsub.vercel.app'),
  title: `${APP_NAME} — Private Creator Subscriptions`,
  description: APP_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
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
        className={`${inter.variable} font-sans bg-[rgb(2,0,5)] text-[#fafafa] min-h-screen antialiased`}
      >
        <ClientProviders>
          <SmokeBackground />
          <Header />
          <main className="pt-16 pb-20 md:pb-0">{children}</main>
          <MobileBottomNav />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#111113',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#fafafa',
                borderRadius: '8px',
              },
            }}
          />
        </ClientProviders>
      </body>
    </html>
  )
}
