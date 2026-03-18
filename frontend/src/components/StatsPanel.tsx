'use client'

import { useEffect, useState } from 'react'
import { m } from 'framer-motion'
import { Users, Coins, Tag } from 'lucide-react'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { formatCredits } from '@/lib/utils'
import type { CreatorProfile } from '@/types'

interface Props {
  creatorAddress: string
  refreshKey?: number
}

export default function StatsPanel({ creatorAddress, refreshKey }: Props) {
  const { fetchCreatorStats, loading } = useCreatorStats()
  const [stats, setStats] = useState<CreatorProfile | null>(null)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    if (creatorAddress) {
      setFetchError(false)
      fetchCreatorStats(creatorAddress).then(setStats).catch(() => {
        setFetchError(true)
      })
    }
  }, [creatorAddress, fetchCreatorStats, refreshKey])

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

  if (!stats && fetchError) {
    return (
      <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15 text-center">
        <p className="text-xs text-red-300">On-chain creator stats unavailable. The Aleo testnet may be congested.</p>
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
      value: stats.tierPrice
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
