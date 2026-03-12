'use client'

import { useState, useEffect, useRef } from 'react'
import { useInView } from 'framer-motion'

interface Props {
  target: number
  duration?: number
  suffix?: string
  prefix?: string
}

export default function AnimatedCounter({
  target,
  duration = 2,
  suffix = '',
  prefix = '',
}: Props) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    // Respect prefers-reduced-motion: skip animation and show final value immediately
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setCount(target)
      return
    }

    let startTime: number | undefined
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (startTime === undefined) startTime = currentTime
      const progress = Math.min(
        (currentTime - startTime) / (duration * 1000),
        1
      )
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [target, duration, isInView])

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}
