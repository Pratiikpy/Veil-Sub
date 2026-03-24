'use client'

import { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Skip on touch devices or reduced motion
    const isTouch = 'ontouchstart' in window || window.matchMedia('(hover: none)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isTouch || reducedMotion) return

    setVisible(true)
    let raf: number

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY }
    }

    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.('button, a, [data-cursor="pointer"], [role="button"]')
      setHovering(!!el)
    }

    const loop = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.15
      pos.current.y += (target.current.y - pos.current.y) * 0.15
      const tx = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`
      if (dotRef.current) dotRef.current.style.transform = tx
      if (glowRef.current) glowRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      cancelAnimationFrame(raf)
    }
  }, [])

  if (!visible) return null

  return (
    <>
      {/* Spotlight glow */}
      <div
        ref={glowRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          width: 600,
          height: 600,
          marginLeft: -300,
          marginTop: -300,
          background: 'radial-gradient(circle 300px, rgba(255,255,255,0.02), transparent)',
          zIndex: 9998,
          willChange: 'transform',
        }}
      />
      {/* Cursor dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          width: hovering ? 40 : 10,
          height: hovering ? 40 : 10,
          marginLeft: hovering ? -20 : -5,
          marginTop: hovering ? -20 : -5,
          borderRadius: '50%',
          background: hovering ? 'transparent' : 'rgba(255,255,255,0.4)',
          border: hovering ? '1.5px solid rgba(255,255,255,0.25)' : 'none',
          transition: 'width 0.3s ease-out, height 0.3s ease-out, margin 0.3s ease-out, background 0.2s, border 0.2s',
          zIndex: 9999,
          willChange: 'transform',
        }}
      />
    </>
  )
}
