'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Users,
  Coins,
  Tag,
  ExternalLink,
  AlertCircle,
  ArrowRight,
  Shield,
  TrendingUp,
  Activity,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { formatCredits, isValidAleoAddress, shortenAddress } from '@/lib/utils'
import { useCyclingPlaceholder } from '@/hooks/useCyclingPlaceholder'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import OnChainVerify from '@/components/OnChainVerify'
import AnimatedCounter from '@/components/AnimatedCounter'
import ActivityChart from '@/components/ActivityChart'
import type { CreatorProfile } from '@/types'

interface GlobalStats {
  totalCreators: number
  totalSubscriptions: number
  totalRevenue: number
  activePrograms: number
}

interface RecentEvent {
  tier: number
  amount_microcredits: number
  tx_id: string | null
  created_at: string
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const barCount = Math.min(data.length, 14)
  const bars = data.slice(-barCount)

  return (
    <div className="flex items-end gap-px h-6" title="Subscription activity (last 14 days)">
      {bars.map((v, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-violet-400/60 transition-all"
          style={{ height: `${Math.max((v / max) * 100, 8)}%` }}
        />
      ))}
    </div>
  )
}

const TIER_LABELS: Record<number, { name: string; color: string; dot: string }> = {
  1: { name: 'Supporter', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', dot: 'bg-blue-400' },
  2: { name: 'Premium', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30', dot: 'bg-violet-400' },
  3: { name: 'VIP', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
}

const SEARCH_PLACEHOLDERS = [
  'Enter creator\'s Aleo address (aleo1...)',
  'Search by aleo1 address...',
  'Paste a creator address to look up stats...',
  'Lookup on-chain subscription data...',
]

const EVENTS_PER_PAGE = 10

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function ExplorerPage() {
  const { fetchCreatorStats, loading } = useCreatorStats()
  const [address, setAddress] = useState('')
  const [result, setResult] = useState<CreatorProfile | null>(null)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sparkData, setSparkData] = useState<number[]>([])
  const { placeholder, isAnimating } = useCyclingPlaceholder(SEARCH_PLACEHOLDERS)

  // Global stats
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)

  // Recent events
  const [events, setEvents] = useState<RecentEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsPage, setEventsPage] = useState(0)
  const [eventFilter, setEventFilter] = useState<'all' | 'subscriptions' | 'tips'>('all')
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null)

  // Fetch global stats
  useEffect(() => {
    fetch('/api/analytics?global_stats=true')
      .then((r) => r.json())
      .then(setGlobalStats)
      .catch(() => setGlobalStats({ totalCreators: 1, totalSubscriptions: 0, totalRevenue: 0, activePrograms: 2 }))
  }, [])

  // Fetch recent events
  useEffect(() => {
    setEventsLoading(true)
    fetch('/api/analytics?recent=true')
      .then((r) => r.json())
      .then((json) => {
        setEvents(json.events || [])
        setEventsLoading(false)
      })
      .catch(() => setEventsLoading(false))
  }, [])

  // Fetch sparkline data when a creator is found
  useEffect(() => {
    if (!result?.address) { setSparkData([]); return }
    const controller = new AbortController()
    fetch(`/api/analytics/summary?creator=${encodeURIComponent(result.address)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        const daily: { subscriptions: number }[] = json.daily || []
        setSparkData(daily.map((d) => d.subscriptions))
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setSparkData([])
      })
    return () => controller.abort()
  }, [result?.address])

  const handleSearch = async () => {
    if (loading) return
    const trimmed = address.trim()
    if (!trimmed) return

    if (!isValidAleoAddress(trimmed)) {
      setError('Invalid Aleo address format. Address should start with "aleo1" and be 63 characters.')
      setResult(null)
      setSearched(true)
      return
    }

    setError(null)
    setSearched(false)

    try {
      const stats = await fetchCreatorStats(trimmed)
      setResult(stats)
      setSearched(true)
    } catch {
      setError('Failed to fetch creator data. Please try again.')
      setSearched(true)
    }
  }

  const copyTxId = useCallback((txId: string) => {
    navigator.clipboard.writeText(txId)
    setCopiedTxId(txId)
    setTimeout(() => setCopiedTxId(null), 2000)
  }, [])

  const filteredEvents = events.filter((e) => {
    if (eventFilter === 'all') return true
    if (eventFilter === 'tips') return e.tier === 0 || e.amount_microcredits < 500_000
    return e.tier >= 1 && e.tier <= 3
  })

  const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE)
  const paginatedEvents = filteredEvents.slice(
    eventsPage * EVENTS_PER_PAGE,
    (eventsPage + 1) * EVENTS_PER_PAGE
  )

  const isRegistered = result?.tierPrice !== null && result?.tierPrice !== undefined

  return (
    <PageTransition>
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl font-bold text-white mb-2">On-Chain Explorer</h1>
            <p className="text-slate-400">
              Look up any creator&apos;s public stats directly from the Aleo blockchain.
              Only aggregate data is visible — subscriber identities are always private.
            </p>
          </motion.div>

          {/* Global Platform Stats */}
          {globalStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10"
            >
              <GlassCard delay={0}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-slate-400">Total Creators</span>
                </div>
                <p className="text-3xl font-bold font-display text-white">
                  <AnimatedCounter target={globalStats.totalCreators} />
                </p>
              </GlassCard>
              <GlassCard delay={0.05}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-slate-400">Total Subscriptions</span>
                </div>
                <p className="text-3xl font-bold font-display text-white">
                  <AnimatedCounter target={globalStats.totalSubscriptions} />
                </p>
              </GlassCard>
              <GlassCard delay={0.1}>
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-400">Platform Revenue</span>
                </div>
                <p className="text-3xl font-bold font-display text-white">
                  {formatCredits(globalStats.totalRevenue)} <span className="text-sm text-slate-400">ALEO</span>
                </p>
              </GlassCard>
              <GlassCard delay={0.15}>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-400">Active Programs</span>
                </div>
                <p className="text-3xl font-bold font-display text-white">
                  <AnimatedCounter target={globalStats.activePrograms} />
                </p>
              </GlassCard>
            </motion.div>
          )}

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={placeholder}
                  aria-label="Creator Aleo address"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm ${isAnimating ? 'placeholder-opacity-0' : 'placeholder-opacity-100'}`}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !address.trim()}
                className="px-6 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium text-sm hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Search
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </motion.div>
          )}

          {/* Search Results */}
          {searched && result && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 mb-12"
            >
              {/* Creator Header */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium font-mono">{shortenAddress(result.address)}</p>
                    <p className="text-xs text-slate-500">
                      {isRegistered ? 'Registered Creator' : 'Not Registered'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`https://testnet.explorer.provable.com/address/${result.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    Aleo Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                  {isRegistered && (
                    <a
                      href={`/creator/${result.address}`}
                      className="px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      Subscribe <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {isRegistered ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <GlassCard delay={0}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-violet-400" />
                          <span className="text-xs text-slate-400">Subscribers</span>
                        </div>
                        <OnChainVerify
                          creatorAddress={result.address}
                          mappingName="subscriber_count"
                          displayedValue={result.subscriberCount}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-3xl font-bold font-display text-white">
                          {result.subscriberCount}
                        </p>
                        {sparkData.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3 text-violet-400" />
                            <MiniSparkline data={sparkData} />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Aggregate count only — no individual IDs visible
                      </p>
                    </GlassCard>

                    <GlassCard delay={0.1}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-slate-400">Total Revenue</span>
                        </div>
                        <OnChainVerify
                          creatorAddress={result.address}
                          mappingName="total_revenue"
                          displayedValue={result.totalRevenue}
                        />
                      </div>
                      <p className="text-3xl font-bold font-display text-white">
                        {formatCredits(result.totalRevenue)} <span className="text-sm text-slate-400">ALEO</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Sum of all subscriptions and tips
                      </p>
                    </GlassCard>

                    <GlassCard delay={0.2}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-slate-400">Base Price</span>
                        </div>
                        <OnChainVerify
                          creatorAddress={result.address}
                          mappingName="tier_prices"
                          displayedValue={result.tierPrice ?? 0}
                        />
                      </div>
                      <p className="text-3xl font-bold font-display text-white">
                        {formatCredits(result.tierPrice ?? 0)} <span className="text-sm text-slate-400">ALEO</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Premium = 2x, VIP = 5x this price
                      </p>
                    </GlassCard>
                  </div>

                  {/* Activity Chart for searched creator */}
                  <ActivityChart creatorAddress={result.address} />

                  {/* Data Source */}
                  <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10 text-xs text-slate-400">
                    <p>
                      Data fetched from on-chain mappings via{' '}
                      <code className="px-1 py-0.5 rounded bg-white/10 text-violet-300">
                        api.explorer.provable.com
                      </code>
                      . All values are public aggregate data — no subscriber identities are
                      exposed.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Creator Not Registered
                  </h3>
                  <p className="text-sm text-slate-400">
                    This address has not called <code className="px-1 py-0.5 rounded bg-white/10 text-violet-300 text-xs">register_creator</code> on VeilSub.
                    No subscription data exists for this address.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Info (no search) */}
          {!searched && !globalStats && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-12"
            >
              <Search className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                Enter a creator&apos;s Aleo address to view their public on-chain stats.
              </p>
              <p className="text-slate-600 text-xs mt-2">
                Only aggregate data (subscriber count, total revenue, tier price) is publicly visible.
              </p>
            </motion.div>
          )}

          {/* Recent Events Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              </div>
              <div className="flex gap-1">
                {(['all', 'subscriptions', 'tips'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => { setEventFilter(filter); setEventsPage(0) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      eventFilter === filter
                        ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                        : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_auto_auto_1.5fr_auto] gap-4 px-4 py-3 border-b border-white/[0.06] text-xs text-slate-500 font-medium">
                <span>Time</span>
                <span>Tier</span>
                <span>Amount</span>
                <span>Transaction ID</span>
                <span>Verify</span>
              </div>

              {/* Loading State */}
              {eventsLoading ? (
                <div className="space-y-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto_1.5fr_auto] gap-4 px-4 py-3 border-b border-white/[0.04]">
                      <div className="h-4 bg-white/[0.04] rounded animate-pulse w-16" />
                      <div className="h-4 bg-white/[0.04] rounded animate-pulse w-16" />
                      <div className="h-4 bg-white/[0.04] rounded animate-pulse w-12" />
                      <div className="h-4 bg-white/[0.04] rounded animate-pulse w-32" />
                      <div className="h-4 bg-white/[0.04] rounded animate-pulse w-12" />
                    </div>
                  ))}
                </div>
              ) : paginatedEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-1">No events found</p>
                  <p className="text-xs text-slate-600">Subscription and tip activity will appear here once transactions are confirmed on-chain.</p>
                </div>
              ) : (
                <div>
                  {paginatedEvents.map((event, i) => {
                    const tier = TIER_LABELS[event.tier] || { name: 'Tip', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30', dot: 'bg-pink-400' }
                    const txShort = event.tx_id ? `${event.tx_id.slice(0, 12)}...${event.tx_id.slice(-6)}` : '—'

                    return (
                      <div
                        key={`${event.tx_id || i}-${i}`}
                        className="grid grid-cols-[1fr_auto_auto_1.5fr_auto] gap-4 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors items-center"
                      >
                        <span className="text-xs text-slate-400">{timeAgo(event.created_at)}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${tier.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
                          {tier.name}
                        </span>
                        <span className="text-xs text-white font-medium">
                          {formatCredits(event.amount_microcredits)}
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <code className="text-xs text-slate-400 font-mono truncate">{txShort}</code>
                          {event.tx_id && (
                            <>
                              <button
                                onClick={() => copyTxId(event.tx_id!)}
                                className="shrink-0 p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                                aria-label="Copy transaction ID"
                              >
                                {copiedTxId === event.tx_id ? (
                                  <Check className="w-3 h-3 text-green-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <a
                                href={event.tx_id?.startsWith('at1') ? `https://testnet.explorer.provable.com/transaction/${event.tx_id}` : `https://testnet.explorer.provable.com/program/veilsub_v7.aleo`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                                aria-label="View on explorer"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          )}
                        </div>
                        <a
                          href={event.tx_id ? (event.tx_id.startsWith('at1') ? `https://testnet.explorer.provable.com/transaction/${event.tx_id}` : `https://testnet.explorer.provable.com/program/veilsub_v7.aleo`) : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                            event.tx_id
                              ? 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
                              : 'bg-white/5 border border-white/10 text-slate-500 cursor-default'
                          }`}
                        >
                          Verify
                        </a>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                  <button
                    onClick={() => setEventsPage(Math.max(0, eventsPage - 1))}
                    disabled={eventsPage === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-3 h-3" /> Prev
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setEventsPage(i)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                          eventsPage === i
                            ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                            : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setEventsPage(Math.min(totalPages - 1, eventsPage + 1))}
                    disabled={eventsPage >= totalPages - 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}
