'use client'

import { useState, useEffect, useCallback } from 'react'

export function useBlockHeight() {
  const [blockHeight, setBlockHeight] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      const res = await fetch('/api/aleo/latest/height', signal ? { signal } : undefined)
      if (!res.ok) throw new Error('Failed to fetch block height')
      const text = await res.text()
      const height = parseInt(text, 10)
      if (!isNaN(height)) {
        setBlockHeight(height)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('[useBlockHeight] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    refresh(controller.signal)
    const interval = setInterval(() => refresh(controller.signal), 60_000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [refresh])

  return { blockHeight, loading, refresh }
}
