'use client'

import { useState, useCallback } from 'react'
import { Star, Trophy, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { BADGE_LEVELS, AUCTION_STATUS_LABELS } from './constants'

// ─── StarRating Component ────────────────────────────────────────────────────

export function StarRating({
  rating,
  onRate,
  size = 'md',
  interactive = true,
}: {
  rating: number
  onRate?: (r: number) => void
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
}) {
  const [hover, setHover] = useState(0)
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  const iconSize = sizeMap[size]

  return (
    <div className="inline-flex items-center gap-0.5" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= (hover || rating)
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={`transition-all duration-150 ${
              interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            } ${filled ? 'text-amber-400' : 'text-white/20'}`}
            onMouseEnter={() => interactive && setHover(star)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => onRate?.(star)}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star className={`${iconSize} ${filled ? 'fill-current' : ''}`} />
          </button>
        )
      })}
    </div>
  )
}

// ─── Badge Display Component ─────────────────────────────────────────────────

export function BadgeDisplay({ level }: { level: number }) {
  const badge = BADGE_LEVELS[level] || BADGE_LEVELS[0]
  if (level === 0) return null

  const colorMap: Record<string, string> = {
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    slate: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${colorMap[badge.color] || ''}`}>
      <Trophy className="w-3 h-3" aria-hidden="true" />
      {badge.label}
    </span>
  )
}

// ─── Auction Status Badge Component ──────────────────────────────────────────

export function AuctionStatusBadge({ status }: { status: number }) {
  const meta = AUCTION_STATUS_LABELS[status]
  if (!meta) return null

  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  }

  const Icon = meta.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${colorMap[meta.color]}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
  )
}

// ─── Copy to clipboard helper ────────────────────────────────────────────────

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
      title={label || 'Copy'}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {label && <span>{copied ? 'Copied' : label}</span>}
    </button>
  )
}
