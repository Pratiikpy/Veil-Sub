'use client'

import { useState, useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import Link from 'next/link'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { ExternalLink, Shield, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { useSupabase } from '@/hooks/useSupabase'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import PageTransition from '@/components/PageTransition'
import { creditsToMicrocredits } from '@/lib/utils'
import { saveCreatorHash } from '@/lib/config'
import type { TxStatus, CreatorProfile } from '@/types'

import ConnectWalletPrompt from '@/components/dashboard/ConnectWalletPrompt'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import RegistrationForm from '@/components/dashboard/RegistrationForm'
import RegisteredDashboard from '@/components/dashboard/RegisteredDashboard'

const CelebrationBurst = dynamic(() => import('@/components/CelebrationBurst'), { ssr: false })

const TITLE_STYLE = { letterSpacing: '-0.03em' } as const

export default function DashboardPage() {
  const { address: publicKey, connected, signMessage } = useWallet()
  const { registerCreator } = useVeilSub()
  const { fetchCreatorStats } = useCreatorStats()
  const { startPolling, stopPolling } = useTransactionPoller()
  const { upsertCreatorProfile } = useSupabase()

  const [price, setPrice] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bioText, setBioText] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [stats, setStats] = useState<CreatorProfile | null>(null)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
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
    fetchCreatorStats(publicKey).then((s) => {
      if (cancelled) return
      setStats(s)
      setIsRegistered(s.tierPrice !== null)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      setStatsError(true)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [publicKey, fetchCreatorStats, refreshKey])

  // Stop polling on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const handleRegister = async () => {
    if (txStatus !== 'idle' && txStatus !== 'failed') return
    const priceNum = parseFloat(price)
    if (!Number.isFinite(priceNum) || priceNum <= 0) return

    setTxStatus('signing')
    try {
      const id = await registerCreator(creditsToMicrocredits(priceNum))
      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')
        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            const resolvedId = result.resolvedTxId ?? id
            if (result.resolvedTxId) setTxId(result.resolvedTxId)
            setTxStatus('confirmed')
            toast.success('Registered on-chain!')
            // Extract creator hash from finalize args and save to localStorage
            // so the dashboard works for ANY wallet, not just hardcoded ones
            if (publicKey) {
              fetch(`/api/aleo/transaction/${encodeURIComponent(resolvedId)}`)
                .then(r => r.json())
                .then(tx => {
                  const hash = tx?.transitions?.[0]?.finalize?.[0]
                    ?? tx?.execution?.transitions?.[0]?.finalize?.[0]
                  if (hash && typeof hash === 'string' && hash.endsWith('field')) {
                    saveCreatorHash(publicKey, hash)
                  }
                })
                .catch(() => {}) // non-critical
            }
            // Save profile (best-effort, non-blocking)
            if (publicKey) {
              const wrappedSign = signMessage
                ? async (msg: Uint8Array) => {
                    const r = await signMessage(msg)
                    if (!r) throw new Error('Signing cancelled')
                    return r
                  }
                : null
              upsertCreatorProfile(publicKey, displayName || undefined, bioText || undefined, wrappedSign)
                .catch(() => {
                  toast.warning('Profile saved on-chain but off-chain metadata could not be saved.')
                })
            }
            setShowCelebration(true)
            celebrationTimerRef.current = setTimeout(() => {
              setShowCelebration(false)
              setIsRegistered(true)
              setRefreshKey((k) => k + 1)
            }, 4000)
          } else if (result.status === 'failed') {
            setTxStatus('failed')
          }
        })
      } else {
        setTxStatus('failed')
      }
    } catch (err) {
      setTxStatus('failed')
      setTxId(null)
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    }
  }

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
      toast.error('Clipboard not available. Please copy manually.')
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-3xl font-serif italic text-white mb-4">Creator Dashboard</h1>
          <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/15 max-w-md mx-auto">
            <p className="text-sm text-red-300 mb-4">Could not load your creator status. This may be a network issue.</p>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              aria-label="Retry loading creator stats"
              className="px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1
            className="text-3xl sm:text-4xl font-serif italic text-white mb-2"
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
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Shield className="w-16 h-16 text-violet-400 mb-6" aria-hidden="true" />
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-border text-sm text-violet-300 hover:bg-violet-500/20 transition-all duration-300 active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  View your page
                </Link>
                <button
                  onClick={copyLink}
                  aria-label="Copy your creator profile link to clipboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-border text-sm text-white/70 hover:bg-white/[0.08] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  Share your link
                </button>
              </div>
            </m.div>
          </m.div>
        ) : !isRegistered ? (
          <RegistrationForm
            price={price}
            setPrice={setPrice}
            displayName={displayName}
            setDisplayName={setDisplayName}
            bioText={bioText}
            setBioText={setBioText}
            txStatus={txStatus}
            txId={txId}
            onRegister={handleRegister}
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
