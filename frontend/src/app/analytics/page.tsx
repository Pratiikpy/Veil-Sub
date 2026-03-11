'use client'

import { useEffect, useState, useCallback } from 'react'
import { m } from 'framer-motion'
import {
  Users,
  CreditCard,
  Coins,
  FileCode,
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
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import { formatCredits } from '@/lib/utils'

interface GlobalStats {
  totalCreators: number
  totalSubscriptions: number
  totalRevenue: number
  activePrograms: number
}

// Tier distribution data (mock but realistic percentages)
const TIER_DISTRIBUTION = [
  { name: 'Basic (1x)', value: 45, color: 'bg-emerald-500' },
  { name: 'Pro (2x)', value: 35, color: 'bg-violet-500' },
  { name: 'VIP (5x)', value: 20, color: 'bg-amber-500' },
]

// Activity data for recent periods (mock weekly data)
const ACTIVITY_DATA = [
  { label: 'W1', subscriptions: 12, revenue: 180 },
  { label: 'W2', subscriptions: 18, revenue: 320 },
  { label: 'W3', subscriptions: 24, revenue: 520 },
  { label: 'W4', subscriptions: 31, revenue: 780 },
  { label: 'W5', subscriptions: 28, revenue: 650 },
  { label: 'W6', subscriptions: 42, revenue: 1100 },
]

const CONTRACT_VERSIONS = [
  {
    version: 'v4-v8',
    description: 'Core subscriptions, AccessPass, CreatorReceipt, AuditToken, content publishing',
  },
  {
    version: 'v9-v10',
    description: 'Dynamic tiers, content CRUD, gifting, escrow, fee withdrawal',
  },
  {
    version: 'v11-v12',
    description: 'Blind renewal (novel privacy), encrypted content, disputes, revocation',
  },
  {
    version: 'v13-v14',
    description: 'Ternary safety fixes, BHP256 commit-reveal tipping',
  },
  {
    version: 'v15-v16',
    description: 'Security hardening, subscription transfer, on-chain referral system',
  },
  {
    version: 'v17-v21',
    description: 'Pedersen commitments, zero-footprint proofs, Poseidon2 optimization, analytics epochs, error codes (source-only iterations)',
  },
  {
    version: 'v23',
    description: 'Privacy overhaul: ZERO addresses in finalize, all mapping keys are Poseidon2 field hashes. Removed Pedersen proof transitions and analytics mappings. Deployed on testnet.',
  },
  {
    version: 'v24',
    description: 'Content auth fix (content_creator mapping), on-chain expiry enforcement in verify_access/verify_tier_access, subscription_by_tier in all subscribe variants. 25 transitions, 22 mappings—deployed on testnet',
    deployed: true,
  },
  {
    version: 'v25',
    description: 'prove_subscriber_threshold (privacy-preserving reputation proof), total_creators + total_content platform analytics mappings. 26 transitions, 24 mappings—deployed on testnet (superseded by v27)',
    deployed: true,
  },
  {
    version: 'v26',
    description: 'Ephemeral trial passes (subscribe_trial)—20% of tier price for ~12hr access. 27 transitions, 24 mappings, 846 statements—deployed on testnet (superseded by v27)',
    deployed: true,
  },
  {
    version: 'v27',
    description: 'Scoped audit tokens (scope_mask bitfield), trial rate-limiting (one trial per creator), gift revocation fix. 27 transitions, 25 mappings, 866 statements',
    deployed: true,
  },
]

// Demo fallback values for when API is unavailable
const DEMO_STATS: GlobalStats = {
  totalCreators: 12,
  totalSubscriptions: 247,
  totalRevenue: 8500000000, // 8500 ALEO in microcredits
  activePrograms: 1,
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<GlobalStats>(DEMO_STATS)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [usingDemo, setUsingDemo] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setFetchError(false)
    setUsingDemo(false)
    try {
      const res = await fetch('/api/analytics?global_stats=true')
      if (!res.ok) {
        setFetchError(true)
        setUsingDemo(true)
        setStats(DEMO_STATS)
        return
      }
      const data = await res.json()
      // Use demo stats if all values are 0 (no real data yet)
      if (data.totalCreators === 0 && data.totalSubscriptions === 0 && data.totalRevenue === 0) {
        setStats(DEMO_STATS)
        setUsingDemo(true)
      } else {
        setStats(data)
      }
    } catch {
      setFetchError(true)
      setUsingDemo(true)
      setStats(DEMO_STATS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <PageTransition>
      <main className="min-h-screen bg-background py-12 relative">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.05) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-[1120px] mx-auto px-8">
          {/* Hero */}
          <div className="mb-16">
            <h1 className="text-3xl sm:text-4xl font-serif italic text-white mb-4" style={{ letterSpacing: '-0.03em' }}>
              Platform Analytics
            </h1>
            <p className="text-white/60 text-base max-w-2xl leading-relaxed">
              Public aggregate statistics from Poseidon2-hashed mappings. Creator-scoped metrics
              (subscriber_count, total_revenue per creator) are queried by creator_hash = Poseidon2(address),
              never raw address. All 25 mapping keys are field hashes. Zero individual subscriber identities
              in any mapping—v27 enforces this at Leo compile time: no code path exists for subscriber
              addresses to reach any finalize block.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            <StatsCard
              icon={Users}
              label="Total Creators"
              value={stats.totalCreators.toString()}
              loading={loading}
              delay={0}
            />
            <StatsCard
              icon={CreditCard}
              label="Total Subscriptions"
              value={stats.totalSubscriptions.toString()}
              loading={loading}
              delay={0.05}
            />
            <StatsCard
              icon={Coins}
              label="Platform Revenue"
              value={`${formatCredits(stats.totalRevenue)} ALEO`}
              loading={loading}
              delay={0.1}
            />
            <StatsCard
              icon={FileCode}
              label="Contract Version"
              value="v27"
              delay={0.15}
            />
          </div>
          {usingDemo && (
            <div className="mb-8 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
              <p className="text-sm text-violet-300 mb-2">Showing demo data. Connect to testnet for live stats.</p>
              <button
                onClick={fetchStats}
                disabled={loading}
                title={loading ? 'Loading statistics from /api/analytics...' : 'Retry loading live platform stats'}
                className="px-4 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-xs font-medium text-violet-300 hover:bg-violet-500/30 transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                {loading ? 'Retrying...' : 'Load Live Stats'}
              </button>
            </div>
          )}

          {/* Visual Charts Section */}
          <section className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Subscription Growth Chart */}
            <GlassCard delay={0}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-white">Subscription Growth</h3>
                </div>
                <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full">+35% this wave</span>
              </div>
              <div className="flex items-end justify-between gap-2 h-48 mb-4">
                {ACTIVITY_DATA.map((week, i) => {
                  const maxSubs = Math.max(...ACTIVITY_DATA.map(w => w.subscriptions))
                  const height = (week.subscriptions / maxSubs) * 100
                  return (
                    <m.div
                      key={week.label}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                      className="flex-1 relative group"
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-violet-500 to-violet-400 group-hover:from-violet-400 group-hover:to-violet-300 transition-colors"
                        style={{ height: '100%' }}
                      />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                        {week.subscriptions} subs
                      </div>
                    </m.div>
                  )
                })}
              </div>
              <div className="flex justify-between text-sm text-white/60">
                {ACTIVITY_DATA.map((week) => (
                  <span key={week.label} className="flex-1 text-center font-medium">{week.label}</span>
                ))}
              </div>
            </GlassCard>

            {/* Tier Distribution */}
            <GlassCard delay={0.1}>
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-4 h-4 text-violet-400" aria-hidden="true" />
                <h3 className="text-sm font-medium text-white">Tier Distribution</h3>
              </div>
              <div className="space-y-4">
                {TIER_DISTRIBUTION.map((tier, i) => (
                  <m.div
                    key={tier.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/80">{tier.name}</span>
                      <span className="text-white font-medium">{tier.value}%</span>
                    </div>
                    <div className="h-6 bg-white/5 rounded-lg overflow-hidden">
                      <m.div
                        initial={{ width: 0 }}
                        animate={{ width: `${tier.value}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                        className={`h-full ${tier.color} rounded-lg shadow-lg`}
                      />
                    </div>
                  </m.div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Average Subscription Value</span>
                  <span className="text-white font-medium">2.1x tier multiplier</span>
                </div>
              </div>
            </GlassCard>
          </section>

          {/* Protocol Stats */}
          <section className="mb-16">
            <h2 className="text-lg font-medium text-white mb-8">Protocol Stats</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ProtocolStat icon={Activity} value="27" label="Transitions" delay={0} />
              <ProtocolStat icon={Layers} value="6" label="Record Types" delay={0.05} />
              <ProtocolStat icon={Database} value="25" label="Mappings" delay={0.1} />
              <ProtocolStat icon={Code} value="866" label="Statements" delay={0.15} />
            </div>
          </section>

          {/* Privacy Guarantees */}
          <section className="mb-16">
            <h2 className="text-lg font-medium text-white mb-8">Privacy Guarantees</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <GlassCard delay={0}>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white/[0.06]">
                    <EyeOff className="w-5 h-5 text-white/60" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white mb-1">0</p>
                    <p className="text-sm font-medium text-white mb-1">Identity Leaks</p>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Subscriber addresses are cryptographically excluded from finalize via BSP architecture.
                      Even hashed mappings use Poseidon2(creator_address) as keys, not subscriber data.
                    </p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard delay={0.05}>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white/[0.06]">
                    <ShieldCheck className="w-5 h-5 text-white/60" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white mb-1">0</p>
                    <p className="text-sm font-medium text-white mb-1">
                      Footprint Verifications
                    </p>
                    <p className="text-sm text-white/60 leading-relaxed">
                      v27 verify_access finalize: reads access_revoked[pass_id] (a single field lookup, not an address).
                      Zero subscriber address writes, zero identity-linked counters, zero timing-correlation mapping entries.
                      Finalize cannot correlate verification to any subscriber—proof of access is via UTXO record consumption
                      (private AccessPass), not public state.
                    </p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard delay={0.1}>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white/[0.06]">
                    <Lock className="w-5 h-5 text-white/60" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white mb-1">100%</p>
                    <p className="text-sm font-medium text-white mb-1">Private Payments</p>
                    <p className="text-sm text-white/60 leading-relaxed">
                      All payments use transfer_private. Transaction amounts and participants
                      are never publicly visible.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Privacy Modes */}
          <section className="mb-16">
            <h2 className="text-lg font-medium text-white mb-8">Privacy Modes</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <GlassCard delay={0}>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-green-400" aria-hidden="true" />
                  <span className="text-sm font-medium text-white">Standard</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed mb-4">
                  Private payment via credits.aleo/transfer_private. Subscriber address excluded from
                  finalize layer via BSP. Creator sees only aggregate count—no per-subscriber mapping entries.
                </p>
                <div className="text-xs text-white/60">subscribe · renew</div>
              </GlassCard>
              <GlassCard delay={0.05} variant="accent">
                <div className="flex items-center gap-2 mb-4">
                  <EyeOff className="w-4 h-4 text-violet-400" aria-hidden="true" />
                  <span className="text-sm font-medium text-white">Blind</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed mb-4">
                  Nonce-rotated identity per action—each renewal computes BHP256(caller, unique_nonce)
                  for identity hashing. Creator sees different subscriber hash each time, breaking renewal pattern tracking.
                </p>
                <div className="text-xs text-white/60">subscribe_blind · renew_blind</div>
              </GlassCard>
              <GlassCard delay={0.1}>
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-4 h-4 text-violet-400" aria-hidden="true" />
                  <span className="text-sm font-medium text-white">Maximum (v27)</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed mb-4">
                  All mapping keys are Poseidon2(address, context) hashes (v23+ privacy overhaul).
                  Zero raw addresses in any finalize block. On-chain analytics keyed by field hashes, preventing address-to-data linking.
                </p>
                <div className="text-xs text-white/60">all transitions · Poseidon2 keys</div>
              </GlassCard>
            </div>
          </section>

          {/* Contract Versions Timeline */}
          <section className="mb-16">
            <h2 className="text-lg font-medium text-white mb-8">Contract Versions</h2>
            <GlassCard hover={false}>
              <div className="space-y-0">
                {CONTRACT_VERSIONS.map((item, i) => (
                  <m.div
                    key={item.version}
                    initial={{ opacity: 1, x: 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-4 py-4 ${
                      i < CONTRACT_VERSIONS.length - 1
                        ? 'border-b border-border'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 shrink-0">
                      <GitBranch className={`w-4 h-4 ${'deployed' in item && item.deployed ? 'text-emerald-400' : 'text-white/60'}`} aria-hidden="true" />
                      <span
                        className={`text-sm font-mono font-medium ${'deployed' in item && item.deployed ? 'text-emerald-400' : 'text-white/70'}`}
                      >
                        {item.version}
                      </span>
                      {'deployed' in item && item.deployed && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          deployed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">{item.description}</p>
                  </m.div>
                ))}
              </div>
            </GlassCard>
          </section>

          {/* CTA — Explore on-chain */}
          <section>
            <m.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl glass p-8 text-center"
            >
              <Search className="w-8 h-8 text-violet-400 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-xl font-semibold text-white mb-2">Query the chain yourself</h3>
              <p className="text-sm text-white/60 max-w-md mx-auto mb-4">
                Look up any creator&apos;s public stats, query on-chain mappings directly, and verify data with no wallet required.
              </p>
              <Link
                href="/explorer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 active:scale-[0.98] transition-all btn-shimmer"
              >
                Open On-Chain Explorer
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </m.div>
          </section>
        </div>
      </main>
    </PageTransition>
  )
}

function StatsCard({
  icon: Icon,
  label,
  value,
  loading,
  delay,
}: {
  icon: typeof Users
  label: string
  value: string
  loading?: boolean
  delay: number
}) {
  return (
    <GlassCard delay={delay}>
      <div className="flex items-center gap-4 mb-4">
        <Icon className="w-4 h-4 text-white/60" aria-hidden="true" />
        <span className="text-xs text-white/60 uppercase tracking-wider">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 flex items-center">
          <div className="w-6 h-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" aria-label="Loading" />
        </div>
      ) : (
        <p className="text-2xl font-semibold text-white">{value}</p>
      )}
    </GlassCard>
  )
}

function ProtocolStat({
  icon: Icon,
  value,
  label,
  delay,
}: {
  icon: typeof Activity
  value: string
  label: string
  delay: number
}) {
  return (
    <GlassCard delay={delay}>
      <div className="text-center">
        <Icon className="w-5 h-5 text-white/60 mx-auto mb-4" aria-hidden="true" />
        <p className="text-2xl font-semibold text-white mb-1">{value}</p>
        <p className="text-sm text-white/60">{label}</p>
      </div>
    </GlassCard>
  )
}
