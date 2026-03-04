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

  useEffect(() => {
    const controller = new AbortController()
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
        setLoading(false)
      })
    return () => controller.abort()
  }, [creatorAddress])

  if (loading) {
    return (
      <div className="h-36 rounded-[12px] bg-[#111113] border border-[rgba(255,255,255,0.06)] animate-pulse" />
    )
  }

  const maxCount = Math.max(...Object.values(distribution), 1)

  return (
    <div className="rounded-[12px] bg-[#111113] border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-[#a1a1aa]" />
        <h3 className="text-sm font-medium text-white">Tier Breakdown</h3>
        <span className="text-xs text-[#71717a] ml-auto">{total} total</span>
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
                <span className="text-xs text-[#a1a1aa]">{config.name}</span>
                <span className="text-xs text-[#71717a]">
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
                  <div className="px-2.5 py-1.5 rounded bg-[#1a1825] border border-[rgba(255,255,255,0.06)] text-xs whitespace-nowrap shadow-lg">
                    <p className="text-white font-medium">{count} subscribers</p>
                    <p className="text-[#a1a1aa]">{pct.toFixed(1)}% of total</p>
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
