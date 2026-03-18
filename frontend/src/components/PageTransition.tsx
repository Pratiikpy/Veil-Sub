'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { pageVariants, pageTransition } from '@/lib/motion'

interface Props {
  children: ReactNode
  className?: string
}

export default function PageTransition({ children, className = '' }: Props) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  )
}
