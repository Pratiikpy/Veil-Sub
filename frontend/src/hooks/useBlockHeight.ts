'use client'

import { useState, useEffect, useCallback } from 'react'

export interface BlockHeightError {
  message: string
}

export function useBlockHeight() {
  const [blockHeight, setBlockHeight] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<BlockHeightError | null>(null)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/aleo/latest/height', signal ? { signal } : undefined)
      if (!res.ok) throw new Error('Failed to fetch block height')
      const text = await res.text()
      const height = parseInt(text, 10)
      if (!isNaN(height)) {
        setBlockHeight(height)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Block height unavailable'
      setError({ message: msg })
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

  const clearError = useCallback(() => setError(null), [])

  return { blockHeight, loading, refresh, error, clearError }
}
