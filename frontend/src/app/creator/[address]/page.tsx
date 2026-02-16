'use client'

import { useEffect, useState, use } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Shield,
  Heart,
  Sparkles,
  Lock,
  Users,
  Coins,
  ExternalLink,
  RefreshCw,
  Clock,
  AlertTriangle,
  ArrowRight,
  Search,
} from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useSupabase } from '@/hooks/useSupabase'
import SubscribeModal from '@/components/SubscribeModal'
import TipModal from '@/components/TipModal'
import RenewModal from '@/components/RenewModal'
import ContentFeed from '@/components/ContentFeed'
import CreatorQRCode from '@/components/CreatorQRCode'
import PageTransition from '@/components/PageTransition'
import {
  shortenAddress,
  formatCredits,
  parseAccessPass,
} from '@/lib/utils'
import { TIERS } from '@/types'
import type { CreatorProfile, SubscriptionTier, AccessPass } from '@/types'

import CreatorSkeleton from '@/components/CreatorSkeleton'

export default function CreatorPage({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = use(params)
  const { connected, address: publicKey } = useWallet()
  const { fetchCreatorStats } = useCreatorStats()
  const { getAccessPasses } = useVeilSub()
  const { blockHeight } = useBlockHeight()
  const { getCreatorProfile } = useSupabase()

  const [stats, setStats] = useState<CreatorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [bio, setBio] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null)
  const [showTip, setShowTip] = useState(false)
  const [userPasses, setUserPasses] = useState<AccessPass[]>([])
  const [renewPass, setRenewPass] = useState<AccessPass | null>(null)

  // Fetch creator stats and profile
  useEffect(() => {
    let cancelled = false
    setFetchError(false)
    fetchCreatorStats(address).then((s) => {
      if (cancelled) return
      setStats(s)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      setFetchError(true)
      setLoading(false)
    })
    getCreatorProfile(address).then((profile) => {
      if (cancelled) return
      if (profile) {
        setDisplayName(profile.display_name)
        setBio(profile.bio)
      }
    }).catch(() => { /* profile unavailable, defaults are fine */ })
    return () => { cancelled = true }
  }, [address, fetchCreatorStats, getCreatorProfile])

  // Fetch user's access passes for this creator
  useEffect(() => {
    if (!connected) {
      setUserPasses([])
      return
    }
    let cancelled = false
    getAccessPasses().then((records) => {
      if (cancelled) return
      const passes = records
        .map((r) => parseAccessPass(r))
        .filter((p): p is NonNullable<typeof p> => p !== null && p.creator === address)
      setUserPasses(passes)
    }).catch(() => {
      if (cancelled) return
      setUserPasses([])
    })
    return () => { cancelled = true }
  }, [connected, address, getAccessPasses])

  if (loading) {
    return <CreatorSkeleton />
  }

  if (fetchError) {
    return (
      <PageTransition className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="p-8 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Failed to Load Creator</h2>
            <p className="text-sm text-slate-400 mb-4">Could not fetch creator data. Please check your connection and try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  const isRegistered = stats?.tierPrice !== null && stats?.tierPrice !== undefined
  const basePrice = stats?.tierPrice ?? 0

  const getPassExpiry = (pass: AccessPass) => {
    if (blockHeight === null || pass.expiresAt === 0) return null
    if (pass.expiresAt <= blockHeight) return { expired: true, daysLeft: 0 }
    const blocksLeft = pass.expiresAt - blockHeight
    const daysLeft = Math.round((blocksLeft * 3) / 86400)
    return { expired: false, daysLeft }
  }

  const getExpiryColor = (daysLeft: number) => {
    if (daysLeft > 14) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', bar: 'bg-green-500' }
    if (daysLeft >= 7) return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', bar: 'bg-orange-500' }
    return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', bar: 'bg-red-500' }
  }

  const getProgressPercent = (pass: AccessPass) => {
    if (blockHeight === null || pass.expiresAt === 0) return 100
    const blocksLeft = pass.expiresAt - blockHeight
    return Math.min(100, Math.max(0, (blocksLeft / 864000) * 100))
  }

  return (
    <PageTransition className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Creator Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {displayName || shortenAddress(address)}
              </h1>
              {displayName && (
                <p className="text-xs text-slate-500 font-mono mb-1">
                  {shortenAddress(address)}
                </p>
              )}
              {bio && (
                <p className="text-sm text-slate-400 mb-1">{bio}</p>
              )}
              <a
                href={`https://explorer.provable.com/testnet/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300"
              >
                View on Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Stats Row */}
          {isRegistered && (
            <div className="flex flex-wrap gap-6 mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-slate-300">
                  {stats?.subscriberCount ?? 0} subscribers
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-300">
                  {formatCredits(stats?.totalRevenue ?? 0)} ALEO earned
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {!isRegistered ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Creator Not Found
            </h2>
            <p className="text-slate-400 max-w-md mx-auto mb-2">
              This address hasn&apos;t registered as a creator on VeilSub yet.
            </p>
            <p className="text-xs text-slate-500 font-mono mb-8">
              {shortenAddress(address)}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/#featured"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium text-sm hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] active:scale-[0.98]"
              >
                <Search className="w-4 h-4" />
                Browse Featured Creators
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors active:scale-[0.98]"
              >
                Register as a Creator
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-10">
            {/* User's Existing Passes */}
            {userPasses.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-xl bg-green-500/5 border border-green-500/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-300">
                    Your AccessPasses ({userPasses.length})
                  </span>
                  <span className="text-xs text-slate-500 ml-auto">Only you can see this</span>
                </div>
                <div className="space-y-2">
                  {userPasses.map((pass, i) => {
                    const tierInfo = TIERS.find((t) => t.id === pass.tier)
                    const tierColor =
                      pass.tier === 3
                        ? 'text-violet-300 bg-violet-500/10 border-violet-500/20'
                        : pass.tier === 2
                          ? 'text-blue-300 bg-blue-500/10 border-blue-500/20'
                          : 'text-green-300 bg-green-500/10 border-green-500/20'
                    const expiry = getPassExpiry(pass)

                    return (
                      <div
                        key={pass.passId || i}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                      >
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${tierColor}`}
                        >
                          {tierInfo?.name ?? `Tier ${pass.tier}`}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          ID: {pass.passId.length > 16 ? `${pass.passId.slice(0, 8)}...${pass.passId.slice(-6)}` : pass.passId}
                        </span>

                        {/* Expiry display */}
                        {expiry !== null && (
                          <span className="ml-auto flex items-center gap-2">
                            {expiry.expired ? (
                              <>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-500/10 text-gray-400 border-gray-500/20">
                                  Expired
                                </span>
                                <button
                                  onClick={() => setRenewPass(pass)}
                                  className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/20 transition-colors flex items-center gap-1 active:scale-[0.98]"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Renew
                                </button>
                              </>
                            ) : (() => {
                              const colors = getExpiryColor(expiry.daysLeft)
                              const progress = getProgressPercent(pass)
                              return (
                                <>
                                  <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 0.8, ease: 'easeOut' }}
                                      className={`h-full rounded-full ${colors.bar}`}
                                    />
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
                                    {expiry.daysLeft}d left
                                  </span>
                                </>
                              )
                            })()}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Subscription Tiers */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">
                Subscription Tiers
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {TIERS.map((tier, i) => {
                  const tierPrice = basePrice * tier.priceMultiplier
                  const hasThisTier = userPasses.some(
                    (p) => p.tier === tier.id
                  )

                  return (
                    <motion.div
                      key={tier.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`relative p-6 rounded-xl border transition-all ${
                        tier.id === 3
                          ? 'bg-gradient-to-b from-violet-500/10 to-purple-500/5 border-violet-500/30'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {tier.id === 3 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 pulse-glow">
                          <span className="text-xs font-medium text-violet-300">
                            Popular
                          </span>
                        </div>
                      )}

                      <h3 className="text-white font-semibold mb-1">
                        {tier.name}
                      </h3>
                      <p className="text-2xl font-bold text-white mb-1">
                        {formatCredits(tierPrice)}{' '}
                        <span className="text-sm font-normal text-slate-400">
                          ALEO
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mb-4">
                        {tier.description}
                      </p>

                      <ul className="space-y-2 mb-6">
                        {tier.features.map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-2 text-xs text-slate-400"
                          >
                            <Sparkles className="w-3 h-3 text-violet-400" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {hasThisTier ? (
                        <div className="w-full py-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-center text-sm text-green-400">
                          Active
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedTier(tier)}
                          disabled={!connected}
                          className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all active:scale-[0.98] ${
                            tier.id === 3
                              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                              : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {connected ? 'Subscribe' : 'Connect wallet'}
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Dynamic Content Feed */}
            <ContentFeed
              creatorAddress={address}
              userPasses={userPasses}
              connected={connected}
              walletAddress={publicKey}
              blockHeight={blockHeight}
            />

            {/* Tip Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">
                    Send a Private Tip
                  </h2>
                  <p className="text-sm text-slate-400">
                    Show appreciation with a private ALEO transfer. The creator
                    receives 95% via private transfer — 5% platform fee.
                  </p>
                </div>
                <button
                  onClick={() => setShowTip(true)}
                  disabled={!connected}
                  className="px-6 py-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300 font-medium text-sm hover:bg-pink-500/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  <Heart className="w-4 h-4" />
                  Tip
                </button>
              </div>
            </motion.div>

            {/* Share QR Code */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CreatorQRCode creatorAddress={address} />
            </motion.div>

            {/* Privacy Notice */}
            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-400 space-y-1">
                  <p>
                    <strong className="text-violet-300">
                      Privacy guarantee:
                    </strong>{' '}
                    Your subscription creates a private AccessPass record visible
                    only to you. The creator receives payment via{' '}
                    <code className="px-1 py-0.5 rounded bg-white/10 text-violet-300">
                      credits.aleo/transfer_private
                    </code>{' '}
                    and sees only aggregate stats (total subscribers, total
                    revenue). Your identity is never linked on-chain. Subscription
                    expiry is checked locally — no on-chain trace when you access content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTier && (
        <SubscribeModal
          isOpen={!!selectedTier}
          onClose={() => setSelectedTier(null)}
          tier={selectedTier}
          creatorAddress={address}
          basePrice={basePrice}
        />
      )}
      <TipModal
        isOpen={showTip}
        onClose={() => setShowTip(false)}
        creatorAddress={address}
      />
      {renewPass && (
        <RenewModal
          isOpen={!!renewPass}
          onClose={() => setRenewPass(null)}
          pass={renewPass}
          basePrice={basePrice}
        />
      )}
    </PageTransition>
  )
}
