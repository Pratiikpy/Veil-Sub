'use client'

import { useRef, useCallback, useState } from 'react'

interface IridescentCardProps {
  children: React.ReactNode
  className?: string
  intensity?: number
}

export default function IridescentCard({ children, className = '', intensity = 0.15 }: IridescentCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [angle, setAngle] = useState(0)

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setAngle(Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 180)
  }, [])

  const opacity = Math.max(0.05, Math.min(intensity, 0.2))

  return (
    <div ref={ref} onMouseMove={handleMove} className={`relative overflow-hidden ${className}`}>
      {/* Iridescent overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] z-[1] transition-opacity duration-500"
        style={{
          background: `conic-gradient(from ${angle}deg at 50% 50%, rgba(139,92,246,${opacity}) 0deg, rgba(59,130,246,${opacity}) 60deg, rgba(16,185,129,${opacity}) 120deg, rgba(234,179,8,${opacity * 0.6}) 180deg, rgba(236,72,153,${opacity}) 240deg, rgba(139,92,246,${opacity}) 300deg, rgba(59,130,246,${opacity}) 360deg)`,
          mixBlendMode: 'screen',
        }}
      />
      {/* Content */}
      <div className="relative z-[2]">{children}</div>
    </div>
  )
}
