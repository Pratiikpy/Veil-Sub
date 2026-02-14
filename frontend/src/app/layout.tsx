import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/providers/WalletProvider'
import Header from '@/components/Header'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/config'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: `${APP_NAME} — Private Creator Subscriptions`,
  description: APP_DESCRIPTION,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-[#0a0a0f] text-white min-h-screen antialiased`}
      >
        <WalletProvider>
          <Header />
          <main className="pt-16">{children}</main>
        </WalletProvider>
      </body>
    </html>
  )
}
