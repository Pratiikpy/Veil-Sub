'use client'

import { useState, useCallback, useEffect } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { DEPLOYED_PROGRAM_ID, getCreatorHash, saveCreatorHash } from '@/lib/config'
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
  value: number
  color: string
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

export interface AnalyticsData {
  daily: DailyDataPoint[]
  tierDistribution: TierDistribution[]
  summary: AnalyticsSummary
}

const TIER_COLORS = [
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-blue-500',
  'bg-rose-500',
]

const TIER_NAMES: Record<number, string> = {
  1: 'Supporter',
  2: 'Premium',
  3: 'VIP',
}

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

export function useAnalytics() {
  const { address, connected } = useWallet()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [rawDaily, setRawDaily] = useState<DailyDataPoint[]>([])

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

      // Fetch on-chain stats and Supabase analytics in parallel
      const [subscriberCount, totalRevenue, contentCount, summaryRes] =
        await Promise.all([
          creatorHash ? fetchMapping('subscriber_count', creatorHash) : Promise.resolve(null),
          creatorHash ? fetchMapping('total_revenue', creatorHash) : Promise.resolve(null),
          creatorHash ? fetchMapping('content_count', creatorHash) : Promise.resolve(null),
          fetch(`/api/analytics/summary?creator=${encodeURIComponent(walletAddress)}`),
        ])

      let daily: DailyDataPoint[] = []
      let tierDistribution: TierDistribution[] = []
      let supabaseTotalSubs = 0
      let supabaseTotalRevenue = 0

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        daily = summaryData.daily ?? []
        supabaseTotalSubs = summaryData.totalSubscribers ?? 0
        supabaseTotalRevenue = summaryData.totalRevenue ?? 0

        // Build tier distribution from Supabase data
        const tierDist: Record<string, number> = summaryData.tierDistribution ?? {}
        const tierEntries = Object.entries(tierDist)
        const totalTierSubs = tierEntries.reduce((s, [, v]) => s + v, 0)

        if (totalTierSubs > 0) {
          tierDistribution = tierEntries.map(([tierIdStr, count], i) => {
            const tierId = parseInt(tierIdStr, 10)
            return {
              name: TIER_NAMES[tierId] ?? `Tier ${tierId}`,
              value: Math.round((count / totalTierSubs) * 100),
              color: TIER_COLORS[i % TIER_COLORS.length],
            }
          })
        }
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

      const filtered = filterByRange(daily, dateRange)

      setData({
        daily: filtered,
        tierDistribution,
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
      setData((prev) => (prev ? { ...prev, daily: filtered } : prev))
    }
  }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch on wallet connect
  useEffect(() => {
    if (connected && walletAddress) {
      fetchAnalytics()
    } else {
      setData(null)
      setRawDaily([])
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
