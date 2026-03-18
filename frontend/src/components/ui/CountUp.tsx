'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
  separator?: string
}

function format(n: number, decimals: number, sep: string): string {
  const fixed = n.toFixed(decimals)
  const [int, dec] = fixed.split('.')
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
  return dec !== undefined ? `${withSep}.${dec}` : withSep
}

export default function CountUp({
  end,
  duration = 1500,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  separator = ',',
}: CountUpProps) {
  const [display, setDisplay] = useState(format(0, decimals, separator))
  const triggered = useRef(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) { setDisplay(format(end, decimals, separator)); return }

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !triggered.current) {
          triggered.current = true
          obs.disconnect()
          const start = performance.now()
          const tick = (now: number) => {
            const elapsed = now - start
            const t = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - t, 3) // cubic ease-out
            setDisplay(format(eased * end, decimals, separator))
            if (t < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [end, duration, decimals, separator])

  return (
    <span ref={ref} className={className} aria-label={`${prefix}${format(end, decimals, separator)}${suffix}`}>
      {prefix}{display}{suffix}
    </span>
  )
}
