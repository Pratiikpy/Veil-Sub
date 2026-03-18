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
} from 'lucide-react'
import Link from 'next/link'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import { formatCredits } from '@/lib/utils'
import { useAnalytics, type DateRange } from '@/hooks/useAnalytics'

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

  return (
    <PageTransition>
      <main className="min-h-screen bg-background py-12 sm:py-16 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none" style={HERO_GLOW_STYLE} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl font-serif italic text-white mb-4" style={LETTER_SPACING_STYLE}>Platform Analytics</h1>
            <p className="text-white/70 text-base max-w-2xl leading-relaxed">Platform stats are completely private. Creators see only aggregate numbers—subscriber identities are never stored or visible. All metrics are mathematically anonymized.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 sm:mb-16">
            <StatsCard icon={Users} label="Total Creators" value={globalStats.totalCreators.toString()} loading={globalLoading} delay={0} />
            <StatsCard icon={CreditCard} label="Total Subscriptions" value={globalStats.totalSubscriptions.toString()} loading={globalLoading} delay={0.05} />
            <StatsCard icon={Coins} label="Platform Revenue" value={`${formatCredits(globalStats.totalRevenue)} ALEO`} loading={globalLoading} delay={0.1} />
            <StatsCard icon={ShieldCheck} label="Privacy Level" value="Maximum" delay={0.15} />
          </div>

          {statsUnavailable && (
            <div className="mb-8 p-4 rounded-xl bg-white/[0.04] border border-white/10 text-center">
              <p className="text-sm text-white/50 mb-2">No live data yet. Connect to Aleo testnet to see real-time platform stats.</p>
              <button onClick={fetchGlobalStats} disabled={globalLoading} title={globalLoading ? 'Loading...' : 'Retry'} className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-medium text-white/60 hover:bg-white/[0.1] transition-all disabled:opacity-50 inline-flex items-center gap-2">
                <RefreshCw className={`w-3 h-3 ${globalLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                {globalLoading ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          )}

          {hasCreatorData && (
            <section className="mb-10 sm:mb-16">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h2 className="text-lg font-medium text-white">Your Revenue</h2>
                <div className="flex items-center gap-2">
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => analytics.setDateRange(opt.value)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${analytics.dateRange === opt.value ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/[0.04] border-border text-white/50 hover:text-white/70'}`}>{opt.label}</button>
                  ))}
                  <button onClick={analytics.refresh} disabled={analytics.loading} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/70 transition-all disabled:opacity-50" title="Refresh analytics">
                    <RefreshCw className={`w-4 h-4 ${analytics.loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard icon={Coins} label="Total Revenue" value={`${formatCredits(analytics.data!.summary.totalRevenue)} ALEO`} trend={analytics.data!.summary.revenueTrend} sparkline={analytics.data!.summary.revenueSparkline} sparkColor="stroke-emerald-400" />
                <MetricCard icon={Users} label="Active Subscribers" value={analytics.data!.summary.activeSubscribers.toString()} trend={analytics.data!.summary.subscriberTrend} sparkline={analytics.data!.summary.subscriberSparkline} sparkColor="stroke-violet-400" />
                <MetricCard icon={FileText} label="Content Published" value={analytics.data!.summary.contentPublished.toString()} trend={analytics.data!.summary.contentTrend} sparkline={analytics.data!.summary.contentSparkline} sparkColor="stroke-blue-400" />
                <MetricCard icon={Coins} label="Total Tips" value={`${formatCredits(analytics.data!.summary.totalTips)} ALEO`} trend={analytics.data!.summary.tipsTrend} sparkline={analytics.data!.summary.tipsSparkline} sparkColor="stroke-amber-400" />
              </div>
            </section>
          )}

          <section className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-10 sm:mb-16">
            <GlassCard delay={0}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" aria-hidden="true" /><h3 className="text-sm font-medium text-white">Subscription Growth</h3></div>
                {hasActivity && <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full">{analytics.data!.daily.length} data points</span>}
              </div>
              {hasActivity ? (
                <>
                  <div className="flex items-end justify-between gap-2 h-48 mb-4">
                    {analytics.data!.daily.map((day, i) => {
                      const maxSubs = Math.max(...analytics.data!.daily.map((d) => d.subscriptions), 1)
                      const barH = (day.subscriptions / maxSubs) * 100
                      return (
                        <m.div key={day.date} initial={{ height: 0 }} animate={{ height: `${Math.max(barH, 2)}%` }} transition={{ delay: 0.1 + i * 0.02, duration: 0.5, ease: 'easeOut' }} className="flex-1 relative group">
                          <div className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-violet-500 to-violet-400 group-hover:from-violet-400 group-hover:to-violet-300 transition-colors" style={{ height: '100%' }} />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap z-10">{day.subscriptions} subs</div>
                        </m.div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-white/50"><span>{analytics.data!.daily[0]?.date ?? ''}</span><span>{analytics.data!.daily[analytics.data!.daily.length - 1]?.date ?? ''}</span></div>
                </>
              ) : (
                <div className="flex items-center justify-center h-48"><div className="text-center"><BarChart3 className="w-8 h-8 text-white/20 mx-auto mb-2" aria-hidden="true" /><p className="text-sm text-white/40">{connected ? 'No subscription activity yet' : 'Connect wallet to see your analytics'}</p></div></div>
              )}
            </GlassCard>
            <GlassCard delay={0.1}>
              <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-violet-400" aria-hidden="true" /><h3 className="text-sm font-medium text-white">Tier Distribution</h3></div></div>
              {hasCreatorData && analytics.data!.tierDistribution.length > 0 ? (
                <div className="space-y-4">
                  {analytics.data!.tierDistribution.map((tier, i) => (
                    <m.div key={tier.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="space-y-2">
                      <div className="flex items-center justify-between text-sm"><span className="text-white/80">{tier.name}</span><span className="text-white font-medium">{tier.value}%</span></div>
                      <div className="h-6 bg-white/5 rounded-lg overflow-hidden"><m.div initial={{ width: 0 }} animate={{ width: `${tier.value}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: 'easeOut' }} className={`h-full ${tier.color} rounded-lg shadow-lg`} /></div>
                    </m.div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[180px]"><div className="text-center"><BarChart3 className="w-8 h-8 text-white/20 mx-auto mb-2" aria-hidden="true" /><p className="text-sm text-white/40">{connected ? 'No tier data yet' : 'Connect wallet to see tier distribution'}</p></div></div>
              )}
            </GlassCard>
          </section>

          <section className="mb-10 sm:mb-16">
            <h2 className="text-lg font-medium text-white mb-6 sm:mb-8">Protocol Stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ProtocolStat icon={Activity} value="27" label="Actions" delay={0} />
              <ProtocolStat icon={Layers} value="6" label="Private Data Types" delay={0.05} />
              <ProtocolStat icon={Database} value="25" label="On-Chain Records" delay={0.1} />
              <ProtocolStat icon={Code} value="866" label="Lines of Logic" delay={0.15} />
            </div>
          </section>

          <section className="mb-10 sm:mb-16">
            <h2 className="text-lg font-medium text-white mb-6 sm:mb-8">Privacy Guarantees</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <GlassCard delay={0}><div className="flex items-start gap-4"><div className="p-2 rounded-lg bg-white/[0.06]"><EyeOff className="w-5 h-5 text-white/60" aria-hidden="true" /></div><div><p className="text-2xl font-semibold text-white mb-1">0</p><p className="text-sm font-medium text-white mb-1">Identity Leaks</p><p className="text-sm text-white/70 leading-relaxed">Subscribers are never stored or logged. Each purchase is private—no way to link a creator&apos;s subscribers together.</p></div></div></GlassCard>
              <GlassCard delay={0.05}><div className="flex items-start gap-4"><div className="p-2 rounded-lg bg-white/[0.06]"><ShieldCheck className="w-5 h-5 text-white/60" aria-hidden="true" /></div><div><p className="text-2xl font-semibold text-white mb-1">0</p><p className="text-sm font-medium text-white mb-1">Traceable Verifications</p><p className="text-sm text-white/70 leading-relaxed">When someone accesses gated content, the transaction leaves zero public trace. Even the platform can&apos;t log who accessed what.</p></div></div></GlassCard>
              <GlassCard delay={0.1}><div className="flex items-start gap-4"><div className="p-2 rounded-lg bg-white/[0.06]"><Lock className="w-5 h-5 text-white/60" aria-hidden="true" /></div><div><p className="text-2xl font-semibold text-white mb-1">100%</p><p className="text-sm font-medium text-white mb-1">Private Payments</p><p className="text-sm text-white/60 leading-relaxed">All payments are sent privately. Transaction amounts and participants are never publicly visible.</p></div></div></GlassCard>
            </div>
          </section>

          <section className="mb-10 sm:mb-16">
            <h2 className="text-lg font-medium text-white mb-6 sm:mb-8">Privacy Modes</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <GlassCard delay={0}><div className="flex items-center gap-2 mb-4"><ShieldCheck className="w-4 h-4 text-green-400" aria-hidden="true" /><span className="text-sm font-medium text-white">Standard</span></div><p className="text-sm text-white/70 leading-relaxed mb-4">Each payment is completely private. Your wallet is never connected to a creator or linked to your subscription history.</p><div className="text-xs text-white/70">Subscribe · Renew</div></GlassCard>
              <GlassCard delay={0.05} variant="accent"><div className="flex items-center gap-2 mb-4"><EyeOff className="w-4 h-4 text-violet-400" aria-hidden="true" /><span className="text-sm font-medium text-white">Blind</span></div><p className="text-sm text-white/70 leading-relaxed mb-4">Each renewal looks like a different subscriber. Even the creator can&apos;t track renewals from the same person.</p><div className="text-xs text-white/70">Blind Subscribe · Blind Renew</div></GlassCard>
              <GlassCard delay={0.1}><div className="flex items-center gap-2 mb-4"><Lock className="w-4 h-4 text-violet-400" aria-hidden="true" /><span className="text-sm font-medium text-white">Maximum (v27)</span></div><p className="text-sm text-white/70 leading-relaxed mb-4">All creator metrics are anonymized. No way to connect data points to individual addresses—privacy enforced at the protocol level.</p><div className="text-xs text-white/70">All actions · Hash-indexed privacy</div></GlassCard>
            </div>
          </section>

          <ContractVersionsSection />

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

