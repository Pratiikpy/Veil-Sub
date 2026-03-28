'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import {
  DEPLOYED_PROGRAM_ID,
  getCreatorHash,
  saveCreatorHash,
  CREATOR_CUSTOM_TIERS,
  MICROCREDITS_PER_CREDIT,
  DEFAULT_TIER_NAMES,
} from '@/lib/config'
import { formatCredits } from '@/lib/utils'

export type DateRange = '7d' | '30d' | '90d' | 'all'

export interface DailyDataPoint {
  date: string
  subscriptions: number
  revenue: number
  tips: number
}

export interface TierDistribution {
  name: string
  value: number // percentage for bar display
  color: string
}

export interface TierRevenueSlice {
  name: string
  revenue: number // microcredits
  subscribers: number
  color: string
}

export interface ChurnData {
  churnRate: number         // 0-1 decimal
  expiredCount: number      // subscriptions expired without renewal
  renewedCount: number      // subscriptions renewed
  totalActive: number       // total active subscriptions
  previousChurnRate: number // previous period for trend
}

export interface SubscriberGrowthPoint {
  date: string
  subscribers: number // cumulative count
}

export interface AnalyticsSummary {
  totalRevenue: number
  activeSubscribers: number
  contentPublished: number
  totalTips: number
  // Trends (vs previous period, as percentage)
  revenueTrend: number
  subscriberTrend: number
  contentTrend: number
  tipsTrend: number
  // Sparkline data (last 7 values)
  revenueSparkline: number[]
  subscriberSparkline: number[]
  contentSparkline: number[]
  tipsSparkline: number[]
}

export interface RecentEvent {
  tier: number
  amount_microcredits: number
  tx_id: string | null
  created_at: string
}

export interface AnalyticsData {
  daily: DailyDataPoint[]
  tierDistribution: TierDistribution[]
  tierRevenue: TierRevenueSlice[]
  subscriberGrowth: SubscriberGrowthPoint[]
  churn: ChurnData
  recentEvents: RecentEvent[]
  summary: AnalyticsSummary
}

// Recharts-friendly colors (hex values)
const TIER_HEX_COLORS = [
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#3B82F6', // blue
  '#F43F5E', // rose
]

// Tailwind bar colors (kept for tier distribution bars)
const TIER_BAR_COLORS = [
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-blue-500',
  'bg-rose-500',
]

const TIER_NAMES = DEFAULT_TIER_NAMES

/** Fetch a single on-chain mapping value via the API proxy */
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

function computeTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function filterByRange(daily: DailyDataPoint[], range: DateRange): DailyDataPoint[] {
  if (range === 'all') return daily
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return daily.slice(-days)
}

/** Build cumulative subscriber growth from daily data */
function buildSubscriberGrowth(daily: DailyDataPoint[], currentTotal: number): SubscriberGrowthPoint[] {
  if (daily.length === 0) return []

  // Work backwards from current total to compute cumulative for each day
  const totalFromDaily = daily.reduce((s, d) => s + d.subscriptions, 0)
  const baseline = Math.max(0, currentTotal - totalFromDaily)

  let cumulative = baseline
  return daily.map((d) => {
    cumulative += d.subscriptions
    return { date: d.date, subscribers: cumulative }
  })
}

/** Compute churn data from daily data (expired vs renewed) */
function computeChurn(
  daily: DailyDataPoint[],
  activeSubscribers: number,
): ChurnData {
  // Estimate churn from daily subscription patterns
  // A day with 0 new subscriptions following an active period suggests potential churn
  const totalSubs = daily.reduce((s, d) => s + d.subscriptions, 0)
  const halfIdx = Math.floor(daily.length / 2)
  const firstHalfSubs = daily.slice(0, halfIdx).reduce((s, d) => s + d.subscriptions, 0)
  const secondHalfSubs = daily.slice(halfIdx).reduce((s, d) => s + d.subscriptions, 0)

  // Estimate expired based on subscription decay pattern
  // Each subscription lasts ~30 days (864K blocks). If data spans >30 days,
  // subscriptions from the first period may have expired.
  const estimatedExpired = daily.length > 30 ? Math.max(0, firstHalfSubs - Math.floor(secondHalfSubs * 0.3)) : 0
  const estimatedRenewed = Math.max(0, totalSubs - estimatedExpired)

  const churnDenominator = Math.max(1, activeSubscribers + estimatedExpired)
  const churnRate = churnDenominator > 0 ? estimatedExpired / churnDenominator : 0

  // Previous period churn for trend comparison
  const prevExpired = daily.length > 60
    ? Math.max(0, daily.slice(0, Math.floor(daily.length / 4)).reduce((s, d) => s + d.subscriptions, 0) * 0.2)
    : 0
  const prevDenominator = Math.max(1, firstHalfSubs + prevExpired)
  const previousChurnRate = prevDenominator > 0 ? prevExpired / prevDenominator : 0

  return {
    churnRate: Math.min(1, Math.max(0, churnRate)),
    expiredCount: estimatedExpired,
    renewedCount: estimatedRenewed,
    totalActive: activeSubscribers,
    previousChurnRate: Math.min(1, Math.max(0, previousChurnRate)),
  }
}

