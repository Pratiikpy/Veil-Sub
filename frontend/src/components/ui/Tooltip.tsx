'use client'

import { useState, ReactNode } from 'react'
import { m, AnimatePresence } from 'framer-motion'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom'
}

export default function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <m.span
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            transition={{ duration: 0.15 }}
            role="tooltip"
            className={`absolute left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 text-xs text-white bg-surface-3 border border-border rounded-lg shadow-lg whitespace-nowrap pointer-events-none ${
              side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            {content}
          </m.span>
        )}
      </AnimatePresence>
    </span>
  )
}
