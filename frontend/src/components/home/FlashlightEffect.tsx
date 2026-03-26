'use client'

import { useEffect, useRef } from 'react'

/**
 * Mouse-tracking radial gradient overlay that follows the cursor.
 * Desktop only — disabled on mobile/touch devices.
 * Uses violet tint to match VeilSub brand.
 */
export default function FlashlightEffect() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Skip on mobile/touch devices, SSR, or reduced motion preference
    if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      container.style.setProperty('--mouse-x', `${e.clientX}px`)
      container.style.setProperty('--mouse-y', `${e.clientY}px`)
      container.style.opacity = '1'
    }

    const handleMouseLeave = () => {
      container.style.opacity = '0'
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-10 opacity-0 transition-opacity duration-500"
      style={{
        background:
          'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(139, 92, 246, 0.04), transparent 40%)',
        '--mouse-x': '50%',
        '--mouse-y': '50%',
      } as React.CSSProperties}
    />
  )
}
