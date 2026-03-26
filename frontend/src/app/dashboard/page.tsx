'use client'

import { useState, useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { spring } from '@/lib/motion'
import Link from 'next/link'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { ExternalLink, Shield, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { useSupabase } from '@/hooks/useSupabase'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import PageTransition from '@/components/PageTransition'
import { saveCreatorHash, getCreatorHash } from '@/lib/config'
import type { CreatorProfile } from '@/types'

import ConnectWalletPrompt from '@/components/dashboard/ConnectWalletPrompt'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import RegisteredDashboard from '@/components/dashboard/RegisteredDashboard'
import OnboardingWizard from '@/components/OnboardingWizard'

const CelebrationBurst = dynamic(() => import('@/components/CelebrationBurst'), { ssr: false })

const TITLE_STYLE = { letterSpacing: '-0.03em' } as const

export default function DashboardPage() {
  const { address: publicKey, connected } = useWallet()
  const { fetchCreatorStats } = useCreatorStats()
  const { stopPolling } = useTransactionPoller()
  const { getCreatorProfile } = useSupabase()

  const [isRegistered, setIsRegistered] = useState(false)
  const [stats, setStats] = useState<CreatorProfile | null>(null)
  const [copied, setCopied] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [creatorLink, setCreatorLink] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  // Set creator link on client only (avoid hydration mismatch)
  useEffect(() => {
    if (publicKey) {
      setCreatorLink(`${window.location.origin}/creator/${publicKey}`)
    }
  }, [publicKey])

  // Check if already registered
  useEffect(() => {
    if (!publicKey) {
      setLoading(false)
      return
    }
    let cancelled = false
    setStatsError(false)
    // If hash missing from localStorage/hardcoded map, try to restore from Supabase first.
    // This handles page refresh after registering from a new wallet.
    const hashKnown = getCreatorHash(publicKey) !== null
    const doFetch = () => {
      fetchCreatorStats(publicKey).then((s) => {
        if (cancelled) return
        setStats(s)
        // Only promote to registered — never demote during an active session.
        setIsRegistered((prev) => prev || s.tierPrice !== null)
        setLoading(false)
      }).catch(() => {
        if (cancelled) return
        setStatsError(true)
        setLoading(false)
      })
    }
    if (!hashKnown) {
      // Try Supabase first (fast), then fall back to on-chain recovery (slow, one-time)
      getCreatorProfile(publicKey).then(async (profile) => {
        if (cancelled) return
        if (profile?.creator_hash) {
          saveCreatorHash(publicKey, profile.creator_hash)
          doFetch()
        } else {
          // Supabase has no hash — registered before persistence was in place.
          // Query the Aleo explorer to recover the hash from the registration tx.
          try {
            const r = await fetch(`/api/creators/recover-hash?address=${encodeURIComponent(publicKey)}`)
            if (!cancelled && r.ok) {
              const { creator_hash } = await r.json()
              if (typeof creator_hash === 'string' && creator_hash.endsWith('field')) {
                saveCreatorHash(publicKey, creator_hash)
              }
            }
          } catch { /* non-critical */ }
          if (!cancelled) doFetch()
        }
      }).catch(() => {
        if (!cancelled) doFetch()
      })
    } else {
      doFetch()
    }
    return () => { cancelled = true }
  }, [publicKey, fetchCreatorStats, getCreatorProfile, refreshKey])

  // Stop polling on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const copyLink = async () => {
    if (!publicKey) return
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/creator/${publicKey}`
      )
      setCopied(true)
      toast.success('Link copied!')
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Couldn\u2019t copy to clipboard. Select and copy the URL manually.')
    }
  }

  if (!connected) {
    return <ConnectWalletPrompt />
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (statsError) {
    return (
      <PageTransition className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Creator Dashboard</h1>
          <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/15 max-w-md mx-auto">
            <p className="text-sm text-red-300 mb-4">Could not load your creator status. This may be a network issue.</p>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              aria-label="Retry loading creator stats"
              className="px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
            >
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1
            className="text-3xl sm:text-4xl font-bold text-white mb-2"
            style={TITLE_STYLE}
          >
            Creator Dashboard
          </h1>
          <p className="text-white/70">
            {isRegistered
              ? 'Manage your subscription settings and view aggregate stats—no subscriber addresses ever appear.'
              : 'Register to start earning. Your subscriber list stays 100% private—no addresses, no enumeration.'}
          </p>
        </m.div>

        {showCelebration ? (
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 relative"
          >
            <CelebrationBurst />
            <m.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ ...spring.bouncy, delay: 0.2 }}
            >
              <Shield className="w-16 h-16 text-white/60 mb-6" aria-hidden="true" />
            </m.div>
            <h2 className="text-3xl font-bold text-white mb-4">
              You&apos;re Registered!
            </h2>
            <p className="text-white/70 text-center max-w-md mb-8">
              Your creator profile is live on-chain. Subscribers can now find you and subscribe privately.
            </p>
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="space-y-4 text-center"
            >
              <p className="text-xs text-white/60 uppercase tracking-wider font-medium">Next steps</p>
              <div className="flex items-center gap-4 flex-wrap justify-center">
                <Link
                  href={`/creator/${publicKey}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-border text-sm text-white/70 hover:bg-white/10 transition-all duration-300 active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  View your page
                </Link>
                <button
                  onClick={copyLink}
                  aria-label="Copy your creator profile link to clipboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-border text-sm text-white/70 hover:bg-white/[0.08] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  Share your link
                </button>
              </div>
            </m.div>
          </m.div>
        ) : !isRegistered ? (
          <OnboardingWizard
            onComplete={() => {
              setIsRegistered(true)
              setRefreshKey((k) => k + 1)
              setShowCelebration(true)
              if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current)
              celebrationTimerRef.current = setTimeout(() => setShowCelebration(false), 5000)
            }}
          />
        ) : (
          <RegisteredDashboard
            publicKey={publicKey!}
            stats={stats}
            refreshKey={refreshKey}
            setRefreshKey={setRefreshKey}
            creatorLink={creatorLink}
          />
        )}
      </div>
    </PageTransition>
  )
}
