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
  default:
    'bg-[#111113] border border-[rgba(255,255,255,0.06)] shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.03)]',
  heavy:
    'bg-[#0c0c0e] border border-[rgba(255,255,255,0.08)] shadow-[0_2px_4px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.04)]',
  light:
    'bg-[#18181b] border border-[rgba(255,255,255,0.05)] shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
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
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-[24px] ${variantClasses[variant]} p-8 h-full transition-all duration-300 ${
        hover
          ? 'hover:border-[rgba(255,255,255,0.1)] hover:bg-[#151517] hover:shadow-[0_4px_8px_rgba(0,0,0,0.4),0_16px_48px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.06)] hover:-translate-y-1'
          : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  )
}
