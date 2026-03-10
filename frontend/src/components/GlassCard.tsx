'use client'

import { memo, ReactNode } from 'react'
import { m } from 'framer-motion'

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
    'glass hover:border-violet-500/25 hover:shadow-accent-lg',
}

export default memo(function GlassCard({
  children,
  className = '',
  shimmer = false,
  hover = true,
  delay = 0,
  variant = 'default',
}: Props) {
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className={`group relative rounded-3xl ${variantClasses[variant]} p-8 h-full transition-all duration-300 ${
        hover ? 'hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {/* Top-edge highlight — Liquid Glass inspired depth cue */}
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-3xl pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.08) 50%, transparent 90%)',
        }}
      />
      {shimmer && (
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background:
                'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)',
            }}
          />
        </div>
      )}
      {children}
    </m.div>
  )
})
