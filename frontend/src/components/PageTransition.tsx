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
      initial={{ opacity: 0, filter: 'blur(10px)', y: 20, scale: 0.98 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', y: -10, scale: 0.98 }}
      transition={{ type: 'spring', bounce: 0.15, duration: 0.7 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
