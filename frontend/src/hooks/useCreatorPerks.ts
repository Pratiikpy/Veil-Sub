'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_PREFIX = 'veilsub_tier_perks_'
const MAX_TIER_ID = 20

export interface CreatorPerksResult {
  /** Map of tier_id => perk strings */
  perks: Record<number, string[]>
  /** Map of tier_id => description */
  descriptions: Record<number, string>
  loading: boolean
  /** Save perks for a specific tier (writes localStorage + syncs to API) */
  savePerks: (tierId: number, perkList: string[], description?: string) => Promise<void>
}

/**
 * useCreatorPerks — Manage custom perks per tier for a creator.
 *
 * Storage strategy:
 * - localStorage is the primary/instant source (works offline, no latency)
 * - Supabase tier_perks table is secondary (cross-device persistence)
 * - On load: fetch API, merge with localStorage (localStorage wins on conflict)
 * - On save: write localStorage immediately, fire-and-forget API sync
 */
export function useCreatorPerks(creatorAddress: string | undefined): CreatorPerksResult {
  const [perks, setPerks] = useState<Record<number, string[]>>({})
  const [descriptions, setDescriptions] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!creatorAddress) {
      setPerks({})
      setDescriptions({})
      setLoading(false)
      return
    }

    const abortController = new AbortController()

    async function loadPerks() {
      // 1. Load from localStorage first (instant)
      const localPerks: Record<number, string[]> = {}
      const localDescs: Record<number, string> = {}

      if (typeof window !== 'undefined') {
        for (let i = 1; i <= MAX_TIER_ID; i++) {
          const storedPerks = localStorage.getItem(`${STORAGE_PREFIX}${creatorAddress}_${i}`)
          const storedDesc = localStorage.getItem(`${STORAGE_PREFIX}desc_${creatorAddress}_${i}`)
          if (storedPerks) {
            try { localPerks[i] = JSON.parse(storedPerks) } catch { /* ignore corrupt data */ }
          }
          if (storedDesc) {
            localDescs[i] = storedDesc
          }
        }
      }

      // 2. Fetch from API (Supabase)
      let apiPerks: Record<number, string[]> = {}
      let apiDescs: Record<number, string> = {}

      try {
        const res = await fetch(
          `/api/tiers/perks?creator=${encodeURIComponent(creatorAddress!)}`,
          { signal: abortController.signal }
        )
        if (res.ok) {
          const data = await res.json()
          for (const tier of data.tiers ?? []) {
            if (Array.isArray(tier.perks)) {
              apiPerks[tier.tier_id] = tier.perks
            }
            if (tier.description) {
              apiDescs[tier.tier_id] = tier.description
            }
          }
        }
      } catch (err) {
        // Abort is expected on unmount — don't update state
        if (err instanceof Error && err.name === 'AbortError') return
        // API unavailable — localStorage is sufficient
      }

      if (abortController.signal.aborted) return

      // 3. Merge: localStorage wins over API (more recent local edits)
      const mergedPerks: Record<number, string[]> = { ...apiPerks, ...localPerks }
      const mergedDescs: Record<number, string> = { ...apiDescs, ...localDescs }

      setPerks(mergedPerks)
      setDescriptions(mergedDescs)
      setLoading(false)
    }

    loadPerks()

    return () => { abortController.abort() }
  }, [creatorAddress])

  const savePerks = useCallback(async (
    tierId: number,
    perkList: string[],
    description?: string
  ) => {
    if (!creatorAddress) return

    // Sanitize locally before saving
    const clean = perkList
      .filter((p) => typeof p === 'string' && p.trim().length > 0)
      .map((p) => p.trim().slice(0, 100))
      .slice(0, 10)

    const cleanDesc = description?.trim().slice(0, 200) || ''

    // 1. Write to localStorage immediately (instant feedback)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `${STORAGE_PREFIX}${creatorAddress}_${tierId}`,
          JSON.stringify(clean)
        )
        if (cleanDesc) {
          localStorage.setItem(
            `${STORAGE_PREFIX}desc_${creatorAddress}_${tierId}`,
            cleanDesc
          )
        } else {
          localStorage.removeItem(`${STORAGE_PREFIX}desc_${creatorAddress}_${tierId}`)
        }
      } catch { /* localStorage full or unavailable */ }
    }

    // 2. Update state immutably
    setPerks((prev) => ({ ...prev, [tierId]: clean }))
    setDescriptions((prev) => {
      if (cleanDesc) return { ...prev, [tierId]: cleanDesc }
      const next = { ...prev }
      delete next[tierId]
      return next
    })

    // 3. Fire-and-forget sync to API
    try {
      await fetch('/api/tiers/perks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_address: creatorAddress,
          tier_id: tierId,
          perks: clean,
          description: cleanDesc || undefined,
        }),
      })
    } catch {
      // Silent — localStorage is the source of truth
    }
  }, [creatorAddress])

  return { perks, descriptions, loading, savePerks }
}
