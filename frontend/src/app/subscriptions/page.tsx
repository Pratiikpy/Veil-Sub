'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { m } from 'framer-motion'
import {
  CreditCard,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Shield,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import RenewModal from '@/components/RenewModal'
import { useWalletRecords } from '@/hooks/useWalletRecords'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { parseAccessPass, shortenAddress, formatCredits } from '@/lib/utils'
import { SECONDS_PER_BLOCK, FEATURED_CREATORS, CREATOR_CUSTOM_TIERS } from '@/lib/config'
import type { AccessPass } from '@/types'

const HERO_GLOW_STYLE = {
  background:
    'radial-gradient(ellipse at center, rgba(139,92,246,0.05) 0%, transparent 70%)',
} as const

const LETTER_SPACING_STYLE = { letterSpacing: '-0.03em' } as const

interface ParsedSubscription {
  owner: string
  creator: string
  tier: number
  passId: string
  expiresAt: number
  rawPlaintext: string
  status: 'active' | 'expiring' | 'expired'
  blocksRemaining: number
  creatorLabel: string
  tierName: string
}

function getCreatorLabel(address: string): string {
  const featured = FEATURED_CREATORS.find((c) => c.address === address)
  if (featured) return featured.label
  return shortenAddress(address)
}

function getTierName(creator: string, tierId: number): string {
  const tiers = CREATOR_CUSTOM_TIERS[creator]
  if (tiers && tiers[tierId]) return tiers[tierId].name
  if (tierId === 1) return 'Supporter'
  if (tierId === 2) return 'Premium'
  if (tierId === 3) return 'VIP'
  return `Tier ${tierId}`
}

function formatCountdown(blocks: number): string {
  const totalSeconds = blocks * SECONDS_PER_BLOCK
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h`
  const mins = Math.floor(totalSeconds / 60)
  return mins > 0 ? `${mins}m` : 'Less than a minute'
}

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  active: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    label: 'Active',
  },
  expiring: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    label: 'Expiring Soon',
  },
  expired: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    label: 'Expired',
  },
}

// Threshold: 3 days worth of blocks to consider "expiring soon"
const EXPIRING_SOON_BLOCKS = Math.floor((3 * 86400) / SECONDS_PER_BLOCK)

function SubscriptionCard({ sub, onRenew }: { sub: ParsedSubscription; onRenew?: (sub: ParsedSubscription) => void }) {
  const badge = STATUS_BADGE[sub.status]

  return (
    <GlassCard hover>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Shield className="w-5 h-5 text-violet-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{sub.creatorLabel}</p>
            <p className="text-xs text-white/50 font-mono mt-0.5">
              {shortenAddress(sub.creator, 4)}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] px-2.5 py-1 rounded-full font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Tier</span>
          <span className="text-sm font-medium text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
            {sub.tierName}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Expires at block</span>
          <span className="text-sm font-mono text-white/80">
            #{sub.expiresAt.toLocaleString()}
          </span>
        </div>
        {sub.status !== 'expired' && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Time remaining</span>
            <span
              className={`text-sm font-medium ${
                sub.status === 'expiring' ? 'text-amber-400' : 'text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
              {formatCountdown(sub.blocksRemaining)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {sub.status === 'expired' ? (
          <Link
            href={`/creator/${sub.creator}`}
            className="flex-1 text-center px-4 py-2.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/30 transition-all"
          >
            Resubscribe
          </Link>
        ) : sub.status === 'expiring' && onRenew ? (
          <button
            onClick={() => onRenew(sub)}
            className="flex-1 text-center px-4 py-2.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/30 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />
            Renew Now
          </button>
        ) : (
          <Link
            href={`/creator/${sub.creator}`}
            className="flex-1 text-center px-4 py-2.5 rounded-lg bg-white/[0.06] border border-border text-white/80 text-sm font-medium hover:bg-white/10 transition-all"
          >
            View Creator
          </Link>
        )}
        <Link
          href={`/explorer?address=${sub.creator}`}
          title="View on explorer"
          className="p-2.5 rounded-lg bg-white/[0.04] border border-border text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all"
        >
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </GlassCard>
  )
}

function SubscriptionHistory({
  subscriptions,
}: {
  subscriptions: ParsedSubscription[]
}) {
  if (subscriptions.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-xs text-white/50 font-medium">
              Creator
            </th>
            <th className="text-left py-3 px-4 text-xs text-white/50 font-medium">
              Tier
            </th>
            <th className="text-left py-3 px-4 text-xs text-white/50 font-medium">
              Status
            </th>
            <th className="text-right py-3 px-4 text-xs text-white/50 font-medium">
              Expires
            </th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((sub) => {
            const badge = STATUS_BADGE[sub.status]
            return (
              <tr
                key={sub.passId}
                className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3 px-4 text-white/80 font-mono text-xs">
                  {sub.creatorLabel}
                </td>
                <td className="py-3 px-4 text-white/70">{sub.tierName}</td>
                <td className="py-3 px-4">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} ${badge.border} border`}
                  >
                    {badge.label}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-white/60 font-mono text-xs">
                  #{sub.expiresAt.toLocaleString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function SubscriptionsPage() {
  const { connected } = useWallet()
  const { getAccessPasses } = useWalletRecords()
  const { blockHeight, loading: blockLoading } = useBlockHeight()
  const [passes, setPasses] = useState<ParsedSubscription[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showExpired, setShowExpired] = useState(false)
  const [renewTarget, setRenewTarget] = useState<ParsedSubscription | null>(null)

  // Build an AccessPass from a ParsedSubscription for the RenewModal
  const renewAccessPass: AccessPass | null = renewTarget
    ? { owner: renewTarget.owner, creator: renewTarget.creator, tier: renewTarget.tier, passId: renewTarget.passId, expiresAt: renewTarget.expiresAt, rawPlaintext: renewTarget.rawPlaintext }
    : null

  const fetchPasses = useCallback(async () => {
    if (!connected || !blockHeight) return
    setLoading(true)
    setError(null)
    try {
      const rawPasses = await getAccessPasses()
      const parsed: ParsedSubscription[] = []

      for (const raw of rawPasses) {
        const pass = parseAccessPass(raw)
        if (!pass) continue

        const blocksRemaining = Math.max(0, pass.expiresAt - blockHeight)
        let status: 'active' | 'expiring' | 'expired' = 'active'
        if (blocksRemaining === 0) {
          status = 'expired'
        } else if (blocksRemaining < EXPIRING_SOON_BLOCKS) {
          status = 'expiring'
        }

        parsed.push({
          ...pass,
          status,
          blocksRemaining,
          creatorLabel: getCreatorLabel(pass.creator),
          tierName: getTierName(pass.creator, pass.tier),
        })
      }

      // Sort: expiring first, then active, then expired
      const statusOrder = { expiring: 0, active: 1, expired: 2 }
      parsed.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

      setPasses(parsed)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load subscriptions'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [connected, blockHeight, getAccessPasses])

  useEffect(() => {
    if (connected && blockHeight) {
      fetchPasses()
    }
  }, [connected, blockHeight]) // eslint-disable-line react-hooks/exhaustive-deps

  const activePasses = useMemo(
    () => passes.filter((p) => p.status !== 'expired'),
    [passes]
  )
  const expiredPasses = useMemo(
    () => passes.filter((p) => p.status === 'expired'),
    [passes]
  )
  const expiringCount = useMemo(
    () => passes.filter((p) => p.status === 'expiring').length,
    [passes]
  )

  return (
    <PageTransition>
      <main className="min-h-screen bg-background py-12 sm:py-16 relative">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
          style={HERO_GLOW_STYLE}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1
                  className="text-3xl sm:text-4xl font-serif italic text-white mb-3"
                  style={LETTER_SPACING_STYLE}
                >
                  My Subscriptions
                </h1>
                <p className="text-white/70 text-base max-w-2xl leading-relaxed">
                  Manage your active subscriptions. Renew before they expire to keep
                  access to creator content.
                </p>
              </div>
              {connected && (
                <button
                  onClick={fetchPasses}
                  disabled={loading || blockLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.06] border border-border text-white/70 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  Refresh
                </button>
              )}
            </div>
          </div>

          {/* Not connected state */}
          {!connected && (
            <GlassCard>
              <div className="text-center py-12">
                <CreditCard
                  className="w-12 h-12 text-white/20 mx-auto mb-4"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-medium text-white mb-2">
                  Connect Your Wallet
                </h2>
                <p className="text-sm text-white/60 max-w-md mx-auto">
                  Connect your Aleo wallet to view and manage your subscriptions.
                  Your subscription passes are stored privately in your wallet.
                </p>
              </div>
            </GlassCard>
          )}

          {/* Loading state */}
          {connected && (loading || blockLoading) && passes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mb-4" />
              <p className="text-sm text-white/60">
                Loading your subscriptions from wallet...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle
                className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-red-300">
                  Failed to load subscriptions
                </p>
                <p className="text-xs text-red-400/70 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Summary badges */}
          {connected && !loading && !blockLoading && passes.length > 0 && (
            <div className="flex items-center gap-3 mb-8 flex-wrap">
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/[0.06] border border-border text-white/70">
                {activePasses.length} active
              </span>
              {expiringCount > 0 && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  {expiringCount} expiring soon
                </span>
              )}
              {expiredPasses.length > 0 && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                  {expiredPasses.length} expired
                </span>
              )}
              {blockHeight && (
                <span className="text-xs text-white/40 ml-auto">
                  Block #{blockHeight.toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* Active Subscriptions Grid */}
          {connected && !loading && activePasses.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-medium text-white mb-6">
                Active Subscriptions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePasses.map((sub) => (
                  <m.div
                    key={sub.passId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <SubscriptionCard sub={sub} onRenew={setRenewTarget} />
                  </m.div>
                ))}
              </div>
            </section>
          )}

          {/* Expired Subscriptions (collapsible) */}
          {connected && !loading && expiredPasses.length > 0 && (
            <section className="mb-10">
              <button
                onClick={() => setShowExpired(!showExpired)}
                className="flex items-center gap-2 text-lg font-medium text-white mb-6 hover:text-white/80 transition-colors"
              >
                Expired Subscriptions ({expiredPasses.length})
                {showExpired ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
              {showExpired && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {expiredPasses.map((sub) => (
                    <SubscriptionCard key={sub.passId} sub={sub} />
                  ))}
                </m.div>
              )}
            </section>
          )}

          {/* Empty state */}
          {connected &&
            !loading &&
            !blockLoading &&
            passes.length === 0 &&
            !error && (
              <GlassCard>
                <div className="text-center py-12">
                  <CreditCard
                    className="w-12 h-12 text-white/20 mx-auto mb-4"
                    aria-hidden="true"
                  />
                  <h2 className="text-lg font-medium text-white mb-2">
                    No Subscriptions Yet
                  </h2>
                  <p className="text-sm text-white/60 max-w-md mx-auto mb-6">
                    You haven&apos;t subscribed to any creators yet. Browse the
                    explore page to discover creators and subscribe privately.
                  </p>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
                  >
                    Explore Creators
                  </Link>
                </div>
              </GlassCard>
            )}

          {/* Subscription History Table */}
          {connected && !loading && passes.length > 0 && (
            <section>
              <h2 className="text-lg font-medium text-white mb-6">
                Subscription History
              </h2>
              <GlassCard hover={false}>
                <SubscriptionHistory subscriptions={passes} />
              </GlassCard>
            </section>
          )}
        </div>

        {/* Inline Renew Modal */}
        {renewAccessPass && (
          <RenewModal
            isOpen={!!renewTarget}
            onClose={() => setRenewTarget(null)}
            pass={renewAccessPass}
            basePrice={100}
          />
        )}
      </main>
    </PageTransition>
  )
}
