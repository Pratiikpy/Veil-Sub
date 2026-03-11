'use client'

import { useState, useEffect, useRef } from 'react'
import { BarChart3 } from 'lucide-react'

interface DailyData {
  date: string
  subscriptions: number
  revenue: number
  tips: number
}

interface Props {
  creatorAddress: string
}

export default function ActivityChart({ creatorAddress }: Props) {
  const [data, setData] = useState<DailyData[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setFetchError(false)
    fetch(`/api/analytics/summary?creator=${encodeURIComponent(creatorAddress)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('API error')
        return res.json()
      })
      .then((json) => {
        setData(json.daily || [])
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setFetchError(true)
        setLoading(false)
      })
    return () => controller.abort()
  }, [creatorAddress])

  // Staggered entrance animation via IntersectionObserver
  useEffect(() => {
    if (loading || hasAnimated || !chartRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(chartRef.current)
    return () => observer.disconnect()
  }, [loading, hasAnimated])

  if (loading) {
    return (
      <div className="h-48 rounded-xl bg-surface-1 border border-border animate-pulse" />
    )
  }

  if (fetchError) {
    return (
      <div className="rounded-xl bg-surface-1 border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-white/70" aria-hidden="true" />
          <h3 className="text-sm font-medium text-white">Subscription Activity</h3>
        </div>
        <p className="text-xs text-white/60">Unable to load activity data.</p>
      </div>
    )
  }

  const maxSubs = Math.max(...data.map((d) => d.subscriptions), 1)

  return (
    <div className="rounded-xl bg-surface-1 border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-white/70" aria-hidden="true" />
        <h3 className="text-sm font-medium text-white">Subscription Activity</h3>
        <span className="text-xs text-white/60 ml-auto">Last 30 days</span>
      </div>

      {/* Bar chart */}
      <div ref={chartRef} className="flex items-end gap-[2px] h-32">
        {data.map((day, idx) => {
          const height = maxSubs > 0 ? (day.subscriptions / maxSubs) * 100 : 0
          const isToday = day.date === new Date().toISOString().split('T')[0]

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center justify-end group relative"
            >
              <div
                className={`w-full rounded-t transition-all ${
                  day.subscriptions > 0
                    ? isToday
                      ? 'bg-violet-400'
                      : 'bg-violet-500/60 group-hover:bg-violet-400/80'
                    : 'bg-white/[0.04]'
                }`}
                style={{
                  height: hasAnimated ? `${Math.max(height, 2)}%` : '0%',
                  transition: `height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.02}s`,
                }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="px-2 py-1 rounded bg-surface-2 border border-border text-xs whitespace-nowrap shadow-lg">
                  <p className="text-white/70">{day.date}</p>
                  <p className="text-white">{day.subscriptions} subs</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-white/60">
          {data[0]?.date.slice(5) || ''}
        </span>
        <span className="text-[10px] text-white/60">
          {data[Math.floor(data.length / 2)]?.date.slice(5) || ''}
        </span>
        <span className="text-[10px] text-white/60">
          {data[data.length - 1]?.date.slice(5) || ''}
        </span>
      </div>

      {/* Summary row */}
      <div className="flex gap-8 mt-4 pt-4 border-t border-border">
        <div>
          <p className="text-xs text-white/60">Total Subs (30d)</p>
          <p className="text-sm font-medium text-white">
            {data.reduce((sum, d) => sum + d.subscriptions, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/60">Tips (30d)</p>
          <p className="text-sm font-medium text-white">
            {data.reduce((sum, d) => sum + d.tips, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/60">Peak Day</p>
          <p className="text-sm font-medium text-white">
            {data.length > 0 ? Math.max(...data.map((d) => d.subscriptions)) : 0} subs
          </p>
        </div>
      </div>
    </div>
  )
}
