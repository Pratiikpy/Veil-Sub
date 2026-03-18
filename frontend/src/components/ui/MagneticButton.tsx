'use client'

import { useRef, useCallback, useEffect, useState, type ReactNode } from 'react'

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  strength?: number
  as?: 'button' | 'a' | 'div'
  onClick?: () => void
  href?: string
}

export default function MagneticButton({
  children,
  className = '',
  strength = 0.3,
  as = 'button',
  onClick,
  href,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || window.matchMedia('(hover: none)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!isTouch && !reducedMotion) setEnabled(true)
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!enabled || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 60) return
    const tx = Math.max(-3, Math.min(3, dx * strength))
    const ty = Math.max(-3, Math.min(3, dy * strength))
    ref.current.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
  }, [enabled, strength])

  const onMouseLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'translate3d(0,0,0)'
  }, [])

  // Wrap in a div to avoid polymorphic ref issues, render the semantic element inside
  const inner = as === 'a'
    ? <a href={href} onClick={onClick} className="contents">{children}</a>
    : as === 'button'
    ? <button onClick={onClick} className="contents">{children}</button>
    : <>{children}</>

  return (
    <div
      ref={ref}
      className={`${className} inline-block transition-transform duration-300 ease-out`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={as === 'div' ? onClick : undefined}
    >
      {inner}
    </div>
  )
}
