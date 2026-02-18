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
  default: 'bg-[#0a0a10]/60 backdrop-blur-2xl border border-white/[0.10] shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
  heavy: 'bg-[#02040a]/80 backdrop-blur-2xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
  light: 'bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
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

      {/* Hover shine sweep — subtle light sweep across card */}
      {hover && (
        <div className="absolute inset-0 rounded-2xl -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent transition-transform duration-700 ease-in-out pointer-events-none" />
      )}

      {/* Card content */}
      <div
        className={`relative rounded-2xl ${variantClasses[variant]} p-6 h-full transition-all duration-300 ${
          hover
            ? 'hover:bg-[#0a0a10]/70 hover:border-white/[0.18] hover:shadow-[0_8px_32px_rgba(0,0,0,0.45)]'
            : ''
        }`}
      >
        {children}
      </div>
    </motion.div>
  )
}
