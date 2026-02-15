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
  const [hasAnimated, setHasAnimated] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
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
      <div className="h-48 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
    )
  }

  const maxSubs = Math.max(...data.map((d) => d.subscriptions), 1)

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-medium text-white">Subscription Activity</h3>
        <span className="text-xs text-slate-500 ml-auto">Last 30 days</span>
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
                <div className="px-2 py-1 rounded bg-[#1a1825] border border-white/10 text-xs whitespace-nowrap shadow-lg">
                  <p className="text-slate-400">{day.date}</p>
                  <p className="text-white">{day.subscriptions} subs</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-slate-600">
          {data[0]?.date.slice(5) || ''}
        </span>
        <span className="text-[10px] text-slate-600">
          {data[Math.floor(data.length / 2)]?.date.slice(5) || ''}
        </span>
        <span className="text-[10px] text-slate-600">
          {data[data.length - 1]?.date.slice(5) || ''}
        </span>
      </div>

      {/* Summary row */}
      <div className="flex gap-6 mt-4 pt-3 border-t border-white/[0.06]">
        <div>
          <p className="text-xs text-slate-500">Total Subs (30d)</p>
          <p className="text-sm font-medium text-white">
            {data.reduce((sum, d) => sum + d.subscriptions, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Tips (30d)</p>
          <p className="text-sm font-medium text-white">
            {data.reduce((sum, d) => sum + d.tips, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Peak Day</p>
          <p className="text-sm font-medium text-white">
            {Math.max(...data.map((d) => d.subscriptions))} subs
          </p>
        </div>
      </div>
    </div>
  )
}
