'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  maxTilt?: number
  glare?: boolean
  scale?: number
}

export default function TiltCard({ children, className = '', maxTilt = 5, glare = false, scale = 1.02 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({})
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || isTouch || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setStyle({
      transform: `perspective(1000px) rotateX(${-y * maxTilt}deg) rotateY(${x * maxTilt}deg) scale(${scale})`,
      transition: 'transform 100ms ease-out',
    })
    if (glare) {
      setGlareStyle({
        background: `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.15), transparent 60%)`,
        opacity: 1,
      })
    }
  }, [reducedMotion, isTouch, maxTilt, scale, glare])

  const handleLeave = useCallback(() => {
    setStyle({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)', transition: 'transform 500ms ease-out' })
    if (glare) setGlareStyle({ opacity: 0, transition: 'opacity 500ms ease-out' })
  }, [glare])

  if (reducedMotion || isTouch) {
    return <div className={className}>{children}</div>
  }

  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} className={className} style={{ ...style, willChange: 'transform' }}>
      {children}
      {glare && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] z-10"
          style={{ ...glareStyle, transition: glareStyle.transition || 'opacity 100ms ease-out' }}
        />
      )}
    </div>
  )
}
