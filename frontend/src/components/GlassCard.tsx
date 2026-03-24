'use client'

import { memo, ReactNode } from 'react'

type Variant = 'default' | 'heavy' | 'light' | 'accent'

interface Props {
  children: ReactNode
  className?: string
  shimmer?: boolean
  hover?: boolean
  delay?: number
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  default:
    'glass hover:border-border-hover',
  heavy:
    'bg-surface-1/80 backdrop-blur-xl border border-border hover:border-border-hover',
  light:
    'bg-surface-1/60 backdrop-blur-lg border border-border/75 hover:border-glass-hover',
  accent:
    'glass hover:border-white/12 hover:shadow-accent-lg',
}

// Extracted static styles to prevent re-renders
const TOP_EDGE_GRADIENT_STYLE = {
  background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.08) 50%, transparent 90%)',
} as const

const SHIMMER_GRADIENT_STYLE = {
  background:
    'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)',
} as const

export default memo(function GlassCard({
  children,
  className = '',
  shimmer = false,
  hover = true,
  // delay is kept for API compatibility but no longer used since animations are disabled
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delay = 0,
  variant = 'default',
}: Props) {
  return (
    <div
      className={`group relative rounded-2xl ${variantClasses[variant]} p-8 h-full transition-all duration-300 ${
        hover ? 'hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {/* Top-edge highlight — Liquid Glass inspired depth cue */}
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-2xl pointer-events-none"
        style={TOP_EDGE_GRADIENT_STYLE}
      />
      {shimmer && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={SHIMMER_GRADIENT_STYLE}
          />
        </div>
      )}
      {children}
    </div>
  )
})