function StatsCard({ icon: Icon, label, value, loading, delay }: { icon: typeof Users; label: string; value: string; loading?: boolean; delay: number }) {
  return (<GlassCard delay={delay}><div className="flex items-center gap-4 mb-4"><Icon className="w-4 h-4 text-white/60" aria-hidden="true" /><span className="text-xs text-white/60 uppercase tracking-wider">{label}</span></div>{loading ? (<div className="h-8 flex items-center"><div className="w-6 h-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" aria-label="Loading" /></div>) : (<p className="text-2xl font-semibold text-white">{value}</p>)}</GlassCard>)
}

function MetricCard({ icon: Icon, label, value, trend, sparkline, sparkColor }: { icon: typeof Users; label: string; value: string; trend: number; sparkline: number[]; sparkColor: string }) {
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown
  const trendColor = trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-white/50'
  return (<GlassCard><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Icon className="w-4 h-4 text-white/60" aria-hidden="true" /><span className="text-xs text-white/60 uppercase tracking-wider">{label}</span></div><Sparkline data={sparkline} color={sparkColor} /></div><p className="text-2xl font-semibold text-white mb-1">{value}</p>{trend !== 0 && (<div className={`flex items-center gap-1 ${trendColor}`}><TrendIcon className="w-3 h-3" aria-hidden="true" /><span className="text-xs font-medium">{trend > 0 ? '+' : ''}{trend}%</span><span className="text-xs text-white/40 ml-1">vs prev period</span></div>)}</GlassCard>)
}

function ProtocolStat({ icon: Icon, value, label, delay }: { icon: typeof Activity; value: string; label: string; delay: number }) {
  return (<GlassCard delay={delay}><div className="text-center"><Icon className="w-5 h-5 text-white/60 mx-auto mb-4" aria-hidden="true" /><p className="text-2xl font-semibold text-white mb-1">{value}</p><p className="text-sm text-white/60">{label}</p></div></GlassCard>)
}
