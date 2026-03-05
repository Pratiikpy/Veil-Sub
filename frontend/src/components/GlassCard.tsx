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
  default: 'bg-[#0a0a0a] border border-white/[0.08]',
  heavy:   'bg-[#080808] border border-white/[0.10]',
  light:   'bg-[#0e0e0e] border border-white/[0.06]',
}

export default function GlassCard({
  children,
  className = '',
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
      className={`rounded-3xl ${variantClasses[variant]} p-8 h-full transition-all duration-300 ${
        hover
          ? 'hover:border-white/[0.15] hover:-translate-y-0.5'
          : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  )
}