/** Build tier revenue data from Supabase tier distribution and config prices */
function buildTierRevenue(
  tierDistribution: Record<string, number>,
  walletAddress: string | null,
): TierRevenueSlice[] {
  const entries = Object.entries(tierDistribution)
  if (entries.length === 0) return []

  // Try to get real tier prices from config
  const creatorTiers = walletAddress ? (CREATOR_CUSTOM_TIERS[walletAddress] ?? {}) : {}

  return entries.map(([tierIdStr, subscriberCount], i) => {
    const tierId = parseInt(tierIdStr, 10)
    const tierConfig = creatorTiers[tierId]
    const tierPrice = tierConfig?.price ?? tierId * 5_000_000 // fallback: tierId * 5 ALEO
    const tierName = tierConfig?.name ?? TIER_NAMES[tierId] ?? `Tier ${tierId}`

    return {
      name: tierName,
      revenue: subscriberCount * tierPrice,
      subscribers: subscriberCount,
      color: TIER_HEX_COLORS[i % TIER_HEX_COLORS.length],
    }
  })
}

export function useAnalytics() {
  const { address, connected } = useWallet()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [rawDaily, setRawDaily] = useState<DailyDataPoint[]>([])
  const [rawTierDist, setRawTierDist] = useState<Record<string, number>>({})
  const [rawRecentEvents, setRawRecentEvents] = useState<RecentEvent[]>([])

  const walletAddress = address ?? null

  const fetchAnalytics = useCallback(async () => {
    if (!walletAddress) return

    setLoading(true)
    setError(null)

    try {
      // Resolve creator hash for on-chain queries
      let creatorHash = getCreatorHash(walletAddress)
      if (!creatorHash) {
        try {
          const recoverRes = await fetch(
            `/api/creators/recover-hash?address=${encodeURIComponent(walletAddress)}`
          )
          if (recoverRes.ok) {
            const recoverData = await recoverRes.json()
            if (recoverData?.creator_hash?.endsWith('field')) {
              creatorHash = recoverData.creator_hash
              saveCreatorHash(walletAddress, recoverData.creator_hash)
            }
          }
        } catch {
          // Recovery failed — continue with Supabase-only data
        }
      }

      // Fetch on-chain stats, Supabase analytics, and recent events in parallel
      const [subscriberCount, totalRevenue, contentCount, summaryRes, recentRes] =
        await Promise.all([
          creatorHash ? fetchMapping('subscriber_count', creatorHash) : Promise.resolve(null),
          creatorHash ? fetchMapping('total_revenue', creatorHash) : Promise.resolve(null),
          creatorHash ? fetchMapping('content_count', creatorHash) : Promise.resolve(null),
          fetch(`/api/analytics/summary?creator=${encodeURIComponent(walletAddress)}`),
          fetch('/api/analytics?recent=true'),
        ])

      let daily: DailyDataPoint[] = []
      let tierDistributionRaw: Record<string, number> = {}
      let tierDistribution: TierDistribution[] = []
      let supabaseTotalSubs = 0
      let supabaseTotalRevenue = 0

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        daily = summaryData.daily ?? []
        supabaseTotalSubs = summaryData.totalSubscribers ?? 0
        supabaseTotalRevenue = summaryData.totalRevenue ?? 0

        // Build tier distribution from Supabase data
        tierDistributionRaw = summaryData.tierDistribution ?? {}
        const tierEntries = Object.entries(tierDistributionRaw)
        const totalTierSubs = tierEntries.reduce((s, [, v]) => s + (v as number), 0)

        if (totalTierSubs > 0) {
          tierDistribution = tierEntries.map(([tierIdStr, count], i) => {
            const tierId = parseInt(tierIdStr, 10)
            return {
              name: TIER_NAMES[tierId] ?? `Tier ${tierId}`,
              value: Math.round(((count as number) / totalTierSubs) * 100),
              color: TIER_BAR_COLORS[i % TIER_BAR_COLORS.length],
            }
          })
        }
      }

      // Parse recent events
      let recentEvents: RecentEvent[] = []
      if (recentRes.ok) {
        const recentData = await recentRes.json()
        recentEvents = (recentData.events ?? []).slice(0, 10)
      }

      // Use on-chain data when available, fall back to Supabase aggregates
      const finalSubscribers = subscriberCount ?? supabaseTotalSubs
      const finalRevenue = totalRevenue ?? supabaseTotalRevenue
      const finalContent = contentCount ?? 0

      // Compute total tips from daily data
      const totalTips = daily.reduce((sum, d) => sum + d.tips, 0)

      // Compute trends (compare last half vs first half of data)
      const halfIdx = Math.floor(daily.length / 2)
      const firstHalf = daily.slice(0, halfIdx)
      const secondHalf = daily.slice(halfIdx)

      const firstRevenue = firstHalf.reduce((s, d) => s + d.revenue, 0)
      const secondRevenue = secondHalf.reduce((s, d) => s + d.revenue, 0)
      const firstSubs = firstHalf.reduce((s, d) => s + d.subscriptions, 0)
      const secondSubs = secondHalf.reduce((s, d) => s + d.subscriptions, 0)

      // Sparklines: last 7 data points
      const last7 = daily.slice(-7)
      const revenueSparkline = last7.map((d) => d.revenue)
      const subscriberSparkline = last7.map((d) => d.subscriptions)
      const contentSparkline = last7.map((_, i) =>
        i === last7.length - 1 ? finalContent : 0
      )
      const tipsSparkline = last7.map((d) => d.tips)

      setRawDaily(daily)
      setRawTierDist(tierDistributionRaw)
      setRawRecentEvents(recentEvents)

      const filtered = filterByRange(daily, dateRange)
      const subscriberGrowth = buildSubscriberGrowth(filtered, finalSubscribers)
      const tierRevenue = buildTierRevenue(tierDistributionRaw, walletAddress)
      const churn = computeChurn(filtered, finalSubscribers)

      setData({
        daily: filtered,
        tierDistribution,
        tierRevenue,
        subscriberGrowth,
        churn,
        recentEvents,
        summary: {
          totalRevenue: finalRevenue,
          activeSubscribers: finalSubscribers,
          contentPublished: finalContent,
          totalTips: totalTips,
          revenueTrend: computeTrend(secondRevenue, firstRevenue),
          subscriberTrend: computeTrend(secondSubs, firstSubs),
          contentTrend: 0,
          tipsTrend: 0,
          revenueSparkline,
          subscriberSparkline,
          contentSparkline,
          tipsSparkline,
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load analytics'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [walletAddress, dateRange])

  // Update filtered data when date range changes (without re-fetching)
  useEffect(() => {
    if (rawDaily.length > 0 && data) {
      const filtered = filterByRange(rawDaily, dateRange)
      const subscriberGrowth = buildSubscriberGrowth(filtered, data.summary.activeSubscribers)
      const tierRevenue = buildTierRevenue(rawTierDist, walletAddress)
      const churn = computeChurn(filtered, data.summary.activeSubscribers)
      setData((prev) =>
        prev
          ? { ...prev, daily: filtered, subscriberGrowth, tierRevenue, churn, recentEvents: rawRecentEvents }
          : prev
      )
    }
  }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch on wallet connect
  useEffect(() => {
    if (connected && walletAddress) {
      fetchAnalytics()
    } else {
      setData(null)
      setRawDaily([])
      setRawTierDist({})
      setRawRecentEvents([])
    }
  }, [connected, walletAddress]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading,
    error,
    dateRange,
    setDateRange,
    refresh: fetchAnalytics,
    formatCredits,
  }
}
