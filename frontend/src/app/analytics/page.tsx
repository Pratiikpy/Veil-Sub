'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { m } from 'framer-motion'
import {
  Users,
  CreditCard,
  Coins,
  ShieldCheck,
  EyeOff,
  Lock,
  GitBranch,
  Activity,
  Layers,
  Database,
  Code,
  ArrowRight,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import { formatCredits } from '@/lib/utils'
import { useAnalytics, type DateRange } from '@/hooks/useAnalytics'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

const HERO_GLOW_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.05) 0%, transparent 70%)',
} as const

const LETTER_SPACING_STYLE = { letterSpacing: '-0.03em' } as const

interface GlobalStats {
  totalCreators: number
  totalSubscriptions: number
  totalRevenue: number
  activePrograms: number
}

// Zero-value fallback when API is unavailable — no fake numbers
const EMPTY_STATS: GlobalStats = {
  totalCreators: 0,
  totalSubscriptions: 0,
  totalRevenue: 0,
  activePrograms: 0,
}

const CONTRACT_VERSIONS = [
  { version: 'v4-v8', description: 'Core subscriptions, subscription passes, payment receipts, verification tokens, content publishing' },
  { version: 'v9-v10', description: 'Dynamic tiers, content management, gifting, escrow, fee withdrawal' },
  { version: 'v11-v12', description: 'Blind renewal (novel privacy), encrypted content, disputes, revocation' },
  { version: 'v13-v14', description: 'Safety fixes, sealed commit-reveal tipping' },
  { version: 'v15-v16', description: 'Security hardening, subscription transfer, on-chain referral system' },
  { version: 'v17-v21', description: 'Private counters, traceless verification, hash optimization, analytics, error codes' },
  { version: 'v23', description: 'Privacy overhaul: ZERO wallet addresses stored publicly, all data indexed by hashes.' },
  { version: 'v24', description: 'Content auth fix, on-chain expiry enforcement. 25 actions, 22 on-chain records', deployed: true },
  { version: 'v25', description: 'Subscriber threshold proofs, platform-wide counters. 26 actions, 24 on-chain records', deployed: true },
  { version: 'v26', description: 'Trial passes for short-term access. 27 actions, 24 on-chain records', deployed: true },
  { version: 'v27', description: 'Scoped verification tokens, trial rate-limiting, gift fix. 27 actions, 25 on-chain records', deployed: true },
]

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
]

// ── Chart theme constants ─────────────────────────────────────────

const CHART_GRID_STROKE = 'rgba(255,255,255,0.05)'
const CHART_AXIS_TICK = { fill: 'rgba(255,255,255,0.4)', fontSize: 12 }
const CHART_VIOLET = '#8B5CF6'
const CHART_VIOLET_LIGHT = 'rgba(139,92,246,0.15)'

// ── Custom Recharts Tooltip ───────────────────────────────────────

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#12121A] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium text-white">
          {entry.name}: <span className="text-violet-300">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Sparkline (kept for metric cards) ─────────────────────────────

