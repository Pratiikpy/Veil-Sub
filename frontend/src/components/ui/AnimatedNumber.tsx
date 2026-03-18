'use client'

import { useEffect, useRef, useState, useMemo } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
  decimals?: number
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const h = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return reduced
}

function DigitColumn({ digit, delay, duration }: { digit: number; delay: number; duration: number }) {
  return (
    <span className="inline-block h-[1em] overflow-hidden relative align-top" aria-hidden="true">
      <span
        className="inline-flex flex-col"
        style={{
          transform: `translateY(${-digit * 10}%)`,
          transition: `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="block h-[1em] leading-[1em] text-center">{i}</span>
        ))}
      </span>
    </span>
  )
}

export default function AnimatedNumber({
  value,
  duration = 800,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0,
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const formatted = useMemo(() => {
    const abs = Math.abs(value)
    const fixed = abs.toFixed(decimals)
    const [intPart, decPart] = fixed.split('.')
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return { negative: value < 0, display: decPart ? `${withCommas}.${decPart}` : withCommas }
  }, [value, decimals])

  const chars = (formatted.negative ? '-' : '') + formatted.display

  // Screen reader gets the real value
  const srText = `${prefix}${formatted.negative ? '-' : ''}${formatted.display}${suffix}`

  if (reducedMotion || !visible) {
    return (
      <span ref={ref} className={className} aria-label={srText}>
        {visible ? srText : '\u00A0'}
      </span>
    )
  }

  const digitCount = chars.replace(/[^0-9]/g, '').length

  let digitIndex = 0
  return (
    <span ref={ref} className={className} aria-label={srText} role="text">
      {prefix && <span>{prefix}</span>}
      {chars.split('').map((ch, i) => {
        if (ch >= '0' && ch <= '9') {
          const idx = digitIndex++
          const delay = (digitCount - 1 - idx) * 40
          return <DigitColumn key={`${i}-${ch}`} digit={parseInt(ch)} delay={delay} duration={duration} />
        }
        return <span key={i}>{ch}</span>
      })}
      {suffix && <span>{suffix}</span>}
    </span>
  )
}
