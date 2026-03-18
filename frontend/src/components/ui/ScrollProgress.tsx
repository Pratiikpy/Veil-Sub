'use client'

import { useEffect, useState } from 'react'

interface ScrollProgressProps {
  color?: string
  height?: number
}

export default function ScrollProgress({ color = '#8B5CF6', height = 2 }: ScrollProgressProps) {
  const [progress, setProgress] = useState(0)
  const [scrollable, setScrollable] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      const docH = document.documentElement.scrollHeight
      const winH = window.innerHeight
      const canScroll = docH > winH + 1
      setScrollable(canScroll)
      if (canScroll) setProgress((window.scrollY / (docH - winH)) * 100)
    }
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [])

  if (!scrollable) return null

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, height, zIndex: 9999, pointerEvents: 'none' }}
    >
      <div style={{ height: '100%', width: `${progress}%`, background: color, transition: 'width 100ms linear' }} />
    </div>
  )
}
