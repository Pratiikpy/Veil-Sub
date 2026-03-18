/**
 * Client-side creator profile cache using sessionStorage.
 *
 * Privacy rationale: When a subscriber visits /explore, we bulk-fetch ALL
 * creator profiles in one request, then cache them in the browser. Subsequent
 * navigation to /creator/[address] reads from this cache instead of making
 * individual Supabase requests. This prevents Supabase access logs from
 * revealing which specific creator a subscriber is interested in.
 *
 * sessionStorage is per-tab and cleared on tab close — good for privacy.
 */

const CACHE_KEY = 'veilsub_creator_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export interface CachedCreator {
  address: string
  display_name?: string | null
  bio?: string | null
  category?: string | null
  creator_hash?: string | null
  cached_at: number
}

interface CreatorCacheData {
  creators: Record<string, CachedCreator>
  fetched_at: number
}

function getCache(): CreatorCacheData | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data: CreatorCacheData = JSON.parse(raw)
    if (Date.now() - data.fetched_at > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

/** Retrieve a single creator profile from the client cache, or null on miss. */
export function getCachedCreator(address: string): CachedCreator | null {
  const cache = getCache()
  return cache?.creators[address] ?? null
}

/**
 * Store an array of creator profiles into the client cache.
 * Merges with existing entries so incremental fetches accumulate.
 */
export function cacheCreators(
  creators: Array<{
    address: string
    display_name?: string | null
    bio?: string | null
    category?: string | null
    creator_hash?: string | null
  }>
) {
  if (typeof sessionStorage === 'undefined') return

  const now = Date.now()
  const map: Record<string, CachedCreator> = {}
  for (const c of creators) {
    map[c.address] = { ...c, cached_at: now }
  }

  // Merge with existing cache (new entries overwrite stale ones)
  const existing = getCache()
  const merged = { ...existing?.creators, ...map }

  sessionStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      creators: merged,
      fetched_at: now,
    } satisfies CreatorCacheData)
  )
}

/** Cache a single creator profile (e.g., after an individual fetch fallback). */
export function cacheSingleCreator(creator: {
  address: string
  display_name?: string | null
  bio?: string | null
  category?: string | null
  creator_hash?: string | null
}) {
  cacheCreators([creator])
}

/** Remove all cached creator data. */
export function clearCreatorCache() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(CACHE_KEY)
  }
}
