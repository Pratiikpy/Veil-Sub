'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

type Variant = 'default' | 'heavy' | 'light'

interface Props {
  children: ReactNode
  className?: string
  shimmer?: boolean
  hover?: boolean
  delay?: number
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]',
  heavy: 'bg-[#02040a]/80 backdrop-blur-2xl border border-white/[0.08] shadow-2xl',
  light: 'bg-white/[0.02] backdrop-blur-lg border border-white/[0.05]',
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
      className={`relative group rounded-2xl overflow-hidden ${className}`}
    >
      {/* Shimmer border effect */}
      {shimmer && (
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-transparent via-violet-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 shimmer-border" />
      )}

      {/* Card content */}
      <div
        className={`relative rounded-2xl ${variantClasses[variant]} p-6 h-full transition-all duration-300 ${
          hover
            ? 'hover:bg-white/[0.05] hover:border-white/[0.12] hover:shadow-[0_0_20px_rgba(255,255,255,0.04)]'
            : ''
        }`}
      >
        {children}
      </div>
    </motion.div>
  )
}
