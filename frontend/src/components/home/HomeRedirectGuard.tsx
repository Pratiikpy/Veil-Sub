'use client'

import { ReactNode, useEffect } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useRouter } from 'next/navigation'

interface Props {
  children: ReactNode
}

/**
 * Redirects connected wallet users from the homepage to /feed.
 *
 * Strategy: Always render the homepage content immediately (no blank flash,
 * good for SEO crawlers). Once the wallet adapter hydrates and reports
 * `connected === true`, replace the route with /feed. This mirrors how
 * Twitter/Patreon handle logged-in users landing on the marketing page.
 */
export default function HomeRedirectGuard({ children }: Props) {
  const { connected } = useWallet()
  const router = useRouter()

  useEffect(() => {
    if (connected) {
      router.replace('/feed')
    }
  }, [connected, router])

  return <>{children}</>
}
