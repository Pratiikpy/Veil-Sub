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
          background: `conic-gradient(from ${angle}deg at 50% 50%, rgba(255,255,255,${opacity}) 0deg, rgba(200,200,200,${opacity}) 60deg, rgba(180,180,180,${opacity}) 120deg, rgba(220,220,220,${opacity * 0.6}) 180deg, rgba(200,200,200,${opacity}) 240deg, rgba(255,255,255,${opacity}) 300deg, rgba(200,200,200,${opacity}) 360deg)`,
          mixBlendMode: 'screen',
        }}
      />
      {/* Content */}
      <div className="relative z-[2]">{children}</div>
    </div>
  )
}
