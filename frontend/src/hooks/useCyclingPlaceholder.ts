'use client'

import { useState, useEffect, useRef } from 'react'

export function useCyclingPlaceholder(
  placeholders: string[],
  interval = 4000
) {
  const [index, setIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (placeholders.length <= 1) return

    const timer = setInterval(() => {
      setIsAnimating(true)
      fadeTimerRef.current = setTimeout(() => {
        setIndex((prev) => (prev + 1) % placeholders.length)
        setIsAnimating(false)
      }, 300)
    }, interval)

    return () => {
      clearInterval(timer)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [placeholders.length, interval])

  return {
    placeholder: placeholders[index] ?? '',
    isAnimating,
  }
}
