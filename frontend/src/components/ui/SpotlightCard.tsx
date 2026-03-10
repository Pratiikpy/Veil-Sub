'use client'

import { useRef, useState, useCallback, ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  /** Enable 3D tilt on hover */
  tilt?: boolean
  /** Max tilt angle in degrees (default 4) */
  tiltMax?: number
  /** Spotlight radius in px (default 300) */
  spotlightSize?: number
}

export default function SpotlightCard({
  children,
  className = '',
  tilt = true,
  tiltMax = 4,
  spotlightSize = 300,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0, opacity: 0 })
  const [transform, setTransform] = useState('')

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setSpotlight({ x, y, opacity: 1 })

      if (tilt) {
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateY = ((x - centerX) / centerX) * tiltMax
        const rotateX = ((centerY - y) / centerY) * tiltMax
        setTransform(`perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01,1.01,1.01)`)
      }
    },
    [tilt, tiltMax]
  )

  const handleLeave = useCallback(() => {
    setSpotlight((s) => ({ ...s, opacity: 0 }))
    setTransform('')
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`relative overflow-hidden ${className}`}
      style={{
        transform: transform || undefined,
        transition: transform ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out',
        willChange: 'transform',
      }}
    >
      {/* Cursor-following radial spotlight */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{
          opacity: spotlight.opacity,
          background: `radial-gradient(${spotlightSize}px circle at ${spotlight.x}px ${spotlight.y}px, rgba(139,92,246,0.07), transparent 70%)`,
        }}
      />
      {children}
    </div>
  )
}
