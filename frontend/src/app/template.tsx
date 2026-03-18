'use client'

import { m } from 'framer-motion'
import { ReactNode } from 'react'
import { spring } from '@/lib/motion'

export default function Template({ children }: { children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.gentle}
    >
      {children}
    </m.div>
  )
}
