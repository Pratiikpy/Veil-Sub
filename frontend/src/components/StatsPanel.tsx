'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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

  useEffect(() => {
    if (creatorAddress) {
      fetchCreatorStats(creatorAddress).then(setStats).catch(() => {
        // Network error — keep existing stats or null
      })
    }
  }, [creatorAddress, fetchCreatorStats, refreshKey])

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-white/5 border border-white/5 animate-pulse"
          >
            <div className="h-4 w-16 bg-white/10 rounded mb-2" />
            <div className="h-8 w-20 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const items = [
    {
      label: 'Subscribers',
      value: stats.subscriberCount.toString(),
      icon: Users,
      color: 'text-violet-400',
    },
    {
      label: 'Revenue',
      value: `${formatCredits(stats.totalRevenue)} ALEO`,
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
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${item.color}`} />
              <span className="text-xs text-slate-400">{item.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{item.value}</p>
          </motion.div>
        )
      })}
    </div>
  )
}