function Sparkline({ data, color = 'stroke-violet-400' }: { data: number[]; color?: string }) {
  if (!data.length || data.every((d) => d === 0)) return null
  const max = Math.max(...data, 1)
  const w = 64
  const h = 20
  const points = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * w},${h - (v / max) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="mt-1" aria-hidden="true">
      <polyline points={points} fill="none" className={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="flex items-end gap-1 h-full px-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-white/[0.04] rounded-t"
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Subscriber Growth Chart ───────────────────────────────────────

function SubscriberGrowthChart({ data, loading }: { data: { date: string; subscribers: number }[]; loading: boolean }) {
  if (loading) return <ChartSkeleton height={280} />

  if (!data.length || data.every((d) => d.subscribers === 0)) {
    return (
      <div className="flex items-center justify-center h-[280px]">
        <div className="text-center">
          <TrendingUp className="w-8 h-8 text-white/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-white/40">No subscriber data yet</p>
          <p className="text-xs text-white/30 mt-1">Tracking starts from your first subscription</p>
        </div>
      </div>
    )
  }

  // Format dates for display
  const chartData = data.map((d) => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="subscriberGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_VIOLET} stopOpacity={0.3} />
            <stop offset="100%" stopColor={CHART_VIOLET} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
        <XAxis
          dataKey="displayDate"
          tick={CHART_AXIS_TICK}
          axisLine={{ stroke: CHART_GRID_STROKE }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={CHART_AXIS_TICK}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <RechartsTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="subscribers"
          name="Subscribers"
          stroke={CHART_VIOLET}
          strokeWidth={2}
          fill="url(#subscriberGradient)"
          dot={false}
          activeDot={{ r: 5, fill: CHART_VIOLET, stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Revenue by Tier Donut Chart ───────────────────────────────────

function RevenuePieChart({
  data,
  loading,
}: {
  data: { name: string; revenue: number; subscribers: number; color: string }[]
  loading: boolean
}) {
  if (loading) return <ChartSkeleton height={260} />

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)

  if (!data.length || totalRevenue === 0) {
    return (
      <div className="flex items-center justify-center h-[260px]">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-white/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-white/40">No revenue data yet</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={95}
          dataKey="revenue"
          nameKey="name"
          paddingAngle={3}
          stroke="none"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <RechartsTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const item = payload[0].payload as (typeof data)[0]
            return (
              <div className="bg-[#12121A] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
                <p className="text-sm font-medium text-white mb-1">{item.name}</p>
                <p className="text-xs text-white/60">
                  Revenue: <span className="text-violet-300">{formatCredits(item.revenue)} ALEO</span>
                </p>
                <p className="text-xs text-white/60">
                  Subscribers: <span className="text-white">{item.subscribers}</span>
                </p>
              </div>
            )
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value: string) => <span className="text-xs text-white/60">{value}</span>}
        />
        {/* Center label */}
        <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle">
          <tspan className="text-lg font-bold" fill="#ffffff" fontSize={18} fontWeight={700}>
            {formatCredits(totalRevenue)}
          </tspan>
        </text>
        <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle">
          <tspan fill="rgba(255,255,255,0.4)" fontSize={11}>
            ALEO total
          </tspan>
        </text>
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Churn Rate Card ───────────────────────────────────────────────

function ChurnCard({
  churn,
  loading,
}: {
  churn: { churnRate: number; expiredCount: number; renewedCount: number; totalActive: number; previousChurnRate: number } | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 w-20 bg-white/[0.06] rounded" />
        <div className="h-10 w-32 bg-white/[0.06] rounded" />
        <div className="h-4 w-48 bg-white/[0.06] rounded" />
      </div>
    )
  }

  if (!churn) {
    return (
      <div className="text-center py-6">
        <AlertTriangle className="w-6 h-6 text-white/20 mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-white/40">Connect wallet to see churn data</p>
      </div>
    )
  }

  const pct = Math.round(churn.churnRate * 100)
  const churnColor = pct < 10 ? 'text-emerald-400' : pct < 25 ? 'text-amber-400' : 'text-red-400'
  const churnBg = pct < 10 ? 'bg-emerald-500/10' : pct < 25 ? 'bg-amber-500/10' : 'bg-red-500/10'
  const prevPct = Math.round(churn.previousChurnRate * 100)
  const trendImproving = pct <= prevPct
  const TrendIcon = trendImproving ? TrendingDown : TrendingUp
  const trendColor = trendImproving ? 'text-emerald-400' : 'text-red-400'

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className={`w-4 h-4 ${churnColor}`} aria-hidden="true" />
        <span className="text-xs text-white/60 uppercase tracking-wider">Churn Rate</span>
      </div>
      <div className="flex items-baseline gap-3 mb-3">
        <span className={`text-3xl font-bold ${churnColor}`}>{pct}%</span>
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${churnBg} ${churnColor}`}>
          <TrendIcon className="w-3 h-3" aria-hidden="true" />
          {trendImproving ? 'Improving' : 'Worsening'}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        {churn.expiredCount > 0 && (
          <p className="text-white/50">
            <span className="text-white font-medium">{churn.expiredCount}</span> subscriptions expired without renewal
          </p>
        )}
        <p className="text-white/50">
          <span className="text-white font-medium">{churn.renewedCount}</span> renewed
          {churn.totalActive > 0 && (
            <span> / <span className="text-white font-medium">{churn.totalActive}</span> active</span>
          )}
        </p>
      </div>
    </div>
  )
}

// ── Recent Activity List ──────────────────────────────────────────

const TIER_NAMES_DISPLAY: Record<number, string> = {
  1: 'Supporter',
  2: 'Premium',
  3: 'VIP',
}

function RecentActivityList({ events, loading }: { events: { tier: number; amount_microcredits: number; tx_id: string | null; created_at: string }[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 bg-white/[0.06] rounded-lg" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-32 bg-white/[0.06] rounded" />
              <div className="h-2 w-20 bg-white/[0.06] rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!events.length) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="text-center">
          <Activity className="w-6 h-6 text-white/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-white/40">No recent activity</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0 max-h-[260px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      {events.map((event, i) => {
        const tierName = TIER_NAMES_DISPLAY[event.tier] ?? `Tier ${event.tier}`
        const timeAgo = getTimeAgo(event.created_at)
        return (
          <div key={i} className={`flex items-center gap-3 py-3 ${i < events.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-violet-400" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                New <span className="text-violet-300 font-medium">{tierName}</span> subscription
              </p>
              <p className="text-xs text-white/40">{timeAgo}</p>
            </div>
            <span className="text-sm font-medium text-emerald-400 shrink-0">
              +{formatCredits(event.amount_microcredits)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Contract Versions Section ─────────────────────────────────────

function ContractVersionsSection() {
  const [showAll, setShowAll] = useState(false)
  const displayed = useMemo(() => showAll ? CONTRACT_VERSIONS : CONTRACT_VERSIONS.filter(v => 'deployed' in v && v.deployed), [showAll])
  const hiddenCount = CONTRACT_VERSIONS.length - displayed.length

  return (
    <section className="mb-10 sm:mb-16">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h2 className="text-lg font-medium text-white">Contract Versions</h2>
        {hiddenCount > 0 && !showAll && (
          <button onClick={() => setShowAll(true)} className="text-xs text-violet-300 hover:text-violet-200 transition-colors">Show all {CONTRACT_VERSIONS.length} versions</button>
        )}
        {showAll && (
          <button onClick={() => setShowAll(false)} className="text-xs text-white/50 hover:text-white/70 transition-colors">Show deployed only</button>
        )}
      </div>
      <GlassCard hover={false}>
        <div className="space-y-0">
          {displayed.map((item, i) => (
            <m.div key={item.version} initial={{ opacity: 1, x: 0 }} animate={{ opacity: 1, x: 0 }} className={`flex items-start gap-4 py-4 ${i < displayed.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="flex items-center gap-4 shrink-0">
                <GitBranch className={`w-4 h-4 ${'deployed' in item && item.deployed ? 'text-emerald-400' : 'text-white/60'}`} aria-hidden="true" />
                <span className={`text-sm font-mono font-medium ${'deployed' in item && item.deployed ? 'text-emerald-400' : 'text-white/70'}`}>{item.version}</span>
                {'deployed' in item && item.deployed && <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">deployed</span>}
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{item.description}</p>
            </m.div>
          ))}
        </div>
        {!showAll && hiddenCount > 0 && (
          <div className="pt-4 border-t border-border mt-4 text-center">
            <button onClick={() => setShowAll(true)} className="text-xs text-white/50 hover:text-white/70 transition-colors">+ {hiddenCount} earlier versions (v4-v21)</button>
          </div>
        )}
      </GlassCard>
    </section>
  )
}

// ── Main Page ─────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { connected } = useWallet()
  const analytics = useAnalytics()
  const [globalStats, setGlobalStats] = useState<GlobalStats>(EMPTY_STATS)
  const [globalLoading, setGlobalLoading] = useState(true)
  const [statsUnavailable, setStatsUnavailable] = useState(false)

  const fetchGlobalStats = useCallback(async () => {
    setGlobalLoading(true)
    setStatsUnavailable(false)
    try {
      const res = await fetch('/api/analytics?global_stats=true')
      if (!res.ok) { setStatsUnavailable(true); setGlobalStats(EMPTY_STATS); return }
      const data = await res.json()
      setGlobalStats(data)
      if (data.totalCreators === 0 && data.totalSubscriptions === 0 && data.totalRevenue === 0) setStatsUnavailable(true)
    } catch {
      setStatsUnavailable(true)
      setGlobalStats(EMPTY_STATS)
    } finally {
      setGlobalLoading(false)
    }
  }, [])

  useEffect(() => { fetchGlobalStats() }, [fetchGlobalStats])

  const hasCreatorData = connected && analytics.data !== null
  const hasActivity = hasCreatorData && analytics.data!.daily.some((d) => d.subscriptions > 0 || d.revenue > 0)
  const churnData = analytics.data?.churn ?? null

  return (
    <PageTransition>
      <main className="min-h-screen bg-background py-12 sm:py-16 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none" style={HERO_GLOW_STYLE} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl font-serif italic text-white mb-4" style={LETTER_SPACING_STYLE}>Platform Analytics</h1>
            <p className="text-white/70 text-base max-w-2xl leading-relaxed">Platform stats are completely private. Creators see only aggregate numbers -- subscriber identities are never stored or visible. All metrics are mathematically anonymized.</p>
          </div>

          {/* ── Top Row: 4 Stat Cards ──────────────────────────── */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 sm:mb-16">
            {hasCreatorData ? (
              <>
                <MetricCard icon={Coins} label="Revenue" value={`${formatCredits(analytics.data!.summary.totalRevenue)} ALEO`} trend={analytics.data!.summary.revenueTrend} sparkline={analytics.data!.summary.revenueSparkline} sparkColor="stroke-emerald-400" />
                <MetricCard icon={Users} label="Subscribers" value={analytics.data!.summary.activeSubscribers.toString()} trend={analytics.data!.summary.subscriberTrend} sparkline={analytics.data!.summary.subscriberSparkline} sparkColor="stroke-violet-400" />
                <MetricCard icon={FileText} label="Content" value={analytics.data!.summary.contentPublished.toString()} trend={analytics.data!.summary.contentTrend} sparkline={analytics.data!.summary.contentSparkline} sparkColor="stroke-blue-400" />
                <ChurnStatCard churn={churnData} loading={analytics.loading} />
              </>
            ) : (
              <>
                <StatsCard icon={Users} label="Total Creators" value={globalStats.totalCreators.toString()} loading={globalLoading} delay={0} />
                <StatsCard icon={CreditCard} label="Total Subscriptions" value={globalStats.totalSubscriptions.toString()} loading={globalLoading} delay={0.05} />
                <StatsCard icon={Coins} label="Platform Revenue" value={`${formatCredits(globalStats.totalRevenue)} ALEO`} loading={globalLoading} delay={0.1} />
                <StatsCard icon={ShieldCheck} label="Privacy Level" value="Maximum" delay={0.15} />
              </>
            )}
          </div>

          {statsUnavailable && !hasCreatorData && (
            <div className="mb-8 p-4 rounded-xl bg-white/[0.04] border border-white/10 text-center">
              <p className="text-sm text-white/50 mb-2">No live data yet. Connect to Aleo testnet to see real-time platform stats.</p>
              <button onClick={fetchGlobalStats} disabled={globalLoading} title={globalLoading ? 'Loading...' : 'Retry'} className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-medium text-white/60 hover:bg-white/[0.1] transition-all disabled:opacity-50 inline-flex items-center gap-2">
                <RefreshCw className={`w-3 h-3 ${globalLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                {globalLoading ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          )}

          {/* ── Date Range Selector ────────────────────────────── */}

          {hasCreatorData && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-white">Your Analytics</h2>
              <div className="flex items-center gap-2">
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => analytics.setDateRange(opt.value)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${analytics.dateRange === opt.value ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/[0.04] border-border text-white/50 hover:text-white/70'}`}>{opt.label}</button>
                ))}
                <button onClick={analytics.refresh} disabled={analytics.loading} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/70 transition-all disabled:opacity-50" title="Refresh analytics">
                  <RefreshCw className={`w-4 h-4 ${analytics.loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* ── Middle Row: Subscriber Growth Chart (full width) ─ */}

          {hasCreatorData && (
            <section className="mb-8">
              <GlassCard hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-400" aria-hidden="true" />
                    <h3 className="text-sm font-medium text-white">Subscriber Growth</h3>
                  </div>
                  {analytics.data!.subscriberGrowth.length > 0 && (
                    <span className="text-xs text-violet-400/80 bg-violet-500/10 px-3 py-1 rounded-full">
                      {analytics.data!.subscriberGrowth.length} data points
                    </span>
                  )}
                </div>
                <SubscriberGrowthChart
                  data={analytics.data!.subscriberGrowth}
                  loading={analytics.loading}
                />
              </GlassCard>
            </section>
          )}

          {/* ── Bottom Row: Pie Chart (left) + Recent Activity (right) ─ */}

          {hasCreatorData && (
            <section className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-10 sm:mb-16">
              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-4 h-4 text-violet-400" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-white">Revenue by Tier</h3>
                </div>
                <RevenuePieChart
                  data={analytics.data!.tierRevenue}
                  loading={analytics.loading}
                />
              </GlassCard>

              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-white">Recent Activity</h3>
                </div>
                <RecentActivityList
                  events={analytics.data!.recentEvents}
                  loading={analytics.loading}
                />
              </GlassCard>
            </section>
          )}

          {/* ── Churn Detail Section ──────────────────────────── */}

          {hasCreatorData && (
            <section className="mb-10 sm:mb-16">
              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-6">
                  <AlertTriangle className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-white">Retention & Churn</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-8">
                  <ChurnCard churn={churnData} loading={analytics.loading} />
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs text-white/60 uppercase tracking-wider">Tier Distribution</span>
                    </div>
                    {analytics.data!.tierDistribution.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.data!.tierDistribution.map((tier, i) => (
                          <m.div key={tier.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-white/80">{tier.name}</span>
                              <span className="text-white font-medium">{tier.value}%</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <m.div initial={{ width: 0 }} animate={{ width: `${tier.value}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: 'easeOut' }} className={`h-full ${tier.color} rounded-full`} />
                            </div>
                          </m.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[100px]">
                        <p className="text-sm text-white/40">No tier data yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            </section>
          )}

          {/* ── Protocol Stats ─────────────────────────────────── */}

          <section className="mb-10 sm:mb-16">
            <h2 className="text-lg font-medium text-white mb-6 sm:mb-8">Protocol Stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ProtocolStat icon={Activity} value="27" label="Actions" delay={0} />
              <ProtocolStat icon={Layers} value="6" label="Private Data Types" delay={0.05} />
              <ProtocolStat icon={Database} value="25" label="On-Chain Records" delay={0.1} />
              <ProtocolStat icon={Code} value="866" label="Lines of Logic" delay={0.15} />
            </div>
          </section>

          {/* ── Privacy Guarantees ─────────────────────────────── */}

          <section className="mb-10 sm:mb-16">
            <h2 className="text-lg font-medium text-white mb-6 sm:mb-8">Privacy Guarantees</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <GlassCard delay={0}><div className="flex items-start gap-4"><div className="p-2 rounded-lg bg-white/[0.06]"><EyeOff className="w-5 h-5 text-white/60" aria-hidden="true" /></div><div><p className="text-2xl font-semibold text-white mb-1">0</p><p className="text-sm font-medium text-white mb-1">Identity Leaks</p><p className="text-sm text-white/70 leading-relaxed">Subscribers are never stored or logged. Each purchase is private -- no way to link a creator&apos;s subscribers together.</p></div></div></GlassCard>
              <GlassCard delay={0.05}><div className="flex items-start gap-4"><div className="p-2 rounded-lg bg-white/[0.06]"><ShieldCheck className="w-5 h-5 text-white/60" aria-hidden="true" /></div><div><p className="text-2xl font-semibold text-white mb-1">0</p><p className="text-sm font-medium text-white mb-1">Traceable Verifications</p><p className="text-sm text-white/70 leading-relaxed">When someone accesses gated content, the transaction leaves zero public trace. Even the platform can&apos;t log who accessed what.</p></div></div></GlassCard>
              <GlassCard delay={0.1}><div className="flex items-start gap-4"><div className="p-2 rounded-lg bg-white/[0.06]"><Lock className="w-5 h-5 text-white/60" aria-hidden="true" /></div><div><p className="text-2xl font-semibold text-white mb-1">100%</p><p className="text-sm font-medium text-white mb-1">Private Payments</p><p className="text-sm text-white/60 leading-relaxed">All payments are sent privately. Transaction amounts and participants are never publicly visible.</p></div></div></GlassCard>
            </div>
          </section>

          {/* ── Privacy Modes ──────────────────────────────────── */}

          <section className="mb-10 sm:mb-16">
            <h2 className="text-lg font-medium text-white mb-6 sm:mb-8">Privacy Modes</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <GlassCard delay={0}><div className="flex items-center gap-2 mb-4"><ShieldCheck className="w-4 h-4 text-green-400" aria-hidden="true" /><span className="text-sm font-medium text-white">Standard</span></div><p className="text-sm text-white/70 leading-relaxed mb-4">Each payment is completely private. Your wallet is never connected to a creator or linked to your subscription history.</p><div className="text-xs text-white/70">Subscribe / Renew</div></GlassCard>
              <GlassCard delay={0.05} variant="accent"><div className="flex items-center gap-2 mb-4"><EyeOff className="w-4 h-4 text-violet-400" aria-hidden="true" /><span className="text-sm font-medium text-white">Blind</span></div><p className="text-sm text-white/70 leading-relaxed mb-4">Each renewal looks like a different subscriber. Even the creator can&apos;t track renewals from the same person.</p><div className="text-xs text-white/70">Blind Subscribe / Blind Renew</div></GlassCard>
              <GlassCard delay={0.1}><div className="flex items-center gap-2 mb-4"><Lock className="w-4 h-4 text-violet-400" aria-hidden="true" /><span className="text-sm font-medium text-white">Maximum (v27)</span></div><p className="text-sm text-white/70 leading-relaxed mb-4">All creator metrics are anonymized. No way to connect data points to individual addresses -- privacy enforced at the protocol level.</p><div className="text-xs text-white/70">All actions / Hash-indexed privacy</div></GlassCard>
            </div>
          </section>

          {/* ── Contract Versions ──────────────────────────────── */}

          <ContractVersionsSection />

          {/* ── CTA: Explorer ──────────────────────────────────── */}

          <section>
            <m.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-8 text-center">
              <Search className="w-8 h-8 text-violet-400 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-xl font-semibold text-white mb-2">Query the chain yourself</h3>
              <p className="text-sm text-white/60 max-w-md mx-auto mb-4">Look up any creator&apos;s public stats, query on-chain mappings directly, and verify data with no wallet required.</p>
              <Link href="/explorer" className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 active:scale-[0.98] transition-all btn-shimmer">Open On-Chain Explorer<ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
            </m.div>
          </section>
        </div>
      </main>
    </PageTransition>
  )
}

// ── Card Components ─────────────────────────────────────────────

function StatsCard({ icon: Icon, label, value, loading, delay }: { icon: typeof Users; label: string; value: string; loading?: boolean; delay: number }) {
  return (<GlassCard delay={delay}><div className="flex items-center gap-4 mb-4"><Icon className="w-4 h-4 text-white/60" aria-hidden="true" /><span className="text-xs text-white/60 uppercase tracking-wider">{label}</span></div>{loading ? (<div className="h-8 flex items-center"><div className="w-6 h-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" aria-label="Loading" /></div>) : (<p className="text-2xl font-semibold text-white">{value}</p>)}</GlassCard>)
}

function MetricCard({ icon: Icon, label, value, trend, sparkline, sparkColor }: { icon: typeof Users; label: string; value: string; trend: number; sparkline: number[]; sparkColor: string }) {
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown
  const trendColor = trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-white/50'
  return (<GlassCard><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Icon className="w-4 h-4 text-white/60" aria-hidden="true" /><span className="text-xs text-white/60 uppercase tracking-wider">{label}</span></div><Sparkline data={sparkline} color={sparkColor} /></div><p className="text-2xl font-semibold text-white mb-1">{value}</p>{trend !== 0 && (<div className={`flex items-center gap-1 ${trendColor}`}><TrendIcon className="w-3 h-3" aria-hidden="true" /><span className="text-xs font-medium">{trend > 0 ? '+' : ''}{trend}%</span><span className="text-xs text-white/40 ml-1">vs prev period</span></div>)}</GlassCard>)
}

function ChurnStatCard({ churn, loading }: { churn: { churnRate: number; previousChurnRate: number } | null; loading: boolean }) {
  const pct = churn ? Math.round(churn.churnRate * 100) : 0
  const churnColor = pct < 10 ? 'text-emerald-400' : pct < 25 ? 'text-amber-400' : 'text-red-400'
  const trendImproving = churn ? pct <= Math.round(churn.previousChurnRate * 100) : true
  const TrendIcon = trendImproving ? TrendingDown : TrendingUp
  const trendTxt = trendImproving ? 'Improving' : 'Worsening'

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-white/60" aria-hidden="true" />
          <span className="text-xs text-white/60 uppercase tracking-wider">Churn Rate</span>
        </div>
      </div>
      {loading ? (
        <div className="h-8 flex items-center"><div className="w-6 h-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" aria-label="Loading" /></div>
      ) : (
        <>
          <p className={`text-2xl font-semibold mb-1 ${churnColor}`}>{pct}%</p>
          {churn && (
            <div className={`flex items-center gap-1 ${trendImproving ? 'text-emerald-400' : 'text-red-400'}`}>
              <TrendIcon className="w-3 h-3" aria-hidden="true" />
              <span className="text-xs font-medium">{trendTxt}</span>
            </div>
          )}
        </>
      )}
    </GlassCard>
  )
}

function ProtocolStat({ icon: Icon, value, label, delay }: { icon: typeof Activity; value: string; label: string; delay: number }) {
  return (<GlassCard delay={delay}><div className="text-center"><Icon className="w-5 h-5 text-white/60 mx-auto mb-4" aria-hidden="true" /><p className="text-2xl font-semibold text-white mb-1">{value}</p><p className="text-sm text-white/60">{label}</p></div></GlassCard>)
}
