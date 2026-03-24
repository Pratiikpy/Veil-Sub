'use client'

import { useEffect, useState, useRef } from 'react'

/**
 * Thin violet progress bar fixed at top of viewport.
 * Only visible when the page content is taller than 2x the viewport height.
 * Uses requestAnimationFrame for smooth updates.
 */
export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const rafRef = useRef(0)

  useEffect(() => {
    const update = () => {
      const docH = document.documentElement.scrollHeight
      const winH = window.innerHeight
      const isLong = docH > winH * 2
      setVisible(isLong)
      if (isLong) {
        setProgress(Math.min(100, (window.scrollY / (docH - winH)) * 100))
      }
    }

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[2px] z-[9998] pointer-events-none"
    >
      <div
        className="h-full bg-violet-500 transition-[width] duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
