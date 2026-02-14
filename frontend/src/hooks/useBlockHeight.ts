'use client'

import { useState, useEffect, useCallback } from 'react'

export function useBlockHeight() {
  const [blockHeight, setBlockHeight] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/aleo/latest/height')
      if (!res.ok) throw new Error('Failed to fetch block height')
      const text = await res.text()
      const height = parseInt(text, 10)
      if (!isNaN(height)) {
        setBlockHeight(height)
      }
    } catch (err) {
      console.error('[useBlockHeight] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { blockHeight, loading, refresh }
}
