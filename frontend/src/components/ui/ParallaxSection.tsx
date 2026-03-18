'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface ParallaxSectionProps {
  children: React.ReactNode
  className?: string
  speed?: number
  direction?: 'up' | 'down'
}

export default function ParallaxSection({ children, className = '', speed = 0.3, direction = 'up' }: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [enabled, setEnabled] = useState(true)
  const rafId = useRef(0)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (reducedMotion || isTouch) { setEnabled(false); return }

    const onScroll = () => {
      cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(() => {
        if (!ref.current) return
        const rect = ref.current.getBoundingClientRect()
        const viewH = window.innerHeight
        const center = rect.top + rect.height / 2 - viewH / 2
        const dir = direction === 'up' ? -1 : 1
        setOffset(center * speed * dir)
      })
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener('scroll', onScroll, { passive: true })
        onScroll()
      } else {
        window.removeEventListener('scroll', onScroll)
      }
    }, { threshold: 0 })

    if (ref.current) observer.observe(ref.current)
    return () => { observer.disconnect(); window.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId.current) }
  }, [speed, direction])

  if (!enabled) return <div className={className}>{children}</div>

  return (
    <div ref={ref} className={className}>
      <div style={{ transform: `translateY(${offset}px)`, willChange: 'transform' }}>
        {children}
      </div>
    </div>
  )
}
