'use client'

import { useEffect, useState, useRef, use, useCallback, useMemo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Heart,
  Sparkles,
  Users,
  Coins,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Search,
  ArrowLeftRight,
  Flag,
  Copy,
  Check,
  Share2,
  FileKey,
  Gift,
  MoreHorizontal,
  ChevronDown,
  MessageCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useCreatorStats, clearMappingCache } from '@/hooks/useCreatorStats'
import { useCreatorTiers } from '@/hooks/useCreatorTiers'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useSupabase } from '@/hooks/useSupabase'
import dynamic from 'next/dynamic'
const SubscribeModal = dynamic(() => import('@/components/SubscribeModal'), { ssr: false })
const TipModal = dynamic(() => import('@/components/TipModal'), { ssr: false })
const RenewModal = dynamic(() => import('@/components/RenewModal'), { ssr: false })
const GiftSubscriptionFlow = dynamic(() => import('@/components/GiftSubscriptionFlow'), { ssr: false })
const TransferPassModal = dynamic(() => import('@/components/TransferPassModal'), { ssr: false })
const DisputeContentModal = dynamic(() => import('@/components/DisputeContentModal'), { ssr: false })
const CreateAuditTokenModal = dynamic(() => import('@/components/CreateAuditTokenModal'), { ssr: false })
const RedeemGiftModal = dynamic(() => import('@/components/RedeemGiftModal'), { ssr: false })
const TipMenu = dynamic(() => import('@/components/TipMenu'), { ssr: false })
import BlockchainView from '@/components/BlockchainView'
import PrivacyScore from '@/components/PrivacyScore'
import ContentFeed from '@/components/ContentFeed'
const ContentVault = dynamic(() => import('@/components/ContentVault'), { ssr: false })
import ReadingProgressBar from '@/components/ReadingProgressBar'
import PageTransition from '@/components/PageTransition'
import AnimatedTabs from '@/components/ui/AnimatedTabs'
import AddressAvatar from '@/components/ui/AddressAvatar'
import {
  shortenAddress,
  formatCredits,
  formatUsd,
  parseAccessPass,
  subscriberThresholdLabel,
} from '@/lib/utils'
import { TIERS } from '@/types'
import type { CreatorProfile, SubscriptionTier, AccessPass } from '@/types'
import { FEATURED_CREATORS, DEPLOYED_PROGRAM_ID, PROGRAM_ID, getCreatorHash, CREATOR_HASH_MAP } from '@/lib/config'
import { getCachedCreator, cacheSingleCreator } from '@/lib/creatorCache'

import CreatorSkeleton from '@/components/CreatorSkeleton'
import { spring } from '@/lib/motion'

// --- Utilities ---

/** Deterministic gradient from an Aleo address — used for the cover banner */
function generateCoverGradient(address: string): string {
  const hash = address.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
  const light1 = 16 + Math.abs(hash % 8)          // 16-23%
  const light2 = 12 + Math.abs((hash >> 8) % 6)   // 12-17%
  const light3 = 20 + Math.abs((hash >> 16) % 8)  // 20-27%
  return `linear-gradient(135deg, hsl(0, 0%, ${light1}%) 0%, hsl(0, 0%, ${light2}%) 50%, hsl(0, 0%, ${light3}%) 100%)`
}

/** Get display info for a creator from FEATURED_CREATORS or null */
function getFeaturedInfo(address: string) {
  return FEATURED_CREATORS.find((c) => c.address === address) ?? null
}

// --- Sub-components ---

