'use client'

import { useEffect, useState, use, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
  ArrowLeftRight,
  Flag,
} from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useSupabase } from '@/hooks/useSupabase'
import SubscribeModal from '@/components/SubscribeModal'
import TipModal from '@/components/TipModal'
import RenewModal from '@/components/RenewModal'
import GiftSubscriptionFlow from '@/components/GiftSubscriptionFlow'
import TransferPassModal from '@/components/TransferPassModal'
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
  const searchParams = useSearchParams()
  const referrerAddress = useMemo(() => {
    const ref = searchParams.get('ref')
    return ref && ref.startsWith('aleo1') && ref.length > 50 ? ref : null
  }, [searchParams])
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
  const [showGift, setShowGift] = useState(false)
  const [giftTier, setGiftTier] = useState<{ id: number; name: string; price: number } | null>(null)
  const [transferPass, setTransferPass] = useState<AccessPass | null>(null)

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
          <div className="p-8 rounded-[12px] border border-red-500/15 bg-red-500/5 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-[#fafafa] mb-2">Failed to Load Creator</h2>
            <p className="text-sm text-[#a1a1aa] mb-4">Could not fetch creator data. Please check your connection and try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-[8px] bg-white/[0.05] border border-white/[0.08] text-[#fafafa] font-medium text-sm hover:bg-white/[0.08] transition-all duration-300 inline-flex items-center gap-2"
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Creator Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-[12px] bg-white/[0.06] flex items-center justify-center">
              <Shield className="w-7 h-7 text-white/40" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#fafafa] mb-1">
                {displayName || shortenAddress(address)}
              </h1>
              {displayName && (
                <p className="text-base text-slate-500 font-mono mb-1">
                  {shortenAddress(address)}
                </p>
              )}
              {bio && (
                <p className="text-sm text-slate-400 mb-1">{bio}</p>
              )}
              <a
                href={`https://testnet.explorer.provable.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-[#a1a1aa] hover:text-[#fafafa]"
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

          {/* Referral Banner */}
          {referrerAddress && isRegistered && (
            <div className="p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/[0.12] mb-4">
              <p className="text-xs text-violet-300 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 shrink-0" />
                Referred by {referrerAddress.slice(0, 10)}...{referrerAddress.slice(-6)} — 10% of your subscription goes to them as a private reward.
              </p>
            </div>
          )}
        </motion.div>

        {!isRegistered ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-[12px] bg-[#0a0a0a] border border-white/[0.08] flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-[#71717a]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#fafafa] mb-3">
              Creator Not Found
            </h2>
            <p className="text-slate-400 max-w-md mx-auto mb-2">
              This address hasn&apos;t registered as a creator on VeilSub yet.
            </p>
            <p className="text-base text-slate-500 font-mono mb-8">
              {shortenAddress(address)}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/#featured"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 transition-all duration-300 active:scale-[0.98]"
              >
                <Search className="w-4 h-4" />
                Browse Featured Creators
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[8px] bg-white/[0.05] border border-white/[0.08] text-[#a1a1aa] text-sm hover:bg-white/[0.08] transition-all duration-300"
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
                        className="flex flex-wrap items-center gap-2 sm:gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.08]"
                      >
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${tierColor}`}
                        >
                          {tierInfo?.name ?? `Tier ${pass.tier}`}
                        </span>
                        <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                          ID: {pass.passId.length > 16 ? `${pass.passId.slice(0, 8)}...${pass.passId.slice(-6)}` : pass.passId}
                        </span>

                        {/* Expiry display */}
                        {expiry !== null && (
                          <span className="ml-auto flex flex-wrap items-center gap-2">
                            {expiry.expired ? (
                              <>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-500/10 text-gray-400 border-gray-500/20">
                                  Expired
                                </span>
                                <button
                                  onClick={() => setRenewPass(pass)}
                                  className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/20 transition-all duration-300 flex items-center gap-1 active:scale-[0.98]"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Renew
                                </button>
                                <button
                                  onClick={() => setTransferPass(pass)}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-[#a1a1aa] hover:bg-white/[0.08] transition-all duration-300 flex items-center gap-1 active:scale-[0.98]"
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                  Transfer
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
                                  <button
                                    onClick={() => setTransferPass(pass)}
                                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-[#a1a1aa] hover:bg-white/[0.08] transition-all duration-300 flex items-center gap-1 active:scale-[0.98]"
                                  >
                                    <ArrowLeftRight className="w-3 h-3" />
                                    Transfer
                                  </button>
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
                      className={`relative p-6 rounded-xl border hover:-translate-y-0.5 transition-all duration-300 ${
                        tier.id === 3
                          ? 'bg-[#0a0a0a] border-white/[0.10] hover:border-white/[0.15]'
                          : 'bg-[#0a0a0a] border-white/[0.08] hover:border-[rgba(255,255,255,0.1)]'
                      }`}
                    >
                      {tier.id === 3 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.10]">
                          <span className="text-xs font-medium text-white/40">
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
                          className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all duration-300 active:scale-[0.98] ${
                            tier.id === 3
                              ? 'bg-white text-black hover:bg-white/90'
                              : 'bg-white/[0.05] border border-white/[0.08] text-[#fafafa] hover:bg-white/[0.08]'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
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

            {/* Tip & Gift Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-xl bg-[#0a0a0a] border border-white/[0.08]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">
                    Send a Private Tip
                  </h2>
                  <p className="text-sm text-slate-400">
                    Show appreciation with a private ALEO transfer. The creator
                    receives 95% via private transfer — 5% platform fee.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setGiftTier({ id: 1, name: 'Supporter', price: basePrice })
                      setShowGift(true)
                    }}
                    disabled={!connected}
                    className="px-4 py-2.5 rounded-[8px] bg-white/[0.05] border border-white/[0.08] text-[#a1a1aa] font-medium text-sm hover:bg-white/[0.08] transition-all duration-300 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    Gift
                  </button>
                  <button
                    onClick={() => setShowTip(true)}
                    disabled={!connected}
                    className="px-4 py-2.5 rounded-[8px] bg-white/[0.05] border border-white/[0.08] text-[#a1a1aa] font-medium text-sm hover:bg-white/[0.08] transition-all duration-300 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Heart className="w-4 h-4" />
                    Tip
                  </button>
                </div>
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
            <div className="p-4 rounded-[8px] bg-[#0a0a0a] border border-white/[0.08]">
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
          referrerAddress={referrerAddress}
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
      {giftTier && (
        <GiftSubscriptionFlow
          isOpen={showGift}
          onClose={() => { setShowGift(false); setGiftTier(null) }}
          creatorAddress={address}
          tierPrice={giftTier.price}
          tierId={giftTier.id}
          tierName={giftTier.name}
        />
      )}
      {transferPass && (
        <TransferPassModal
          isOpen={!!transferPass}
          onClose={() => setTransferPass(null)}
          accessPassPlaintext={transferPass.rawPlaintext}
          creatorAddress={address}
        />
      )}
    </PageTransition>
  )
}
