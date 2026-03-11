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
    // Guard against empty array to prevent divide-by-zero in modulo
    if (!placeholders.length || placeholders.length <= 1) return

    const timer = setInterval(() => {
      setIsAnimating(true)
      fadeTimerRef.current = setTimeout(() => {
        setIndex((prev) => placeholders.length > 0 ? (prev + 1) % placeholders.length : 0)
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
