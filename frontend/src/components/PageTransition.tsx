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
      initial={{ opacity: 0, filter: 'blur(8px)', y: 12 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
