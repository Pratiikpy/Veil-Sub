'use client'

import { useEffect, useRef, useState } from 'react'
import { m, useInView } from 'framer-motion'

// Extracted static styles to prevent re-renders
const DIGIT_CONTAINER_STYLE = { height: '1em', lineHeight: 1 } as const
const DIGIT_LINE_HEIGHT_STYLE = { lineHeight: 1 } as const
const DIGIT_HEIGHT_STYLE = { height: '1em' } as const

interface Props {
  end: number
  prefix?: string
  suffix?: string
  className?: string
  duration?: number
}

function Digit({ value, duration, reduceMotion }: { value: number; duration: number; reduceMotion: boolean }) {
  // If user prefers reduced motion, show final value immediately without animation
  if (reduceMotion) {
    return (
      <span className="inline-block" style={DIGIT_CONTAINER_STYLE}>
        {value}
      </span>
    )
  }

  return (
    <span className="inline-block overflow-hidden" style={DIGIT_CONTAINER_STYLE}>
      <m.span
        className="inline-flex flex-col"
        initial={{ y: 0 }}
        animate={{ y: `-${value}em` }}
        transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
        style={DIGIT_LINE_HEIGHT_STYLE}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <span key={d} className="block" style={DIGIT_HEIGHT_STYLE}>
            {d}
          </span>
        ))}
      </m.span>
    </span>
  )
}

export default function Odometer({
  end,
  prefix = '',
  suffix = '',
  className = '',
  duration = 1.6,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  const [triggered, setTriggered] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    // Check prefers-reduced-motion on mount
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mediaQuery.matches)
    // Update if user changes preference
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (isInView && !triggered) setTriggered(true)
  }, [isInView, triggered])

  // Use absolute value to handle negatives; parseInt on '-' returns NaN
  const safeEnd = Math.abs(Math.round(end))
  const digits = String(safeEnd).split('')

  return (
    <m.span
      ref={ref}
      className={`inline-flex items-baseline tabular-nums ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={triggered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {prefix && <span>{prefix}</span>}
      {end < 0 && <span>-</span>}
      {triggered
        ? digits.map((d, i) => {
            const parsed = parseInt(d, 10)
            // Skip non-numeric characters (defensive)
            if (!Number.isFinite(parsed)) return null
            return (
              <Digit
                key={`${i}-${d}`}
                value={parsed}
                duration={duration + i * 0.1}
                reduceMotion={reduceMotion}
              />
            )
          })
        : <span>{String(end)}</span>}
      {suffix && <span>{suffix}</span>}
    </m.span>
  )
}
