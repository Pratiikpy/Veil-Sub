'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DEPLOYED_PROGRAM_ID, getCreatorHash, CREATOR_CUSTOM_TIERS } from '@/lib/config'
import type { CustomTierInfo } from '@/types'

export interface CreatorTierResult {
  tiers: Record<number, CustomTierInfo>
  tierCount: number
  loading: boolean
  error: string | null
  /** Re-fetch tiers from chain (bypasses cache) */
  refetch: () => void
}

// Module-level cache keyed by creator address
const tierCache = new Map<
  string,
  { tiers: Record<number, CustomTierInfo>; tierCount: number; timestamp: number }
>()
const TIER_CACHE_TTL = 60_000 // 60 seconds

/**
 * Fetch a single on-chain mapping value. Returns the raw text or null.
 */
async function fetchMappingRaw(
  mapping: string,
  key: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/aleo/program/${encodeURIComponent(DEPLOYED_PROGRAM_ID)}/mapping/${encodeURIComponent(mapping)}/${encodeURIComponent(key)}`,
      signal ? { signal } : undefined
    )
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text === 'null' || text === '') return null
    return text
  } catch (err) {
    // Re-throw AbortError to allow proper cancellation
    if (err instanceof Error && err.name === 'AbortError') {
      throw err
    }
    return null
  }
}

/**
 * Parse an on-chain numeric value like "5000u64" or "\"3u64\"" into a number.
 */
function parseOnChainNumber(raw: string | null): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/"/g, '').replace(/u(8|16|32|64|128)$/, '').trim()
  const parsed = parseInt(cleaned, 10)
  return isNaN(parsed) ? null : parsed
}

/**
 * useCreatorTiers — Dynamic on-chain tier discovery for a creator.
 *
 * On-chain mapping structure (from main.leo):
 *   tier_count: field => u64          (creator_hash => number of tiers)
 *   creator_tiers: field => u64       (Poseidon2(TierKey{creator_hash, tier_id}) => price)
 *   tier_deprecated: field => bool    (Poseidon2(TierKey{creator_hash, tier_id}) => deprecated)
 *
 * LIMITATION: The compound key Poseidon2(TierKey{creator_hash, tier_id}) cannot be computed
 * in JavaScript — it requires Leo/Aleo's native Poseidon2 circuit. Therefore:
 *
 * 1. For creators in CREATOR_HASH_MAP: we query tier_count on-chain to validate existence,
 *    and use CREATOR_CUSTOM_TIERS as the price/name source (since we can't query creator_tiers
 *    without computing the compound Poseidon2 hash).
 *
 * 2. For creators NOT in CREATOR_HASH_MAP: we cannot query any mappings. We show a
 *    "tiers pending" message — their tiers exist on-chain but need a hash mapping entry.
 *
 * 3. Fallback: CREATOR_CUSTOM_TIERS in config.ts serves as the offline/demo cache for
 *    known addresses. This is the best we can do until a server-side Poseidon2 oracle
 *    or an indexer is available.
 */
export function useCreatorTiers(creatorAddress: string): CreatorTierResult {
  const [tiers, setTiers] = useState<Record<number, CustomTierInfo>>({})
  const [tierCount, setTierCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(() => {
    // Bust cache for this address
    tierCache.delete(creatorAddress)
    setFetchKey((k) => k + 1)
  }, [creatorAddress])

  useEffect(() => {
    if (!creatorAddress) {
      setTiers({})
      setTierCount(0)
      setLoading(false)
      setError(null)
      return
    }

    // Check module-level cache first
    const cached = tierCache.get(creatorAddress)
    if (cached && Date.now() - cached.timestamp < TIER_CACHE_TTL) {
      setTiers(cached.tiers)
      setTierCount(cached.tierCount)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    let cancelled = false

    async function fetchTiers() {
      setLoading(true)
      setError(null)

      try {
        const creatorHash = getCreatorHash(creatorAddress)

        // Load tiers from localStorage (written on create — instant, no latency)
        let localTiers: Record<number, CustomTierInfo> = {}
        try {
          const stored = localStorage.getItem(`veilsub_creator_tiers_${creatorAddress}`)
          if (stored) localTiers = JSON.parse(stored)
        } catch { /* ignore */ }

        // Fetch from Supabase — cross-browser, persists for all users
        let dbTiers: Record<number, CustomTierInfo> = {}
        try {
          const res = await fetch(`/api/tiers?address=${encodeURIComponent(creatorAddress)}`, {
            signal: controller.signal,
          })
          if (res.ok) {
            const json = await res.json()
            for (const row of json.tiers ?? []) {
              dbTiers[row.tier_id] = { name: row.name, price: row.price_microcredits }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') throw err
          // Non-critical — fall through to config
        }

        if (cancelled) return

        // Priority: localStorage (most recent) > Supabase DB > hardcoded config
        const fallbackTiers: Record<number, CustomTierInfo> = {
          ...(CREATOR_CUSTOM_TIERS[creatorAddress] ?? {}),
          ...dbTiers,
          ...localTiers,
        }

        if (!creatorHash) {
          // Creator not in CREATOR_HASH_MAP — can't query on-chain mappings.
          // Use fallback if available, otherwise empty.
          if (cancelled) return
          const result = { ...fallbackTiers }
          const count = Object.keys(result).length
          setTiers(result)
          setTierCount(count)
          setLoading(false)
          if (count === 0) {
            setError(null) // Not an error — just an unknown creator
          }
          tierCache.set(creatorAddress, { tiers: result, tierCount: count, timestamp: Date.now() })
          return
        }

        // Query on-chain tier_count for this creator
        const tierCountRaw = await fetchMappingRaw('tier_count', creatorHash, controller.signal)
        if (cancelled) return

        const onChainTierCount = parseOnChainNumber(tierCountRaw) ?? 0

        if (onChainTierCount === 0 && Object.keys(fallbackTiers).length === 0) {
          // No tiers on-chain and no fallback
          setTiers({})
          setTierCount(0)
          setLoading(false)
          tierCache.set(creatorAddress, { tiers: {}, tierCount: 0, timestamp: Date.now() })
          return
        }

        // We have a confirmed tier count on-chain.
        // Now attempt to query individual tier prices.
        // Since we CAN'T compute Poseidon2(TierKey) in JS, we use fallback data
        // but validate/augment with any on-chain data we can reach.
        //
        // Strategy: Use fallback tiers as baseline, but trust on-chain tier_count
        // to know how many tiers exist. If tier_count > fallback entries, we know
        // there are undiscovered tiers.

        const resultTiers: Record<number, CustomTierInfo> = {}

        // Start with fallback data for known tiers
        for (const [idStr, info] of Object.entries(fallbackTiers)) {
          const id = Number(idStr)
          resultTiers[id] = { ...info }
        }

        // If on-chain count exceeds our fallback knowledge, add placeholder entries
        // so the UI can show "Tier X exists on-chain" even without exact price
        const knownCount = Object.keys(resultTiers).length
        if (onChainTierCount > knownCount) {
          for (let i = knownCount + 1; i <= onChainTierCount; i++) {
            if (!resultTiers[i]) {
              resultTiers[i] = {
                price: 0, // Price unknown — can't compute Poseidon2(TierKey) in JS
                name: `Tier ${i}`,
              }
            }
          }
        }

        // Query tier_deprecated status for each tier we know about.
        // We can't compute the compound key, but if the creator has a known set
        // of deprecated tier hashes, we could check them. For now, we mark all
        // fallback tiers as active (deprecated check requires Poseidon2 compound key).

        if (cancelled) return

        setTiers(resultTiers)
        setTierCount(onChainTierCount)
        setLoading(false)
        tierCache.set(creatorAddress, {
          tiers: resultTiers,
          tierCount: onChainTierCount,
          timestamp: Date.now(),
        })
      } catch (err) {
        if (cancelled) return
        // On any fetch error, fall back to config data
        const fallbackTiers = CREATOR_CUSTOM_TIERS[creatorAddress] ?? {}
        const count = Object.keys(fallbackTiers).length
        setTiers(fallbackTiers)
        setTierCount(count)
        setError(
          err instanceof Error ? err.message : 'Failed to fetch on-chain tier data'
        )
        setLoading(false)
        // Don't cache errors — allow retry
      }
    }

    fetchTiers()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [creatorAddress, fetchKey])

  return { tiers, tierCount, loading, error, refetch }
}

/**
 * Clear the tier cache for a specific address (useful after creating a tier on-chain).
 */
export function invalidateCreatorTierCache(address: string): void {
  tierCache.delete(address)
}

/**
 * Clear the entire tier cache.
 */
export function clearAllTierCache(): void {
  tierCache.clear()
}
