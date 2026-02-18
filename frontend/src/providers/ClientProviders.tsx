'use client'

import { ReactNode } from 'react'
import dynamic from 'next/dynamic'

// SSR-safe: wallet adapters access `window` in constructors — must be client-only.
// NullPay (Vite) never has SSR, so adapters always create on client.
// Next.js runs even 'use client' components on the server during static generation,
// so we need dynamic() with ssr: false to guarantee client-only rendering.
const WalletProvider = dynamic(
  () => import('@/providers/WalletProvider').then(mod => mod.WalletProvider),
  { ssr: false }
)

const WelcomeOverlay = dynamic(
  () => import('@/components/WelcomeOverlay'),
  { ssr: false }
)

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      {children}
      <WelcomeOverlay />
    </WalletProvider>
  )
}
