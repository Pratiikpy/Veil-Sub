'use client'

import { Shield, Lock, AlertCircle, Clock } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'

// ---------------------------------------------------------------------------
// Radial Progress for story expiry
// ---------------------------------------------------------------------------

export function RadialProgress({
  progress,
  size = 40,
  strokeWidth = 3,
}: {
  progress: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)))

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-white/[0.06]"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={
          progress > 0.5
            ? 'text-violet-400'
            : progress > 0.2
              ? 'text-amber-400'
              : 'text-red-400'
        }
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton card
// ---------------------------------------------------------------------------

export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-3">
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Not-connected CTA
// ---------------------------------------------------------------------------

export function NotConnectedCard({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-6">
        <Lock className="w-8 h-8 text-white/60" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Wallet Required</h3>
      <p className="text-sm text-white/50 max-w-md mx-auto">{message}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Info card (warnings, missing state)
// ---------------------------------------------------------------------------

export function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof AlertCircle
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl bg-amber-500/5 border border-amber-500/10 p-6 text-center">
      <Icon className="w-8 h-8 text-amber-400/60 mx-auto mb-3" />
      <h3 className="text-sm font-medium text-amber-300 mb-1">{title}</h3>
      <p className="text-xs text-white/50">{description}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Privacy notice footer
// ---------------------------------------------------------------------------

export function PrivacyNotice({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-white/[0.01] border border-white/[0.04] px-4 py-3">
      <div className="flex items-start gap-2">
        <Shield className="w-3.5 h-3.5 text-violet-400/40 mt-0.5 shrink-0" />
        <p className="text-[11px] text-white/60 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
