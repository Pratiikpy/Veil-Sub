'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'

interface Props {
  creatorAddress: string
}

const TIER_CONFIG: Record<string, { name: string; color: string; bg: string }> = {
  '1': { name: 'Supporter', color: 'bg-green-400', bg: 'bg-green-500/10' },
  '2': { name: 'Premium', color: 'bg-blue-400', bg: 'bg-blue-500/10' },
  '3': { name: 'VIP', color: 'bg-violet-400', bg: 'bg-violet-500/10' },
}

export default function TierDistribution({ creatorAddress }: Props) {
  const [distribution, setDistribution] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setFetchError(false)
    fetch(`/api/analytics/summary?creator=${encodeURIComponent(creatorAddress)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('API error')
        return res.json()
      })
      .then((json) => {
        setDistribution(json.tierDistribution || {})
        setTotal(json.totalSubscribers || 0)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setFetchError(true)
        setLoading(false)
      })
    return () => controller.abort()
  }, [creatorAddress])

  if (loading) {
    return (
      <div className="h-36 rounded-sm bg-surface-1 border border-border animate-pulse" />
    )
  }

  if (fetchError) {
    return (
      <div className="rounded-sm bg-surface-1 border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-white/70" />
          <h3 className="text-sm font-medium text-white">Tier Breakdown</h3>
        </div>
        <p className="text-xs text-white/60">Unable to load tier data.</p>
      </div>
    )
  }

  const maxCount = Math.max(...Object.values(distribution), 1)

  return (
    <div className="rounded-sm bg-surface-1 border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-white/70" />
        <h3 className="text-sm font-medium text-white">Tier Breakdown</h3>
        <span className="text-xs text-white/60 ml-auto">{total} total</span>
      </div>

      <div className="space-y-3">
        {['1', '2', '3'].map((tierId) => {
          const config = TIER_CONFIG[tierId]
          const count = distribution[tierId] || 0
          const pct = total > 0 ? (count / total) * 100 : 0
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0

          return (
            <div key={tierId} className="group relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/70">{config.name}</span>
                <span className="text-xs text-white/60">
                  {count} ({pct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden relative">
                <div
                  className={`h-full rounded-full ${config.color} transition-all duration-500`}
                  style={{ width: `${barWidth}%` }}
                />
                {/* Hover tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="px-2.5 py-1.5 rounded bg-surface-2 border border-border text-xs whitespace-nowrap shadow-lg">
                    <p className="text-white font-medium">{count} subscribers</p>
                    <p className="text-white/70">{pct.toFixed(1)}% of total</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
