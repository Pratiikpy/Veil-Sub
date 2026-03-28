'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { m } from 'framer-motion'
import Link from 'next/link'
import {
  Coins,
  Users,
  FileText,
  Percent,
  TrendingUp,
  BarChart3,
  Activity,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import {
  DEPLOYED_PROGRAM_ID,
  getCreatorHash,
  saveCreatorHash,
  MICROCREDITS_PER_CREDIT,
  PLATFORM_FEE_PCT,
} from '@/lib/config'
import { formatCredits, formatUsd } from '@/lib/utils'
import type { CreatorProfile, ContentPost } from '@/types'

// ── Types ────────────────────────────────────────────────────────

interface DailyBucket {
  date: string
  subscriptions: number
  revenue: number
  tips: number
}

interface SummaryData {
  daily: DailyBucket[]
  tierDistribution: Record<string, number>
  totalSubscribers: number
  totalRevenue: number
}

interface RecentEvent {
  tier: number
  amount_microcredits: number
  tx_id: string | null
  created_at: string
}

interface OnChainStats {
  subscriberCount: number
  totalRevenue: number
  contentCount: number
  platformFee: number
}

// ── Animated Count-up Hook ───────────────────────────────────────

function useCountUp(target: number, duration = 500): React.RefObject<HTMLSpanElement | null> {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const start = performance.now()
    const startVal = parseInt(ref.current.textContent || '0', 10) || 0
    let raf: number

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const value = Math.round(startVal + (target - startVal) * eased)
      if (ref.current) ref.current.textContent = value.toLocaleString()
      if (progress < 1) raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return ref
}

// ── On-chain Mapping Fetcher ─────────────────────────────────────

async function fetchMapping(mapping: string, key: string): Promise<number | null> {
  try {
    const res = await fetch(
      `/api/aleo/program/${encodeURIComponent(DEPLOYED_PROGRAM_ID)}/mapping/${encodeURIComponent(mapping)}/${encodeURIComponent(key)}`
    )
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text === 'null' || text === '') return null
    const cleaned = text.replace(/"/g, '').replace(/u(8|16|32|64|128)$/, '').trim()
    const parsed = parseInt(cleaned, 10)
    return isNaN(parsed) ? null : parsed
  } catch {
    return null
  }
}

// ── Tier Name Mapping ────────────────────────────────────────────

const TIER_NAMES: Record<number, string> = {
  1: 'Supporter',
  2: 'Premium',
  3: 'VIP',
}

const TIER_COLORS: Record<number, { bar: string; text: string }> = {
  1: { bar: 'bg-violet-500', text: 'text-violet-400' },
  2: { bar: 'bg-amber-500', text: 'text-amber-400' },
  3: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
}

// ── Section 1: Revenue Overview Card ─────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  delay = 0,
  valueContent,
}: {
  icon: typeof Coins
  label: string
  value: string
  subtext: string
  delay?: number
  /** Optional custom JSX to render instead of the value string (for ref-controlled count-ups) */
  valueContent?: React.ReactNode
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="group relative p-5 rounded-xl bg-surface-1 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
    >
      {/* Gradient border glow on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
           style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06), transparent 60%)' }} />
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-3">
          <Icon className="w-4 h-4 text-white/50" aria-hidden="true" />
          <span className="text-xs text-white/50 font-medium uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-2xl font-bold text-white tabular-nums tracking-tight">{valueContent ?? value}</p>
        <p className="text-xs text-white/50 mt-1">{subtext}</p>
      </div>
    </m.div>
  )
}

// ── Section 2: SVG Revenue Chart ─────────────────────────────────

function RevenueChart({ data }: { data: DailyBucket[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const hasData = data.some((d) => d.revenue > 0 || d.subscriptions > 0)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-white/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-white/50">Revenue chart will appear as subscribers join</p>
          <p className="text-xs text-white/60 mt-1">Share your creator page to get started</p>
        </div>
      </div>
    )
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const barCount = data.length
  const svgWidth = 600
  const svgHeight = 200
  const barGap = 2
  const barWidth = Math.max(2, (svgWidth - barGap * barCount) / barCount)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-48"
        aria-label="Revenue chart showing daily revenue over the last 30 days"
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={pct}
            x1={0}
            y1={svgHeight * (1 - pct)}
            x2={svgWidth}
            y2={svgHeight * (1 - pct)}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="4 4"
          />
        ))}

        {data.map((bucket, i) => {
          const height = (bucket.revenue / maxRevenue) * (svgHeight - 20)
          const x = i * (barWidth + barGap)
          const y = svgHeight - height
          const isHovered = hoveredIdx === i
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(height, 1)}
                rx={Math.min(barWidth / 3, 4)}
                className={`transition-all duration-150 ${
                  isHovered
                    ? 'fill-violet-400/80'
                    : 'fill-violet-500/40'
                }`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              {/* Hover highlight */}
              {isHovered && (
                <rect
                  x={x}
                  y={0}
                  width={barWidth}
                  height={svgHeight}
                  fill="rgba(255,255,255,0.02)"
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* Date labels: first, middle, last */}
      <div className="flex justify-between px-1 mt-1">
        {data.length > 0 && (
          <>
            <span className="text-[10px] text-white/60">
              {new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {data.length > 2 && (
              <span className="text-[10px] text-white/60">
                {new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            <span className="text-[10px] text-white/60">
              {new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </>
        )}
      </div>

      {/* Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute top-0 pointer-events-none bg-[#12121A] border border-white/10 rounded-lg px-3 py-2 shadow-xl z-10"
          style={{
            left: `${Math.min(
              Math.max(
                ((hoveredIdx * (barWidth + barGap)) / svgWidth) * 100,
                5
              ),
              85
            )}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="text-[10px] text-white/50 mb-0.5">
            {new Date(data[hoveredIdx].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-xs font-medium text-white">
            {formatCredits(data[hoveredIdx].revenue)} ALEO
          </p>
          {data[hoveredIdx].subscriptions > 0 && (
            <p className="text-[10px] text-white/60">
              {data[hoveredIdx].subscriptions} subscription{data[hoveredIdx].subscriptions !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Section 3: Top Content Table ─────────────────────────────────

function TopContentTable({ posts }: { posts: ContentPost[] }) {
  if (!posts.length) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-center">
          <FileText className="w-8 h-8 text-white/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-white/50">No posts yet</p>
          <p className="text-xs text-white/60 mt-1">Create your first post from the dashboard</p>
        </div>
      </div>
    )
  }

  // Sort by tier (higher tier = more engagement proxy) then by date
  const sorted = [...posts]
    .sort((a, b) => {
      const scoreA = (a.minTier || 0) * 10
      const scoreB = (b.minTier || 0) * 10
      if (scoreB !== scoreA) return scoreB - scoreA
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    .slice(0, 5)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="pb-3 text-xs font-medium text-white/50 uppercase tracking-wider">Title</th>
            <th className="pb-3 text-xs font-medium text-white/50 uppercase tracking-wider text-center">Tier</th>
            <th className="pb-3 text-xs font-medium text-white/50 uppercase tracking-wider text-right">Published</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((post) => (
            <tr
              key={post.id}
              className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
            >
              <td className="py-3 pr-4">
                <p className="text-sm text-white truncate max-w-[240px]">
                  {post.title || post.body?.slice(0, 60) || 'Untitled'}
                </p>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/60">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="py-3 text-center">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-white/60">
                  {post.minTier === 0 ? 'Free' : TIER_NAMES[post.minTier] || `Tier ${post.minTier}`}
                </span>
              </td>
              <td className="py-3 text-right">
                <span className="text-xs text-white/50">
                  {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Section 4: Subscription Breakdown ────────────────────────────

function TierBreakdown({ distribution }: { distribution: Record<string, number> }) {
  const entries = Object.entries(distribution)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  if (!entries.length || total === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <Users className="w-8 h-8 text-white/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-white/50">No subscription data yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {entries
        .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
        .map(([tierIdStr, count]) => {
          const tierId = parseInt(tierIdStr, 10)
          const pct = Math.round((count / total) * 100)
          const colors = TIER_COLORS[tierId] || { bar: 'bg-white/30', text: 'text-white/60' }
          const name = TIER_NAMES[tierId] || `Tier ${tierId}`

          return (
            <m.div
              key={tierId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: tierId * 0.08 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${colors.text}`}>{name}</span>
                <span className="text-sm text-white tabular-nums">
                  {count} <span className="text-white/50">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <m.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.2 + tierId * 0.08, duration: 0.5, ease: 'easeOut' }}
                  className={`h-full ${colors.bar} rounded-full`}
                />
              </div>
            </m.div>
          )
        })}
    </div>
  )
}

// ── Section 5: Recent Activity Feed ──────────────────────────────

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

function RecentActivity({ events }: { events: RecentEvent[] }) {
  if (!events.length) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-center">
          <Activity className="w-8 h-8 text-white/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-white/50">No recent activity</p>
          <p className="text-xs text-white/60 mt-1">Events will appear as subscribers join</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="space-y-0 max-h-[300px] overflow-y-auto pr-1"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
    >
      {events.map((event, i) => {
        const tierName = event.tier === 0
          ? 'Tip'
          : TIER_NAMES[event.tier] || `Tier ${event.tier}`
        const isTip = event.tier === 0
        return (
          <div
            key={`${event.created_at}-${i}`}
            className={`flex items-center gap-3 py-3 ${
              i < events.length - 1 ? 'border-b border-white/[0.04]' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
              {isTip ? (
                <Coins className="w-4 h-4 text-amber-400/70" aria-hidden="true" />
              ) : (
                <Users className="w-4 h-4 text-white/60" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {isTip ? (
                  <>Anonymous <span className="text-amber-400/80 font-medium">tip</span> received</>
                ) : (
                  <>New <span className="text-white/70 font-medium">{tierName}</span> subscriber</>
                )}
              </p>
              <p className="text-xs text-white/60">{getTimeAgo(event.created_at)}</p>
            </div>
            <span className="text-sm font-medium text-emerald-400 shrink-0 tabular-nums">
              +{formatCredits(event.amount_microcredits)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Skeleton Loader ──────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="animate-pulse p-5 rounded-xl bg-surface-1 border border-white/[0.06]">
      <div className="h-3 w-20 bg-white/[0.06] rounded mb-3" />
      <div className="h-7 w-28 bg-white/[0.06] rounded mb-2" />
      <div className="h-3 w-36 bg-white/[0.06] rounded" />
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────

interface AnalyticsDashboardProps {
  creatorAddress: string
  stats?: CreatorProfile | null
}

export default function AnalyticsDashboard({ creatorAddress, stats }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [onChainStats, setOnChainStats] = useState<OnChainStats>({
    subscriberCount: 0,
    totalRevenue: 0,
    contentCount: 0,
    platformFee: 0,
  })
  const [dailyData, setDailyData] = useState<DailyBucket[]>([])
  const [tierDistribution, setTierDistribution] = useState<Record<string, number>>({})
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [refreshing, setRefreshing] = useState(false)

  // Animated count-up refs (direct DOM updates, no re-renders per frame)
  const revenueRef = useCountUp(onChainStats.totalRevenue, 600)
  const subscribersRef = useCountUp(onChainStats.subscriberCount, 500)
  const contentRef = useCountUp(onChainStats.contentCount, 400)
  const feeRef = useCountUp(onChainStats.platformFee, 600)

  const fetchAll = useCallback(async () => {
    try {
      // Resolve creator hash
      let creatorHash = getCreatorHash(creatorAddress)
      if (!creatorHash) {
        try {
          const recoverRes = await fetch(
            `/api/creators/recover-hash?address=${encodeURIComponent(creatorAddress)}`
          )
          if (recoverRes.ok) {
            const recoverData = await recoverRes.json()
            if (recoverData?.creator_hash?.endsWith('field')) {
              creatorHash = recoverData.creator_hash
              saveCreatorHash(creatorAddress, recoverData.creator_hash)
            }
          }
        } catch {
          // Continue without hash
        }
      }

      // Parallel fetch: on-chain mappings + Supabase summary + recent events + posts
      const [subscriberCount, totalRevenue, contentCount, summaryRes, recentRes, postsRes] =
        await Promise.all([
          creatorHash ? fetchMapping('subscriber_count', creatorHash) : Promise.resolve(null),
          creatorHash ? fetchMapping('total_revenue', creatorHash) : Promise.resolve(null),
          creatorHash ? fetchMapping('content_count', creatorHash) : Promise.resolve(null),
          fetch(`/api/analytics/summary?creator=${encodeURIComponent(creatorAddress)}`),
          fetch('/api/analytics?recent=true'),
          fetch(`/api/posts?creator=${encodeURIComponent(creatorAddress)}`),
        ])

      // On-chain stats (prefer on-chain, fall back to stats prop)
      const finalRevenue = totalRevenue ?? stats?.totalRevenue ?? 0
      const finalSubscribers = subscriberCount ?? stats?.subscriberCount ?? 0
      const finalContent = contentCount ?? stats?.contentCount ?? 0
      const platformFee = Math.round(finalRevenue * (PLATFORM_FEE_PCT / 100))

      setOnChainStats({
        subscriberCount: finalSubscribers,
        totalRevenue: finalRevenue,
        contentCount: finalContent,
        platformFee,
      })

      // Supabase summary (daily buckets + tier distribution)
      if (summaryRes.ok) {
        const summary: SummaryData = await summaryRes.json()
        setDailyData(summary.daily ?? [])
        setTierDistribution(summary.tierDistribution ?? {})
      }

      // Recent events
      if (recentRes.ok) {
        const recentData = await recentRes.json()
        setRecentEvents((recentData.events ?? []).slice(0, 10))
      }

      // Posts
      if (postsRes.ok) {
        const postsData = await postsRes.json()
        setPosts(postsData.posts ?? [])
      }
    } catch (err) {
      console.error('[AnalyticsDashboard] fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [creatorAddress, stats?.totalRevenue, stats?.subscriberCount, stats?.contentCount])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAll()
  }

  // Format values for display
  const revenueAleo = onChainStats.totalRevenue / MICROCREDITS_PER_CREDIT
  const feeAleo = onChainStats.platformFee / MICROCREDITS_PER_CREDIT

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-white/60" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-white">Revenue Analytics</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all disabled:opacity-50"
          aria-label="Refresh analytics"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </m.div>

      {/* ─── Section 1: Revenue Overview Cards (4-column grid) ─── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Coins}
            label="Total Revenue"
            value={revenueAleo > 0 ? `${formatCredits(onChainStats.totalRevenue)} ALEO` : '0 ALEO'}
            valueContent={revenueAleo > 0 ? <><span ref={revenueRef}>0</span> ALEO</> : undefined}
            subtext={revenueAleo > 0 ? formatUsd(onChainStats.totalRevenue) : 'No revenue yet'}
            delay={0}
          />
          <StatCard
            icon={Users}
            label="Subscribers"
            value={onChainStats.subscriberCount.toString()}
            valueContent={<span ref={subscribersRef}>0</span>}
            subtext={onChainStats.subscriberCount > 0 ? 'Total on-chain' : 'No subscribers yet'}
            delay={0.05}
          />
          <StatCard
            icon={FileText}
            label="Content Published"
            value={onChainStats.contentCount.toString()}
            valueContent={<span ref={contentRef}>0</span>}
            subtext={onChainStats.contentCount > 0 ? 'Posts on-chain' : 'No content yet'}
            delay={0.1}
          />
          <StatCard
            icon={Percent}
            label="Platform Fee"
            value={feeAleo > 0 ? `${formatCredits(onChainStats.platformFee)} ALEO` : '0 ALEO'}
            valueContent={feeAleo > 0 ? <><span ref={feeRef}>0</span> ALEO</> : undefined}
            subtext={`${PLATFORM_FEE_PCT}% of total revenue`}
            delay={0.15}
          />
        </div>
      )}

      {/* ─── Section 2: Revenue Chart ─── */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-6 rounded-xl bg-surface-1 border border-white/[0.06]"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/60" aria-hidden="true" />
            <h3 className="text-sm font-medium text-white">Revenue (Last 30 Days)</h3>
          </div>
          {dailyData.some((d) => d.revenue > 0) && (
            <span className="text-xs text-white/60 bg-white/[0.04] px-2.5 py-1 rounded-full">
              {dailyData.filter((d) => d.revenue > 0).length} active days
            </span>
          )}
        </div>
        <RevenueChart data={dailyData} />
      </m.div>

      {/* ─── Section 3 + 4: Top Content (left) + Tier Breakdown (right) ─── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Content */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-xl bg-surface-1 border border-white/[0.06]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-white/60" aria-hidden="true" />
              <h3 className="text-sm font-medium text-white">Top Content</h3>
            </div>
            {posts.length > 5 && (
              <Link
                href={`/creator/${creatorAddress}`}
                className="text-xs text-white/50 hover:text-white/70 transition-colors flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          <TopContentTable posts={posts} />
        </m.div>

        {/* Subscription Breakdown */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-6 rounded-xl bg-surface-1 border border-white/[0.06]"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-white/60" aria-hidden="true" />
            <h3 className="text-sm font-medium text-white">Subscription Breakdown</h3>
          </div>
          <TierBreakdown distribution={tierDistribution} />
        </m.div>
      </div>

      {/* ─── Section 5: Recent Activity Feed ─── */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-xl bg-surface-1 border border-white/[0.06]"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400/80" aria-hidden="true" />
            <h3 className="text-sm font-medium text-white">Recent Activity</h3>
          </div>
          {recentEvents.length > 0 && (
            <span className="text-xs text-white/60">
              Last {recentEvents.length} events
            </span>
          )}
        </div>
        <RecentActivity events={recentEvents} />
      </m.div>

      {/* ─── CTA: Full Analytics Page ─── */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-center"
      >
        <Link
          href="/analytics"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.1] transition-all"
        >
          <BarChart3 className="w-4 h-4" aria-hidden="true" />
          View Full Analytics
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </m.div>
    </div>
  )
}
