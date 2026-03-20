'use client'

import { useEffect, useState } from 'react'
import { m } from 'framer-motion'
import { Users, Coins, Tag, RefreshCw } from 'lucide-react'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { formatCredits } from '@/lib/utils'
import type { CreatorProfile } from '@/types'

interface Props {
  creatorAddress: string
  refreshKey?: number
}

export default function StatsPanel({ creatorAddress, refreshKey }: Props) {
  const { fetchCreatorStats, loading, error: hookError, clearError } = useCreatorStats()
  const [stats, setStats] = useState<CreatorProfile | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (creatorAddress) {
      setFetchError(null)
      clearError()
      fetchCreatorStats(creatorAddress).then(setStats).catch((err) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load stats')
      })
    }
  }, [creatorAddress, fetchCreatorStats, refreshKey, clearError])

  // Combine local and hook-level errors
  const errorMessage = fetchError || hookError?.message

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.05] animate-pulse"
          >
            <div className="h-4 w-16 bg-white/10 rounded mb-2" />
            <div className="h-8 w-20 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const handleRetry = () => {
    setFetchError(null)
    clearError()
    fetchCreatorStats(creatorAddress).then(setStats).catch((err) => {
      setFetchError(err instanceof Error ? err.message : 'Failed to load stats')
    })
  }

  if (!stats && errorMessage) {
    return (
      <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15">
        <p className="text-xs text-red-300 mb-3 text-center">
          {errorMessage || 'On-chain creator stats unavailable. The Aleo testnet may be congested.'}
        </p>
        <button
          onClick={handleRetry}
          disabled={loading}
          className="mx-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-red-400/50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {loading ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    )
  }

  if (!stats) return null

  const items = [
    {
      label: 'Subscribers',
      value: stats.subscriberThreshold,
      icon: Users,
      color: 'text-white/70',
    },
    {
      label: 'Revenue',
      value: stats.revenueThreshold,
      icon: Coins,
      color: 'text-green-400',
    },
    {
      label: 'Base Price',
      value: stats.tierPrice !== undefined && stats.tierPrice !== null
        ? `${formatCredits(stats.tierPrice)} ALEO`
        : 'Not set',
      icon: Tag,
      color: 'text-blue-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <m.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-xl bg-surface-1 border border-white/[0.05] hover:border-border transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${item.color}`} aria-hidden="true" />
              <span className="text-xs text-white/70">{item.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{item.value}</p>
          </m.div>
        )
      })}
    </div>
  )
}
