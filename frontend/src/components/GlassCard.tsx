'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

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
    'bg-[#0a0a0a]/70 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15]',
  heavy:
    'bg-[#080808]/80 backdrop-blur-xl border border-white/[0.10] hover:border-white/[0.18]',
  light:
    'bg-[#0e0e0e]/60 backdrop-blur-lg border border-white/[0.06] hover:border-white/[0.12]',
  accent:
    'bg-[#0a0a0a]/70 backdrop-blur-xl border border-violet-500/[0.12] hover:border-violet-500/[0.25] hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]',
}

export default function GlassCard({
  children,
  className = '',
  shimmer = false,
  hover = true,
  delay = 0,
  variant = 'default',
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className={`relative rounded-3xl ${variantClasses[variant]} p-8 h-full transition-all duration-300 ${
        hover ? 'hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {/* Shimmer shine effect */}
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
    </motion.div>
  )
}
