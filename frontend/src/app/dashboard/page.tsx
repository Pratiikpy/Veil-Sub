'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import {
  Settings,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Info,
  Share2,
  Lock,
  Percent,
} from 'lucide-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import StatsPanel from '@/components/StatsPanel'
import TransactionStatus from '@/components/TransactionStatus'
import CreatorQRCode from '@/components/CreatorQRCode'
import CreatePostForm from '@/components/CreatePostForm'
import { creditsToMicrocredits, formatCredits, shortenAddress } from '@/lib/utils'
import { PLATFORM_FEE_PCT } from '@/lib/config'
import { TIERS } from '@/types'
import type { TxStatus, CreatorProfile } from '@/types'

function ShareText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <div className="relative">
      <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 whitespace-pre-wrap break-all">
        {text}
      </div>
      <button
        onClick={copy}
        className="mt-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied' : 'Copy to clipboard'}
      </button>
    </div>
  )
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet()
  const { registerCreator } = useVeilSub()
  const { fetchCreatorStats } = useCreatorStats()
  const { startPolling, stopPolling } = useTransactionPoller()

  const [price, setPrice] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [stats, setStats] = useState<CreatorProfile | null>(null)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creatorLink, setCreatorLink] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)

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
    fetchCreatorStats(publicKey).then((s) => {
      setStats(s)
      setIsRegistered(s.tierPrice !== null)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [publicKey, fetchCreatorStats, refreshKey])

  // Stop polling on unmount
  useEffect(() => {
    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRegister = async () => {
    if (txStatus !== 'idle' && txStatus !== 'failed') return
    const priceNum = parseFloat(price)
    if (!priceNum || priceNum <= 0) return

    setTxStatus('signing')
    try {
      const id = await registerCreator(creditsToMicrocredits(priceNum))
      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')
        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            setTxStatus('confirmed')
            setShowCelebration(true)
            setTimeout(() => {
              setShowCelebration(false)
              setIsRegistered(true)
              setRefreshKey((k) => k + 1)
            }, 3000)
          } else if (result.status === 'failed') {
            setTxStatus('failed')
          }
        })
      } else {
        setTxStatus('failed')
      }
    } catch {
      setTxStatus('failed')
      setTxId(null)
    }
  }

  const copyLink = async () => {
    if (!publicKey) return
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/creator/${publicKey}`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-violet-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-slate-400">
            Connect your Shield Wallet to access the creator dashboard.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            Creator Dashboard
          </h1>
          <p className="text-slate-400">
            {isRegistered
              ? 'Manage your subscription settings and view aggregate stats.'
              : 'Register as a creator to start accepting private subscriptions.'}
          </p>
        </motion.div>

        {showCelebration ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Shield className="w-16 h-16 text-violet-400 mb-6" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-3">
              You&apos;re Registered!
            </h2>
            <p className="text-slate-400 text-center max-w-md">
              Your creator profile is live on-chain. Subscribers can now find you and subscribe privately.
            </p>
          </motion.div>
        ) : !isRegistered ? (
          /* Registration Form */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg"
          >
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-semibold text-white">
                  Register as Creator
                </h2>
              </div>

              {txStatus === 'idle' || txStatus === 'failed' ? (
                <>
                  <div className="mb-6">
                    <label className="block text-sm text-slate-400 mb-2">
                      Base subscription price (ALEO credits)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="5"
                        min="0.1"
                        step="0.1"
                        onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                        ALEO
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Premium tier = 2x, VIP tier = 5x this price.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10 mb-6">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-400">
                        You&apos;ll never see who subscribes — only aggregate
                        subscriber count and total revenue. Privacy is the core
                        feature. VeilSub takes a {PLATFORM_FEE_PCT}% platform fee on all subscriptions and tips.
                      </p>
                    </div>
                  </div>

                  {txStatus === 'failed' && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                      <p className="text-xs text-red-400">Registration failed. Please try again.</p>
                    </div>
                  )}

                  <button
                    onClick={handleRegister}
                    disabled={!price || parseFloat(price) <= 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {txStatus === 'failed' ? 'Retry' : 'Register'}
                  </button>
                </>
              ) : (
                <TransactionStatus status={txStatus} txId={txId} />
              )}
            </div>
          </motion.div>
        ) : (
          /* Registered Creator Dashboard */
          <div className="space-y-8">
            {/* Share Link */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <div className="flex-1">
                <p className="text-sm text-violet-300 font-medium mb-1">
                  Your creator page
                </p>
                <p className="text-xs text-slate-400 break-all">
                  {creatorLink || `/creator/${shortenAddress(publicKey || '')}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <Link
                  href={`/creator/${publicKey}`}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View
                </Link>
              </div>
            </motion.div>

            {/* QR Code */}
            {publicKey && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <CreatorQRCode creatorAddress={publicKey} />
              </motion.div>
            )}

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="text-lg font-semibold text-white mb-4">
                On-Chain Stats
              </h2>
              {publicKey && (
                <StatsPanel
                  creatorAddress={publicKey}
                  refreshKey={refreshKey}
                />
              )}
            </motion.div>

            {/* Tier Pricing Breakdown */}
            {stats?.tierPrice != null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
              >
                <h2 className="text-lg font-semibold text-white mb-4">
                  Your Tier Pricing
                </h2>
                <div className="grid sm:grid-cols-3 gap-3">
                  {TIERS.map((tier) => {
                    const tierPrice = (stats?.tierPrice ?? 0) * tier.priceMultiplier
                    const colors =
                      tier.id === 3
                        ? 'border-violet-500/20 bg-violet-500/5'
                        : tier.id === 2
                          ? 'border-blue-500/20 bg-blue-500/5'
                          : 'border-green-500/20 bg-green-500/5'
                    const textColor =
                      tier.id === 3
                        ? 'text-violet-300'
                        : tier.id === 2
                          ? 'text-blue-300'
                          : 'text-green-300'
                    return (
                      <div
                        key={tier.id}
                        className={`p-4 rounded-xl border ${colors}`}
                      >
                        <p className={`text-sm font-medium ${textColor} mb-1`}>
                          {tier.name}
                        </p>
                        <p className="text-xl font-bold text-white">
                          {formatCredits(tierPrice)}{' '}
                          <span className="text-xs font-normal text-slate-500">ALEO</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {tier.priceMultiplier}x base price
                        </p>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Platform Fee Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-medium text-white">Platform Fee</h3>
              </div>
              <p className="text-xs text-slate-400">
                VeilSub takes a {PLATFORM_FEE_PCT}% platform fee on subscriptions and tips.
                {100 - PLATFORM_FEE_PCT}% goes directly to you via private transfer.
                Both payments are private — subscribers remain anonymous to you and to the platform.
              </p>
            </motion.div>

            {/* Create Post */}
            {publicKey && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                <CreatePostForm
                  creatorAddress={publicKey}
                  onPostCreated={() => setRefreshKey((k) => k + 1)}
                />
              </motion.div>
            )}

            {/* Content Gating Explainer */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-6 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <h2 className="text-lg font-semibold text-white mb-3">
                How Content Gating Works
              </h2>
              <div className="space-y-3 text-sm text-slate-400">
                <p>
                  Subscribers receive a private <strong className="text-white">AccessPass</strong> record
                  in their wallet with an expiry of ~30 days. This record proves they have access without
                  revealing their identity.
                </p>
                <p>
                  When a subscriber visits your gated content, they can prove
                  access by executing the <code className="px-1.5 py-0.5 rounded bg-white/10 text-violet-300 text-xs">verify_access</code> transition,
                  which consumes and re-creates their pass — proving ownership
                  cryptographically. Access checks have zero public footprint.
                </p>
                <p>
                  You see total subscribers and revenue. You never see individual
                  subscriber identities. That&apos;s the power of zero-knowledge proofs.
                </p>
              </div>
            </motion.div>

            {/* Share Your Page */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="p-6 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-semibold text-white">
                  Share Your Page
                </h2>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Copy a ready-made message to share on social media or messaging apps.
              </p>
              <ShareText
                text={`Support me privately on VeilSub — no one will know you subscribed. Powered by Aleo zero-knowledge proofs.\n${creatorLink || `${typeof window !== 'undefined' ? window.location.origin : ''}/creator/${publicKey}`}`}
              />
            </motion.div>

            {/* Active Gated Content Note */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-xl bg-green-500/5 border border-green-500/20"
            >
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-green-300 font-medium mb-1">
                    Exclusive content is live
                  </p>
                  <p className="text-xs text-slate-400">
                    Your subscribers can now see tier-gated exclusive content on your creator page.
                    Content visibility is determined by each subscriber&apos;s AccessPass — checked
                    locally in their browser, with no server involved. Subscriptions expire after ~30 days
                    and can be renewed.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
