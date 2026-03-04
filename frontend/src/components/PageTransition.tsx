'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Props {
  children: ReactNode
  className?: string
}

export default function PageTransition({ children, className = '' }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
