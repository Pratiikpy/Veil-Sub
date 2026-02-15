'use client'

import { useState, useCallback } from 'react'
import { PROGRAM_ID } from '@/lib/config'
import { CreatorProfile } from '@/types'

async function fetchMapping(
  mapping: string,
  key: string
): Promise<number | null> {
  try {
    const res = await fetch(
      `/api/aleo/program/${encodeURIComponent(PROGRAM_ID)}/mapping/${encodeURIComponent(mapping)}/${encodeURIComponent(key)}`
    )
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text === 'null' || text === '') return null
    // Response is like "5000000u64" or "\"5000000u64\"" or "100u128"
    const cleaned = text.replace(/"/g, '').replace(/u(8|16|32|64|128)$/, '').trim()
    const parsed = parseInt(cleaned, 10)
    return isNaN(parsed) ? null : parsed
  } catch {
    return null
  }
}

export function useCreatorStats() {
  const [loading, setLoading] = useState(false)

  const fetchCreatorStats = useCallback(
    async (creatorAddress: string): Promise<CreatorProfile> => {
      setLoading(true)
      try {
        const [tierPrice, subscriberCount, totalRevenue, contentCount] = await Promise.all([
          fetchMapping('tier_prices', creatorAddress),
          fetchMapping('subscriber_count', creatorAddress),
          fetchMapping('total_revenue', creatorAddress),
          fetchMapping('content_count', creatorAddress),
        ])

        return {
          address: creatorAddress,
          tierPrice,
          subscriberCount: subscriberCount ?? 0,
          totalRevenue: totalRevenue ?? 0,
          contentCount: contentCount ?? 0,
        }
      } catch {
        return {
          address: creatorAddress,
          tierPrice: null,
          subscriberCount: 0,
          totalRevenue: 0,
          contentCount: 0,
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { fetchCreatorStats, loading }
}
