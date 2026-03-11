'use client'

import { useEffect, useState, useRef, use } from 'react'
import { m } from 'framer-motion'
import Link from 'next/link'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useCreatorStats } from '@/hooks/useCreatorStats'
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
import AddressAvatar from '@/components/ui/AddressAvatar'

function GiftDropdown({
  connected,
  tiers,
  basePrice,
  onSelect,
}: {
  connected: boolean
  tiers: typeof TIERS
  basePrice: number
  onSelect: (tier: { id: number; name: string; price: number }) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
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
        disabled={!connected}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        title={!connected ? 'Connect your wallet to gift a subscription' : 'Gift a subscription to another wallet'}
        className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border text-white/70 font-medium text-sm hover:bg-white/[0.08] transition-all duration-300 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Sparkles className="w-4 h-4" aria-hidden="true" />
        Gift
      </button>
      {connected && open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 min-w-[180px] py-1 rounded-xl bg-surface-1 border border-border shadow-xl animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {tiers.map((tier) => (
            <button
              key={tier.id}
              role="menuitem"
              onClick={() => {
                onSelect({ id: tier.id, name: tier.name, price: basePrice * tier.priceMultiplier })
                setOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center justify-between"
            >
              <span>{tier.name}</span>
              <span className="text-xs text-white/60">{formatCredits(basePrice * tier.priceMultiplier)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CreatorPage({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = use(params)
  // Referral system removed in v23 (subscribe_referral transition removed for variable limit)
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
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null)
  const [showTip, setShowTip] = useState(false)
  const [userPasses, setUserPasses] = useState<AccessPass[]>([])
  const [renewPass, setRenewPass] = useState<AccessPass | null>(null)
  const [showGift, setShowGift] = useState(false)
  const [giftTier, setGiftTier] = useState<{ id: number; name: string; price: number } | null>(null)
  const [transferPass, setTransferPass] = useState<AccessPass | null>(null)
  const [disputeContentId, setDisputeContentId] = useState<string | null>(null)
  const [auditTokenPass, setAuditTokenPass] = useState<AccessPass | null>(null)
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
    }).catch(() => {
      // Profile metadata unavailable, defaults are fine but notify user
      toast.warning('Profile details unavailable. Using on-chain data only.', { id: 'profile-fetch-warn' })
    })
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
      const passes = (records ?? [])
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
          <div className="p-8 rounded-xl border border-red-500/15 bg-red-500/5 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Creator</h2>
            <p className="text-sm text-white/70 mb-4">Could not fetch creator data. Please check your connection and try again.</p>
            <button
              onClick={() => window.location.reload()}
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

  // Build display tiers: merge on-chain/cached custom prices with fallback hardcoded TIERS.
  // onChainTiers comes from useCreatorTiers which queries the chain + falls back to config cache.
  const displayTiers = TIERS.map((tier) => {
    const custom = onChainTiers[tier.id]
    if (custom && custom.price > 0) {
      return {
        ...tier,
        name: custom.name || tier.name,
        // Override priceMultiplier so totalPrice = custom.price (not basePrice * multiplier)
        // Guard against division by zero: if basePrice is 0, use the custom price as multiplier 1
        priceMultiplier: basePrice > 0 ? custom.price / basePrice : 1,
      }
    }
    return tier
  })

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
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-white/60 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/explore" className="hover:text-white/70 transition-colors">Explore</Link>
          <span>/</span>
          <span className="text-white/70 font-mono">{displayName || shortenAddress(address)}</span>
        </nav>

        {/* Creator Header */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <AddressAvatar address={address} size={56} />
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl sm:text-3xl font-serif italic text-white mb-1"
                style={{ letterSpacing: '-0.02em' }}
              >
                {displayName || shortenAddress(address)}
              </h1>
              {displayName && (
                <p className="text-base text-white/60 font-mono mb-1">
                  {shortenAddress(address)}
                </p>
              )}
              {bio && (
                <p className="text-sm text-white/70 mb-1">{bio}</p>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                <a
                  href={`https://testnet.explorer.provable.com/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors"
                >
                  View on Explorer
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
                <button
                  onClick={copyAddress}
                  className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white/70 transition-colors"
                  aria-label="Copy creator address"
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: displayName || 'VeilSub Creator', url: window.location.href })
                    } else {
                      navigator.clipboard.writeText(window.location.href)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }
                  }}
                  className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white/70 transition-colors"
                  aria-label="Share creator page"
                >
                  <Share2 className="w-3 h-3" aria-hidden="true" />
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          {isRegistered && (
            <div className="flex flex-wrap gap-8 mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-white">
                  {stats?.subscriberCount ?? 0} subscribers
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white">
                  {formatCredits(stats?.totalRevenue ?? 0)} ALEO earned
                </span>
              </div>
            </div>
          )}

        </m.div>

        {!isRegistered ? (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="mx-auto mb-6 w-16 h-16">
              <AddressAvatar address={address} size={64} />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">
              Creator Not Found
            </h2>
            <p className="text-white/70 max-w-md mx-auto mb-2">
              This address hasn&apos;t registered as a creator on VeilSub yet.
            </p>
            <p className="text-base text-white/60 font-mono mb-8">
              {shortenAddress(address)}
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/#featured"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 transition-all duration-300 active:scale-[0.98]"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                Browse Featured Creators
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.05] border border-border text-white/70 text-sm hover:bg-white/[0.08] transition-all duration-300"
              >
                Register as a Creator
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </m.div>
        ) : (
          <div className="space-y-10">
            {/* User's Existing Passes */}
            {userPasses.length > 0 && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-xl bg-green-500/5 border border-green-500/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-300">
                    Your AccessPasses ({userPasses.length})
                  </span>
                  <span className="text-xs text-white/60 ml-auto">Only you can see this</span>
                </div>
                <div className="space-y-2">
                  {userPasses.map((pass, i) => {
                    const tierInfo = displayTiers.find((t) => t.id === pass.tier)
                    // Color mapping for tier badges, supports tier IDs 1-5+ with fallback
                    const tierColorMap: Record<number, string> = {
                      1: 'text-green-300 bg-green-500/10 border-green-500/20',
                      2: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
                      3: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
                      4: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
                      5: 'text-pink-300 bg-pink-500/10 border-pink-500/20',
                    }
                    const tierColor = tierColorMap[pass.tier] || 'text-white/70 bg-white/5 border-border'
                    const expiry = getPassExpiry(pass)

                    return (
                      <div
                        key={pass.passId || i}
                        className="flex flex-wrap items-center gap-2 sm:gap-4 p-2.5 rounded-lg bg-white/[0.02] border border-border"
                      >
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${tierColor}`}
                        >
                          {tierInfo?.name ?? `Tier ${pass.tier}`}
                        </span>
                        <span className="text-xs text-white/60 font-mono hidden sm:inline">
                          ID: {pass.passId ? (pass.passId.length > 16 ? `${pass.passId.slice(0, 8)}...${pass.passId.slice(-6)}` : pass.passId) : '\u2014'}
                        </span>

                        {/* Expiry display */}
                        {expiry !== null && (
                          <span className="ml-auto flex flex-wrap items-center gap-2">
                            {expiry.expired ? (
                              <>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-white/[0.05] text-white/60 border-border">
                                  Expired
                                </span>
                                <button
                                  onClick={() => setRenewPass(pass)}
                                  title="Extend your subscription with a new payment"
                                  className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/20 transition-all duration-300 flex items-center gap-1 active:scale-[0.98]"
                                >
                                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                                  Renew
                                </button>
                                <button
                                  onClick={() => setTransferPass(pass)}
                                  title="Transfer this pass to another wallet address"
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-border text-xs text-white/70 hover:bg-white/[0.08] transition-all duration-300 flex items-center gap-1 active:scale-[0.98]"
                                >
                                  <ArrowLeftRight className="w-3 h-3" aria-hidden="true" />
                                  Transfer
                                </button>
                                <button
                                  onClick={() => setAuditTokenPass(pass)}
                                  title="Create a scoped token for third-party verification (e.g., prove tier access without revealing subscriber identity)"
                                  className="px-2.5 py-1 rounded-lg bg-violet-500/[0.06] border border-violet-500/15 text-xs text-violet-300 hover:bg-violet-500/10 transition-all duration-300 flex items-center gap-1 active:scale-[0.98]"
                                  aria-label="Create audit token for this pass"
                                >
                                  <FileKey className="w-3 h-3" aria-hidden="true" />
                                  Audit Token
                                </button>
                              </>
                            ) : (() => {
                              const colors = getExpiryColor(expiry.daysLeft)
                              const progress = getProgressPercent(pass)
                              return (
                                <>
                                  <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                    <m.div
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
                                    title="Transfer this pass to another wallet address"
                                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-border text-xs text-white/70 hover:bg-white/[0.08] transition-all duration-300 flex items-center gap-1 active:scale-[0.98]"
                                  >
                                    <ArrowLeftRight className="w-3 h-3" aria-hidden="true" />
                                    Transfer
                                  </button>
                                  <button
                                    onClick={() => setAuditTokenPass(pass)}
                                    title="Create a scoped token for third-party verification (e.g., prove tier access without revealing subscriber identity)"
                                    className="px-2.5 py-1 rounded-lg bg-violet-500/[0.06] border border-violet-500/15 text-xs text-violet-300 hover:bg-violet-500/10 transition-all duration-300 flex items-center gap-1 active:scale-[0.98]"
                                    aria-label="Create audit token for this pass"
                                  >
                                    <FileKey className="w-3 h-3" aria-hidden="true" />
                                    Audit Token
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
              </m.div>
            )}

            {/* Subscription Tiers */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Subscription Tiers
                </h2>
                {tiersLoading ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.05] border border-border text-[10px] text-white/60 font-medium animate-pulse">
                    Loading tiers...
                  </span>
                ) : hasOnChainTiers ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-medium">
                    <Shield className="w-3 h-3" aria-hidden="true" />
                    {onChainTierCount} custom tier{onChainTierCount !== 1 ? 's' : ''} on-chain
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {displayTiers.map((tier, i) => {
                  const tierPrice = basePrice * tier.priceMultiplier
                  const hasThisTier = userPasses.some(
                    (p) => p.tier === tier.id
                  )

                  return (
                    <m.div
                      key={tier.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`relative p-8 rounded-xl border hover:-translate-y-0.5 transition-all duration-300 ${
                        tier.id === 3
                          ? 'bg-surface-1 border-violet-500/[0.15] hover:border-violet-500/[0.25] hover:shadow-accent-md'
                          : 'bg-surface-1 border-border hover:border-glass-hover'
                      }`}
                    >
                      {tier.id === 3 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-violet-500/[0.08] border border-violet-500/[0.15]">
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
                        <span className="text-sm font-normal text-white/70">
                          ALEO
                        </span>
                      </p>
                      <p className="text-xs text-white/60 mb-4">
                        {tier.description}
                      </p>

                      <ul className="space-y-2 mb-6">
                        {(tier.features ?? []).map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-2 text-xs text-white/70"
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
                          title={!connected ? 'Connect your wallet to subscribe' : undefined}
                          className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all duration-300 active:scale-[0.98] btn-shimmer ${
                            tier.id === 3
                              ? 'bg-white text-black hover:bg-white/90'
                              : 'bg-white/[0.05] border border-border text-white hover:bg-white/[0.08]'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {connected ? 'Subscribe' : 'Connect wallet'}
                        </button>
                      )}
                    </m.div>
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
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-8 rounded-xl bg-surface-1 border border-border"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">
                    Send a Private Tip
                  </h2>
                  <p className="text-sm text-white/70">
                    Show appreciation with a private ALEO transfer. The creator
                    receives 95% via private transfer—5% platform fee.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <GiftDropdown
                    connected={connected}
                    tiers={displayTiers}
                    basePrice={basePrice}
                    onSelect={(tier) => {
                      setGiftTier(tier)
                      setShowGift(true)
                    }}
                  />
                  <button
                    onClick={() => setShowTip(true)}
                    disabled={!connected}
                    title={!connected ? 'Connect your wallet to send a tip' : 'Send a private tip to this creator'}
                    className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border text-white/70 font-medium text-sm hover:bg-white/[0.08] transition-all duration-300 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Heart className="w-4 h-4" aria-hidden="true" />
                    Tip
                  </button>
                  {userPasses.length > 0 && (
                    <button
                      onClick={() => setDisputeContentId('general')}
                      title="Report content or quality issues with this creator"
                      className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border text-white/70 font-medium text-sm hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-300 flex items-center gap-2"
                    >
                      <Flag className="w-4 h-4" aria-hidden="true" />
                      Dispute
                    </button>
                  )}
                </div>
              </div>
            </m.div>

            {/* Share QR Code */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CreatorQRCode creatorAddress={address} />
            </m.div>

            {/* Privacy Notice */}
            <div className="p-4 rounded-xl bg-surface-1 border border-border">
              <div className="flex items-start gap-4">
                <Shield className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
                <div className="text-xs text-white/70 space-y-1">
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
                    expiry is checked locally—no on-chain trace when you access content.
                  </p>
                  <p className="flex items-center gap-2 pt-1">
                    <Link href="/privacy" className="text-violet-400/70 hover:text-violet-300 transition-colors inline-flex items-center gap-1">
                      Learn more about our privacy model
                      <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
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
    </PageTransition>
  )
}
