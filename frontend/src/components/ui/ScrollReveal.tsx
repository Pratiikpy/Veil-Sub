'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  distance?: number
  once?: boolean
}

const transforms: Record<string, (d: number) => string> = {
  up: (d) => `translateY(${d}px)`,
  down: (d) => `translateY(${-d}px)`,
  left: (d) => `translateX(${d}px)`,
  right: (d) => `translateX(${-d}px)`,
}

export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  distance = 20,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) { setVisible(true); return }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) { setVisible(true); if (once) obs.disconnect() }
        else if (!once) setVisible(false)
      },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [once])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(0,0)' : transforms[direction](distance),
        transition: `opacity 400ms ease-out ${delay}ms, transform 400ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}