/** Overflow menu for secondary actions (Tip, Gift, Share, etc.) */
function OverflowMenu({
  connected,
  hasPass,
  onTip,
  onGift,
  onMessage,
  onShare,
  onReportCreator,
  onRedeem,
}: {
  connected: boolean
  hasPass: boolean
  onTip: () => void
  onGift: () => void
  onMessage: () => void
  onShare: () => void
  onReportCreator: () => void
  onRedeem: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="More actions"
        className="w-10 h-10 rounded-xl bg-white/[0.05] border border-border text-white/70 flex items-center justify-center hover:bg-white/[0.08] transition-all duration-200"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            role="menu"
            aria-label="Creator actions"
            className="absolute right-0 top-full mt-2 z-30 min-w-[200px] py-1.5 rounded-xl bg-[#1a1a1a] border border-border shadow-2xl"
          >
            <button
              role="menuitem"
              disabled={!connected}
              onClick={() => { onTip(); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Heart className="w-4 h-4" />
              Send Tip
            </button>
            {hasPass && (
              <button
                role="menuitem"
                onClick={() => { onMessage(); setOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-3"
              >
                <MessageCircle className="w-4 h-4" />
                Message Creator
              </button>
            )}
            <button
              role="menuitem"
              disabled={!connected}
              onClick={() => { onGift(); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Gift className="w-4 h-4" />
              Gift Subscription
            </button>
            <button
              role="menuitem"
              disabled={!connected}
              onClick={() => { onRedeem(); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              Redeem Gift
            </button>
            <div className="my-1 mx-3 h-px bg-white/[0.06]" />
            <button
              role="menuitem"
              onClick={() => { onShare(); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-3"
            >
              <Share2 className="w-4 h-4" />
              Share Profile
            </button>
            {hasPass && (
              <>
                <div className="my-1 mx-3 h-px bg-white/[0.06]" />
                <button
                  role="menuitem"
                  onClick={() => { onReportCreator(); setOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors flex items-center gap-3"
                >
                  <Flag className="w-4 h-4" />
                  Report Creator
                </button>
              </>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Active subscription passes section (compact, collapsible) */
function ActivePasses({
  passes,
  displayTiers,
  blockHeight,
  onRenew,
  onTransfer,
  onAuditToken,
}: {
  passes: AccessPass[]
  displayTiers: SubscriptionTier[]
  blockHeight: number | null
  onRenew: (p: AccessPass) => void
  onTransfer: (p: AccessPass) => void
  onAuditToken: (p: AccessPass) => void
}) {
  const [expanded, setExpanded] = useState(false)

  if (passes.length === 0) return null

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

  const tierColorMap: Record<number, string> = {
    1: 'text-green-300 bg-green-500/10 border-green-500/20',
    2: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
    3: 'text-white/70 bg-white/[0.04] border-white/10',
    4: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    5: 'text-pink-300 bg-pink-500/10 border-pink-500/20',
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl bg-green-500/[0.04] border border-green-500/15 overflow-hidden"
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-green-500/[0.02] transition-colors"
      >
        <Shield className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-green-300 flex-1">
          Your Passes ({passes.length})
        </span>
        <span className="text-xs text-white/50">Only you can see this</span>
        <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {passes.map((pass, i) => {
                const tierInfo = displayTiers.find((t) => t.id === pass.tier)
                const tierColor = tierColorMap[pass.tier] || 'text-white/70 bg-white/5 border-border'
                const expiry = getPassExpiry(pass)

                return (
                  <div
                    key={pass.passId || i}
                    className="flex flex-wrap items-center gap-2 sm:gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-border"
                  >
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${tierColor}`}>
                      {tierInfo?.name ?? `Tier ${pass.tier}`}
                    </span>

                    {expiry !== null && (
                      <span className="ml-auto flex flex-wrap items-center gap-2">
                        {expiry.expired ? (
                          <>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-white/[0.05] text-white/60 border-border">
                              Expired
                            </span>
                            <button
                              onClick={() => onRenew(pass)}
                              title="Renew subscription"
                              className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/70 hover:bg-white/10 transition-all flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" aria-hidden="true" />
                              Renew
                            </button>
                          </>
                        ) : (() => {
                          const colors = getExpiryColor(expiry.daysLeft)
                          const progress = getProgressPercent(pass)
                          return (
                            <>
                              <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <m.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${colors.bar}`}
                                />
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
                                {expiry.daysLeft}d left
                              </span>
                            </>
                          )
                        })()}
                        <button
                          onClick={() => onTransfer(pass)}
                          title="Transfer pass"
                          aria-label="Transfer pass"
                          className="px-2 py-1 rounded-lg bg-white/[0.04] border border-border text-xs text-white/60 hover:bg-white/[0.08] transition-all flex items-center gap-1"
                        >
                          <ArrowLeftRight className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => onAuditToken(pass)}
                          title="Create audit token"
                          aria-label="Create audit token"
                          className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white/70 hover:bg-white/[0.06] transition-all flex items-center gap-1"
                        >
                          <FileKey className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}

/** Duration toggle — Ghost Portal-style animated toggle */
type DurationPeriod = 1 | 3

function DurationToggle({
  period,
  onChange,
}: {
  period: DurationPeriod
  onChange: (p: DurationPeriod) => void
}) {
  return (
    <div className="inline-flex items-center rounded-full bg-white/[0.04] border border-border p-1 relative">
      {/* Animated sliding background */}
      <m.div
        className="absolute top-1 bottom-1 rounded-full bg-white/[0.08] border border-white/10"
        initial={false}
        animate={{
          left: period === 1 ? 4 : '50%',
          right: period === 3 ? 4 : '50%',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
      <button
        onClick={() => onChange(1)}
        className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
          period === 1 ? 'text-white' : 'text-white/50 hover:text-white/70'
        }`}
      >
        ~30 days
      </button>
      <button
        onClick={() => onChange(3)}
        className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${
          period === 3 ? 'text-white' : 'text-white/50 hover:text-white/70'
        }`}
      >
        ~90 days
        <span className="px-1.5 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-[10px] font-semibold text-green-400 leading-none">
          3 months
        </span>
      </button>
    </div>
  )
}

/** Tier card for the Tiers tab */
function TierCard({
  tier,
  basePrice,
  hasThisTier,
  isMostPopular,
  connected,
  onSubscribe,
  index,
  subscriberCount,
  period,
}: {
  tier: SubscriptionTier
  basePrice: number
  hasThisTier: boolean
  isMostPopular: boolean
  connected: boolean
  onSubscribe: (tier: SubscriptionTier) => void
  index: number
  subscriberCount?: number
  period: DurationPeriod
}) {
  const singlePrice = basePrice * tier.priceMultiplier
  const tierPrice = singlePrice * period
  const durationLabel = period === 3 ? '~90 days' : '~30 days'

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 30 } }}
      className={`relative flex flex-col p-6 rounded-xl border transition-all duration-300 ${
        isMostPopular
          ? 'bg-surface-1 border-white/10 hover:border-white/15 shadow-[0_0_30px_rgba(255,255,255,0.04)] hover:shadow-[0_0_40px_rgba(255,255,255,0.06)]'
          : 'bg-surface-1 border-border hover:border-glass-hover'
      }`}
    >
      {isMostPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10">
          <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">
            Most Popular
          </span>
        </div>
      )}

      <h3 className={`text-white font-semibold text-lg mb-1 ${isMostPopular ? 'mt-2' : ''}`}>
        {tier.name}
      </h3>
      <div className="mb-1">
        <m.span
          key={`${tier.id}-${period}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-2xl font-bold text-white inline-block"
        >
          {formatCredits(tierPrice)}
        </m.span>
        <span className="text-sm font-normal text-white/60 ml-1">ALEO</span>
      </div>
      <m.p
        key={`usd-${tier.id}-${period}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs text-white/50 mb-1"
      >
        {formatUsd(tierPrice)}/{durationLabel}
      </m.p>
      {period === 3 && (
        <m.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-[11px] text-white/60 mb-3"
        >
          {formatCredits(singlePrice)} ALEO/~30 days
        </m.p>
      )}
      {period === 1 && <div className="mb-3" />}

      {tier.description && (
        <p className="text-xs text-white/60 mb-4">{tier.description}</p>
      )}

      <ul className="space-y-2 mb-4 flex-1">
        {(tier.features?.length ? tier.features : ['Access to exclusive content']).map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-white/70">
            <Check className="w-3.5 h-3.5 text-white/60 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {/* No auto-renewal reassurance */}
      <p className="text-[11px] text-white/60 mb-3 flex items-center gap-1.5">
        <Shield className="w-3 h-3 text-white/50 shrink-0" />
        No auto-renewal — you control when to renew
      </p>

      {subscriberCount !== undefined && subscriberCount > 0 && (
        <p className="text-xs text-white/50 mb-3 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''}
        </p>
      )}

      {hasThisTier ? (
        <div className="w-full py-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-center text-sm text-green-400 font-medium">
          Active
        </div>
      ) : (
        <button
          onClick={() => onSubscribe(tier)}
          disabled={!connected}
          title={!connected ? 'Connect your wallet to subscribe' : undefined}
          className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all duration-300 active:scale-[0.98] btn-shimmer ${
            isMostPopular
              ? 'bg-white text-black hover:bg-white/90'
              : 'bg-white/[0.05] border border-border text-white hover:bg-white/[0.08]'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {connected
            ? period === 3 ? `Subscribe for ${durationLabel}` : 'Subscribe'
            : 'Connect wallet'}
        </button>
      )}
    </m.div>
  )
}

/** About tab content */
function AboutTab({
  address,
  bio,
  displayName,
  stats,
  copied,
  onCopyAddress,
  creatorHash,
  tierName,
  tierPrice,
  userPasses,
}: {
  address: string
  bio: string | null
  displayName: string | null
  stats: CreatorProfile | null
  copied: boolean
  onCopyAddress: () => void
  creatorHash: string
  tierName: string
  tierPrice: string
  userPasses: AccessPass[]
}) {
  return (
    <div className="space-y-6">
      {/* Blockchain View toggle — the #1 wow factor */}
      <BlockchainView
        creatorName={displayName || 'Anonymous Creator'}
        creatorAddress={address}
        subscriberCount={stats?.subscriberThreshold ?? 'New'}
        revenue={stats?.revenueThreshold ?? 'New'}
        tierName={tierName}
        tierPrice={tierPrice}
        creatorHash={creatorHash}
        contentCount={stats?.contentCount ?? 0}
      />

      {/* Full bio */}
      <div className="p-6 rounded-xl bg-surface-1 border border-border">
        <h3 className="text-white font-semibold mb-3">About</h3>
        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
          {bio || 'This creator hasn\'t added a bio yet.'}
        </p>
      </div>

      {/* Stats — threshold badges for privacy */}
      {stats?.dataUnavailable ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-amber-300">Stats unavailable</p>
            <p className="text-xs text-amber-300/70 mt-0.5">On-chain data could not be loaded. This does not mean the creator has no activity.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-surface-1 border border-border text-center" title="Shown as a range to protect creator privacy">
              <p className="text-2xl font-bold text-white">{stats?.subscriberThreshold ?? 'New'}</p>
              <p className="text-xs text-white/50 mt-1">Subscribers</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-1 border border-border text-center">
              <p className="text-2xl font-bold text-white">{stats?.contentCount ?? 0}</p>
              <p className="text-xs text-white/50 mt-1">Posts</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-1 border border-border text-center col-span-2 sm:col-span-1" title="Shown as a range to protect creator privacy">
              <p className="text-2xl font-bold text-white">{stats?.revenueThreshold ?? 'New'}</p>
              <p className="text-xs text-white/50 mt-1">Revenue</p>
            </div>
          </div>
          <p className="text-[11px] text-white/50 mt-2 flex items-center gap-1">
            <Shield className="w-3 h-3 text-white/50" />
            Counts shown as threshold badges to protect creator privacy. Exact figures are never displayed.
          </p>
        </>
      )}

      {/* Privacy Score */}
      {(() => {
        const userPassForCreator = userPasses.find(p => p.creator === address)
        const hasEnhancedPass = userPasses.some(p => p.creator === address && p.privacyLevel >= 2)
        return (
          <PrivacyScore
            usesBlindSub={userPassForCreator?.privacyLevel === 1 || hasEnhancedPass}
            // Blocked: commit-reveal tip history not queryable on-chain yet
            usesCommitRevealTip={false}
            hasScopedAuditToken={false} /* Blocked: audit token record query not available yet */
            usesTrialPass={userPassForCreator?.privacyLevel === 2}
            hasE2EContent={true}
          />
        )
      })()}

      {/* Share */}
      <div className="p-4 rounded-xl bg-surface-1 border border-border">
        <div className="flex items-center gap-3 mb-3">
          <Share2 className="w-4 h-4 text-white/60" />
          <h3 className="text-white font-semibold text-sm">Share this creator</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-border text-xs font-mono text-white/50 truncate">
            {typeof window !== 'undefined' ? window.location.href : `/creator/${address}`}
          </div>
          <button
            onClick={onCopyAddress}
            className="px-3 py-2 rounded-lg bg-white/[0.05] border border-border text-xs text-white/70 hover:bg-white/[0.08] transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* On-chain info (expandable) */}
      <details className="group rounded-xl bg-surface-1 border border-border overflow-hidden">
        <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm text-white/60 hover:text-white/70 transition-colors">
          <Shield className="w-4 h-4 text-white/60" />
          <span className="flex-1 font-medium">On-chain Information</span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 space-y-3 text-xs text-white/60">
          <div>
            <p className="text-white/50 mb-1">Creator Address</p>
            <p className="font-mono break-all">{address}</p>
          </div>
          <div>
            <p className="text-white/50 mb-1">Program</p>
            <p className="font-mono">{DEPLOYED_PROGRAM_ID}</p>
          </div>
          <a
            href={`https://testnet.explorer.provable.com/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-white/50 hover:text-white/70 transition-colors"
          >
            View on AleoScan
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </details>

      {/* Privacy notice */}
      <div className="p-4 rounded-xl bg-surface-1 border border-border">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-white/60 mt-0.5 shrink-0" />
          <div className="text-xs text-white/60 space-y-1">
            <p>
              <strong className="text-white/70">Privacy guarantee:</strong>{' '}
              Your subscription creates a private pass visible only to you. The creator receives payment privately
              and sees only aggregate stats. Your identity is never linked on the blockchain.
            </p>
            <p className="pt-1">
              <Link href="/privacy" className="text-white/50 hover:text-white/70 transition-colors inline-flex items-center gap-1">
                See how your privacy is protected
                <ArrowRight className="w-3 h-3" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main Page ---

export default function CreatorPage({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = use(params)
  const router = useRouter()
  const { connected, address: publicKey } = useWallet()
  const { fetchCreatorStats } = useCreatorStats()
  const { tiers: onChainTiers, tierCount: onChainTierCount, loading: tiersLoading } = useCreatorTiers(address)
  const { getAccessPasses } = useVeilSub()
  const { blockHeight } = useBlockHeight()
  const { getCreatorProfile } = useSupabase()

  const [stats, setStats] = useState<CreatorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [bio, setBio] = useState<string | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null)
  const [showTip, setShowTip] = useState(false)
  const [userPasses, setUserPasses] = useState<AccessPass[]>([])
  const [renewPass, setRenewPass] = useState<AccessPass | null>(null)
  const [upgradeTierId, setUpgradeTierId] = useState<number | undefined>(undefined)
  const [showGift, setShowGift] = useState(false)
  const [giftTier, setGiftTier] = useState<{ id: number; name: string; price: number } | null>(null)
  const [showRedeemGift, setShowRedeemGift] = useState(false)
  const [transferPass, setTransferPass] = useState<AccessPass | null>(null)
  const [disputeContentId, setDisputeContentId] = useState<string | null>(null)
  const [auditTokenPass, setAuditTokenPass] = useState<AccessPass | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1)
      if (hash && ['posts', 'tiers', 'tip-menu', 'about'].includes(hash)) {
        return hash
      }
    }
    return 'posts'
  })
  const [contentViewMode, setContentViewMode] = useState<'feed' | 'grid'>('feed')
  const [contentRefreshKey, setContentRefreshKey] = useState(0)
  const [durationPeriod, setDurationPeriod] = useState<DurationPeriod>(1)

  // Sync hash on popstate (browser back/forward)
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash && ['posts', 'tiers', 'tip-menu', 'about'].includes(hash)) {
        setActiveTab(hash)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    window.history.replaceState(null, '', `#${tab}`)
  }, [])

  const coverGradient = useMemo(() => generateCoverGradient(address), [address])

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [address])

  const handleShare = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: displayName || 'VeilSub Creator', text: 'Check out this creator on VeilSub — private subscriptions on Aleo.', url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    }
  }, [displayName])

  // Refetch user's access passes (called after subscribe/redeem success)
  const loadPasses = useCallback(async () => {
    if (!connected) {
      setUserPasses([])
      return
    }
    try {
      const records = await getAccessPasses()
      const passes = (records ?? [])
        .map((r) => parseAccessPass(r))
        .filter((p): p is NonNullable<typeof p> => p !== null && p.creator === address)
      setUserPasses(passes)
    } catch {
      // Show error instead of silent fail so user knows to refresh
      toast.error('Could not load your access passes. Refresh the page to see your subscription.', { id: 'load-passes-error' })
    }
  }, [connected, address, getAccessPasses])

  // Refetch creator stats (called after tip/subscribe success)
  const refreshStats = useCallback(async () => {
    try {
      // Clear mapping cache to ensure fresh data from on-chain
      clearMappingCache()
      const s = await fetchCreatorStats(address)
      setStats(s)
    } catch {
      // Silent fail — stats remain stale but page still works
    }
  }, [address, fetchCreatorStats])

  // Fetch creator stats and profile.
  // Privacy: check sessionStorage cache first to avoid individual Supabase requests
  // that would leak browsing interest patterns in server logs.
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

    // Check client-side cache first (populated by /explore bulk fetch)
    const cached = getCachedCreator(address)
    if (cached) {
      // Cache hit — no Supabase request needed, browsing interest stays private
      if (cached.display_name) setDisplayName(cached.display_name)
      if (cached.bio) setBio(cached.bio)
      if (cached.image_url) setProfileImageUrl(cached.image_url)
      if (cached.cover_url) setCoverImageUrl(cached.cover_url)
    } else {
      // Cache miss — fall back to individual Supabase fetch, then cache the result
      getCreatorProfile(address).then((profile) => {
        if (cancelled) return
        if (profile) {
          setDisplayName(profile.display_name)
          setBio(profile.bio)
          if (profile.image_url) setProfileImageUrl(profile.image_url)
          if (profile.cover_url) setCoverImageUrl(profile.cover_url)
          // Cache for future navigation within this tab session
          cacheSingleCreator({
            address,
            display_name: profile.display_name,
            bio: profile.bio,
            image_url: profile.image_url,
            cover_url: profile.cover_url ?? null,
          })
        }
      }).catch(() => {
        toast.warning('Profile details unavailable. Using on-chain data only.', { id: 'profile-fetch-warn' })
      })
    }
    return () => { cancelled = true }
  }, [address, fetchCreatorStats, getCreatorProfile])

  // Safety timeout: if loading takes > 5s, show the page anyway with placeholders
  // instead of blocking on skeleton forever (e.g., API timeout, slow network)
  useEffect(() => {
    if (!loading) return
    const timeout = setTimeout(() => {
      if (loading) setLoading(false)
    }, 5000)
    return () => clearTimeout(timeout)
  }, [loading])

  // Fetch user's access passes for this creator
  useEffect(() => {
    if (!connected) {
      setUserPasses([])
      return
    }
    let cancelled = false
    getAccessPasses().then((records) => {
      if (cancelled) return
      const passes = (records ?? [])
        .map((r) => parseAccessPass(r))
        .filter((p): p is NonNullable<typeof p> => p !== null && p.creator === address)
      setUserPasses(passes)
    }).catch(() => {
      if (cancelled) return
      setUserPasses([])
      toast.error('Failed to load your access passes', { id: 'access-passes-error' })
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
          <div className="p-8 rounded-xl border border-red-500/15 bg-red-500/5 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Creator</h2>
            <p className="text-sm text-white/70 mb-4">Could not fetch creator data. Please check your connection and try again.</p>
            <button
              onClick={() => { setFetchError(false); setLoading(true); fetchCreatorStats(address).then((s) => { setStats(s); setLoading(false) }).catch(() => { setFetchError(true); setLoading(false) }) }}
              className="px-6 py-2.5 rounded-xl bg-white/[0.05] border border-border text-white font-medium text-sm hover:bg-white/[0.08] transition-all duration-300 inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  const isRegistered = stats?.tierPrice !== null && stats?.tierPrice !== undefined
  const basePrice = stats?.tierPrice ?? 0
  const hasOnChainTiers = onChainTierCount > 0

  // Build display tiers
  const confirmedCustomIds = Object.entries(onChainTiers)
    .filter(([, custom]) => custom.price > 0)
    .map(([id]) => Number(id))
    .sort((a, b) => a - b)

  const displayTiers = (hasOnChainTiers
    ? [1, ...confirmedCustomIds]
    : TIERS.map(t => t.id)
  ).map(id => {
    const hardcoded = TIERS.find(t => t.id === id)
    const custom = onChainTiers[id]
    if (custom && custom.price > 0) {
      return {
        ...(hardcoded ?? { description: '', features: [] as string[] }),
        id,
        name: custom.name || hardcoded?.name || `Tier ${id}`,
        priceMultiplier: basePrice > 0 ? custom.price / basePrice : 1,
      }
    }
    return hardcoded ?? { id, name: `Tier ${id}`, priceMultiplier: id, description: '', features: [] as string[] }
  })

  // Determine subscription status
  const isSubscribed = userPasses.length > 0
  const hasExpiringPass = userPasses.some((p) => {
    if (blockHeight === null || p.expiresAt === 0) return false
    if (p.expiresAt <= blockHeight) return true
    const blocksLeft = p.expiresAt - blockHeight
    const daysLeft = Math.round((blocksLeft * 3) / 86400)
    return daysLeft <= 7
  })

  // Featured info
  const featured = getFeaturedInfo(address)
  const creatorLabel = displayName || featured?.label || shortenAddress(address)
  const creatorBio = bio || featured?.bio || null
  const creatorCategory = featured?.category || null

  // Primary button logic
  const renderPrimaryButton = () => {
    if (!connected) {
      return (
        <button
          disabled
          className="px-5 py-2.5 rounded-xl bg-white/[0.05] border border-border text-white/50 font-medium text-sm cursor-not-allowed"
        >
          Connect wallet
        </button>
      )
    }
    if (isSubscribed && !hasExpiringPass) {
      const highestTier = Math.max(...userPasses.map(p => p.tier))
      const hasHigherTiers = displayTiers.some(t => t.id > highestTier)
      return (
        <div className="flex items-center gap-2">
          <div className="px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-medium text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            Subscribed
          </div>
          {hasHigherTiers && (
            <button
              onClick={() => {
                const nextTier = displayTiers.find(t => t.id > highestTier)
                if (nextTier) setUpgradeTierId(nextTier.id)
                setRenewPass(userPasses.find(p => p.tier === highestTier) ?? userPasses[0])
              }}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 transition-all duration-300 active:scale-[0.98]"
            >
              Upgrade
            </button>
          )}
        </div>
      )
    }
    if (isSubscribed && hasExpiringPass) {
      return (
        <button
          onClick={() => setRenewPass(userPasses[0])}
          className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 transition-all duration-300 flex items-center gap-2 active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4" />
          Renew
        </button>
      )
    }
    return (
      <button
        onClick={() => setSelectedTier(displayTiers[0] ?? null)}
        className="px-5 py-2.5 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 transition-all duration-300 active:scale-[0.98] btn-shimmer"
      >
        Subscribe
      </button>
    )
  }

  // Tab definitions
  const tabs = [
    { id: 'posts', label: 'Posts', count: stats?.contentCount },
    { id: 'tiers', label: 'Tiers', count: displayTiers.length },
    { id: 'tip-menu', label: 'Tip Menu' },
    { id: 'about', label: 'About' },
  ]

  return (
    <PageTransition className="min-h-screen">
      <ReadingProgressBar />
      {!isRegistered ? (
        /* Unregistered creator state — check if known from older contract version */
        (() => {
          const isKnownCreator = address in CREATOR_HASH_MAP || FEATURED_CREATORS.some(fc => fc.address === address)
          const featuredInfo = FEATURED_CREATORS.find(fc => fc.address === address)
          const versionLabel = PROGRAM_ID.match(/v(\d+)/)?.[0] ?? 'v30'
          return (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                {/* Show profile image if available from Supabase/cache */}
                {profileImageUrl ? (
                  <div className="mx-auto mb-6 w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white/10">
                    <img src={profileImageUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="mx-auto mb-6 w-16 h-16">
                    <AddressAvatar address={address} size={64} />
                  </div>
                )}
                {/* Show display name if available */}
                {(displayName || featuredInfo?.label) && (
                  <p className="text-lg font-medium text-white mb-2">
                    {displayName || featuredInfo?.label}
                  </p>
                )}
                <h2 className="text-2xl font-semibold text-white mb-4">
                  {isKnownCreator ? 'Creator Needs Re-registration' : 'Creator Not Found'}
                </h2>
                {isKnownCreator ? (
                  <>
                    <div className="max-w-lg mx-auto mb-4 p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
                      <p className="text-sm text-amber-300/90 mb-2">
                        This creator is known but hasn&apos;t registered on the current contract version ({versionLabel}).
                      </p>
                      <p className="text-xs text-white/60">
                        Each contract upgrade (e.g., v27 to {versionLabel}) creates a new on-chain program. Creator registrations, subscriptions, and content exist only on the version where they were created. This creator needs to re-register on {versionLabel} for their page to be fully active.
                      </p>
                    </div>
                    {(bio || featuredInfo?.bio) && (
                      <p className="text-sm text-white/60 max-w-md mx-auto mb-4">
                        {bio || featuredInfo?.bio}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-white/70 max-w-md mx-auto mb-2">
                    This address hasn&apos;t registered as a creator on VeilSub yet.
                  </p>
                )}
                <p className="text-base text-white/60 font-mono mb-8">
                  {shortenAddress(address)}
                </p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-6 py-4 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 transition-all duration-300 active:scale-[0.98]"
                  >
                    <Search className="w-4 h-4" aria-hidden="true" />
                    Browse Featured Creators
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white/[0.05] border border-border text-white/70 text-sm hover:bg-white/[0.08] transition-all duration-300"
                  >
                    Register as a Creator
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </m.div>
            </div>
          )
        })()
      ) : (
        <>
          {/* ===== A. Cover Banner ===== */}
          <div
            className="w-full h-40 sm:h-60 relative"
            style={coverImageUrl ? undefined : { background: coverGradient }}
          >
            {coverImageUrl && (
              <img
                src={coverImageUrl}
                alt="Cover"
                className="w-full h-full object-cover absolute inset-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  const parent = (e.target as HTMLImageElement).parentElement
                  if (parent) parent.style.background = coverGradient
                }}
              />
            )}
            {/* Subtle noise overlay for texture */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")' }} />
            {/* Bottom fade into page background */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--bg-base)] to-transparent" />
          </div>

          {/* ===== B. Profile Header (overlapping banner) ===== */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.gentle}
              className="flex flex-col sm:flex-row items-start sm:items-end gap-4"
            >
              {/* Avatar */}
              <div className="ring-4 ring-[var(--bg-base)] rounded-2xl overflow-hidden">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={creatorLabel}
                    className="w-[72px] h-[72px] object-cover rounded-2xl"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
                  />
                ) : null}
                <div className={profileImageUrl ? 'hidden' : ''}>
                  <AddressAvatar address={address} size={72} />
                </div>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-serif italic text-white" style={{ letterSpacing: '-0.02em' }}>
                    {creatorLabel}
                  </h1>
                  {creatorCategory && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/[0.04] border border-white/10 text-white/70">
                      {creatorCategory}
                    </span>
                  )}
                </div>
                {creatorBio && (
                  <p className="text-sm text-white/60 mt-0.5 line-clamp-1">{creatorBio}</p>
                )}
                <div className="flex items-center gap-4 mt-1 text-xs text-white/50">
                  <span className="flex items-center gap-1" title={stats?.dataUnavailable ? 'Stats could not be loaded' : 'Shown as a range to protect creator privacy'}>
                    <Users className="w-3 h-3" />
                    {stats?.dataUnavailable ? (
                      <span className="text-amber-400/70">Stats unavailable</span>
                    ) : (
                      <>{stats?.subscriberThreshold ?? 'New'} subscribers</>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    From {formatCredits(basePrice)} ALEO ({formatUsd(basePrice)}) / ~30 days
                  </span>
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-1 hover:text-white/70 transition-colors"
                    aria-label="Copy creator address"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {shortenAddress(address, 4)}
                  </button>
                </div>
              </div>

              {/* Primary action + overflow menu */}
              <div className="flex items-center gap-2 shrink-0 sm:pb-1">
                {renderPrimaryButton()}
                <OverflowMenu
                  connected={connected}
                  hasPass={userPasses.length > 0}
                  onTip={() => setShowTip(true)}
                  onGift={() => {
                    const defaultTier = displayTiers[0]
                    if (defaultTier) {
                      setGiftTier({
                        id: defaultTier.id,
                        name: defaultTier.name,
                        price: basePrice * defaultTier.priceMultiplier,
                      })
                      setShowGift(true)
                    }
                  }}
                  onMessage={() => {
                    router.push(`/messages?creator=${encodeURIComponent(address)}`)
                  }}
                  onShare={handleShare}
                  onReportCreator={() => {
                    toast.info('Report submitted. We\'ll review this creator. To dispute specific content, use the report button on individual posts.')
                  }}
                  onRedeem={() => setShowRedeemGift(true)}
                />
              </div>
            </m.div>

            {/* Active passes (collapsible, below header) */}
            {userPasses.length > 0 && (
              <div className="mt-4">
                <ActivePasses
                  passes={userPasses}
                  displayTiers={displayTiers}
                  blockHeight={blockHeight}
                  onRenew={setRenewPass}
                  onTransfer={setTransferPass}
                  onAuditToken={setAuditTokenPass}
                />
              </div>
            )}

            {/* ===== C. Tab Navigation ===== */}
            <div className="mt-6 border-b border-border">
              <AnimatedTabs
                tabs={tabs}
                activeTab={activeTab}
                onChange={handleTabChange}
              />
            </div>

            {/* ===== D/E/F. Tab Content ===== */}
            <div className="mt-6 pb-16">
              <AnimatePresence mode="wait">
                {activeTab === 'posts' && (
                  <m.div
                    key="posts"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {contentViewMode === 'feed' ? (
                      <ContentFeed
                        creatorAddress={address}
                        userPasses={userPasses}
                        connected={connected}
                        walletAddress={publicKey}
                        blockHeight={blockHeight}
                        refreshKey={contentRefreshKey}
                        viewMode={contentViewMode}
                        onViewModeChange={setContentViewMode}
                      />
                    ) : (
                      <ContentVault
                        creatorAddress={address}
                        userPasses={userPasses}
                        connected={connected}
                        walletAddress={publicKey}
                        blockHeight={blockHeight}
                        viewMode={contentViewMode}
                        onViewModeChange={setContentViewMode}
                      />
                    )}
                  </m.div>
                )}

                {activeTab === 'tiers' && (
                  <m.div
                    key="tiers"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <DurationToggle period={durationPeriod} onChange={setDurationPeriod} />
                      {tiersLoading ? (
                        <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-white/[0.05] border border-border text-xs text-white/60 font-medium animate-pulse">
                          Loading on-chain tiers...
                        </span>
                      ) : hasOnChainTiers ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-medium">
                          <Shield className="w-3 h-3" />
                          {onChainTierCount} custom tier{onChainTierCount !== 1 ? 's' : ''} on-chain
                        </span>
                      ) : null}
                    </div>
                    {durationPeriod === 3 && (
                      <m.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 p-3 rounded-xl bg-green-500/[0.04] border border-green-500/15"
                      >
                        <p className="text-xs text-green-300/90">
                          Extended subscription — one transaction for 3 months of access. No renewal hassle.
                        </p>
                      </m.div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayTiers.map((tier, i) => (
                        <TierCard
                          key={tier.id}
                          tier={tier}
                          basePrice={basePrice}
                          hasThisTier={userPasses.some((p) => p.tier === tier.id)}
                          isMostPopular={tier.id === 3}
                          connected={connected}
                          onSubscribe={(t) => {
                            // Store duration period for the modal to read
                            setSelectedTier(t)
                          }}
                          index={i}
                          period={durationPeriod}
                        />
                      ))}
                    </div>
                  </m.div>
                )}

                {activeTab === 'tip-menu' && (
                  <m.div
                    key="tip-menu"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TipMenu
                      creatorAddress={address}
                      creatorName={creatorLabel}
                      isSubscribed={userPasses.length > 0}
                      connected={connected}
                      onTipRequest={() => setShowTip(true)}
                    />
                  </m.div>
                )}

                {activeTab === 'about' && (
                  <m.div
                    key="about"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AboutTab
                      address={address}
                      bio={creatorBio}
                      displayName={creatorLabel}
                      stats={stats}
                      copied={copied}
                      onCopyAddress={() => {
                        navigator.clipboard.writeText(window.location.href)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                        toast.success('Link copied to clipboard')
                      }}
                      creatorHash={getCreatorHash(address) ?? ''}
                      tierName={displayTiers[0]?.name ?? 'Tier 1'}
                      tierPrice={`${formatCredits(basePrice)} ALEO`}
                      userPasses={userPasses}
                    />
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      {/* Modals — unchanged functionality */}
      {selectedTier && (
        <SubscribeModal
          isOpen={!!selectedTier}
          onClose={() => setSelectedTier(null)}
          tier={selectedTier}
          creatorAddress={address}
          basePrice={basePrice}
          onSuccess={() => { loadPasses(); refreshStats(); setContentRefreshKey(k => k + 1) }}
          availableTiers={displayTiers}
          initialPeriods={durationPeriod}
        />
      )}
      <TipModal
        isOpen={showTip}
        onClose={() => setShowTip(false)}
        creatorAddress={address}
        onSuccess={refreshStats}
      />
      {renewPass && (
        <RenewModal
          isOpen={!!renewPass}
          onClose={() => { setRenewPass(null); setUpgradeTierId(undefined) }}
          pass={renewPass}
          basePrice={basePrice}
          initialTierId={upgradeTierId}
          onSuccess={() => { loadPasses(); refreshStats(); setContentRefreshKey(k => k + 1) }}
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
          onSuccess={refreshStats}
        />
      )}
      {transferPass && (
        <TransferPassModal
          isOpen={!!transferPass}
          onClose={() => setTransferPass(null)}
          accessPassPlaintext={transferPass.rawPlaintext}
          creatorAddress={address}
          onSuccess={loadPasses}
        />
      )}
      {disputeContentId && userPasses.length > 0 && (
        <DisputeContentModal
          isOpen={!!disputeContentId}
          onClose={() => setDisputeContentId(null)}
          contentId={disputeContentId}
          contentTitle={displayName ? `${displayName}'s content` : 'Creator content'}
          accessPassPlaintext={userPasses[0].rawPlaintext}
        />
      )}
      {auditTokenPass && (
        <CreateAuditTokenModal
          isOpen={!!auditTokenPass}
          onClose={() => setAuditTokenPass(null)}
          pass={auditTokenPass}
        />
      )}
      <RedeemGiftModal
        isOpen={showRedeemGift}
        onClose={() => setShowRedeemGift(false)}
        creatorAddress={address}
        onSuccess={() => { loadPasses(); refreshStats(); setContentRefreshKey(k => k + 1) }}
      />
      {/* Mobile sticky subscribe bar — always visible on scroll */}
      {!isSubscribed && connected && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-[var(--bg-base)]/95 backdrop-blur-lg border-t border-[var(--border-subtle)] sm:hidden">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{displayName || 'Creator'}</p>
              <p className="text-xs text-[var(--text-muted)]">From {basePrice ? `${((basePrice * durationPeriod) / 1_000_000).toFixed(1)} ALEO / ~${durationPeriod * 30} days` : '...'}</p>
            </div>
            <button
              onClick={() => setSelectedTier(displayTiers[0] ?? null)}
              className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:bg-[var(--accent-hover)] transition-all active:scale-[0.98] whitespace-nowrap"
            >
              Subscribe
            </button>
          </div>
        </div>
      )}
    </PageTransition>
  )
}
