'use client'

import { useState, useCallback } from 'react'
import { DEPLOYED_PROGRAM_ID, getCreatorHash } from '@/lib/config'
import type { CreatorProfile } from '@/types'

export interface CreatorStatsError {
  message: string
  code?: number
}

// Module-level cache for Aleo mapping lookups — prevents duplicate fetches
// within the same page session and protects against API rate limits.
const mappingCache = new Map<string, { data: number | null; timestamp: number }>()
const MAPPING_CACHE_TTL = 30_000 // 30 seconds

async function fetchMapping(
  mapping: string,
  key: string
): Promise<number | null> {
  const cacheKey = `${mapping}:${key}`
  const cached = mappingCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < MAPPING_CACHE_TTL) {
    return cached.data
  }

  try {
    const res = await fetch(
      `/api/aleo/program/${encodeURIComponent(DEPLOYED_PROGRAM_ID)}/mapping/${encodeURIComponent(mapping)}/${encodeURIComponent(key)}`
    )
    if (!res.ok) {
      mappingCache.set(cacheKey, { data: null, timestamp: Date.now() })
      return null
    }
    const text = await res.text()
    if (!text || text === 'null' || text === '') {
      mappingCache.set(cacheKey, { data: null, timestamp: Date.now() })
      return null
    }
    // Response is like "5000000u64" or "\"5000000u64\"" or "100u128"
    const cleaned = text.replace(/"/g, '').replace(/u(8|16|32|64|128)$/, '').trim()
    const parsed = parseInt(cleaned, 10)
    const result = isNaN(parsed) ? null : parsed
    mappingCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch {
    return null
  }
}

export function useCreatorStats() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<CreatorStatsError | null>(null)

  const fetchCreatorStats = useCallback(
    async (creatorAddress: string): Promise<CreatorProfile> => {
      setLoading(true)
      setError(null)
      try {
        // v24+: All on-chain mappings use Poseidon2(address) as key, not raw address
        const creatorHash = getCreatorHash(creatorAddress)

        let tierPrice: number | null = null
        let subscriberCount = 0
        let totalRevenue = 0
        let contentCount = 0
        let tierCount: number | undefined

        if (creatorHash) {
          // Known creator — query on-chain mappings with Poseidon2 hash
          const [tp, sc, tr, cc, tc] = await Promise.all([
            fetchMapping('tier_prices', creatorHash),
            fetchMapping('subscriber_count', creatorHash),
            fetchMapping('total_revenue', creatorHash),
            fetchMapping('content_count', creatorHash),
            fetchMapping('tier_count', creatorHash),
          ])
          tierPrice = tp
          subscriberCount = sc ?? 0
          totalRevenue = tr ?? 0
          contentCount = cc ?? 0
          tierCount = tc ?? undefined
        }
        // If hash unknown, stats remain at 0 (graceful degradation)

        // Custom tier details are now handled by useCreatorTiers hook.
        // This hook only returns tierCount (from on-chain) for stats display.

        return {
          address: creatorAddress,
          tierPrice,
          subscriberCount,
          totalRevenue,
          contentCount,
          tierCount,
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch creator stats'
        setError({ message: msg })
        return {
          address: creatorAddress,
          tierPrice: null,
          subscriberCount: 0,
          totalRevenue: 0,
          contentCount: 0,
          tierCount: undefined,
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => setError(null), [])

  return { fetchCreatorStats, loading, error, clearError }
}
