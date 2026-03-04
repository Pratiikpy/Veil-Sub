'use client'

import { ReactNode, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface Props {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  duration?: number
}

export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  y = 40,
  duration = 0.7,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.15 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.001, y }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.001, y }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
