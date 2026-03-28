'use client'

import { ReactNode, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { clearMappingCache } from '@/hooks/useCreatorStats'
import { clearAllTierCache } from '@/hooks/useCreatorTiers'
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css'

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

/** Clears all module-level caches when the connected wallet changes */
function WalletCacheClearer() {
  const { address } = useWallet()
  const prevKeyRef = useRef(address)
  useEffect(() => {
    if (prevKeyRef.current && prevKeyRef.current !== address) {
      clearMappingCache()
      clearAllTierCache()
    }
    prevKeyRef.current = address
  }, [address])
  return null
}

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary componentName="WalletProvider">
      <WalletProvider>
        <WalletCacheClearer />
        <LazyMotion features={domAnimation}>
          <MotionConfig reducedMotion="user">
            {children}
            <WelcomeOverlay />
          </MotionConfig>
        </LazyMotion>
      </WalletProvider>
    </ErrorBoundary>
  )
}
