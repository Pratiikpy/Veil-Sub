import { useCallback, useState } from 'react'
import { hashAddress } from '@/lib/encryption'
import { computeWalletHash } from '@/lib/utils'

interface SupabaseCreatorProfile {
  address_hash: string
  creator_hash: string | null
  display_name: string | null
  bio: string | null
  category: string | null
  image_url: string | null
  cover_url: string | null
  created_at: string
}

interface SubscriptionEvent {
  tier: number
  amount_microcredits: number
  tx_id: string | null
  created_at: string
}

export interface SupabaseError {
  operation: 'getProfile' | 'upsertProfile' | 'recordEvent' | 'getEvents'
  message: string
  code?: number
}

export function useSupabase() {
  const [error, setError] = useState<SupabaseError | null>(null)
  const getCreatorProfile = useCallback(async (address: string): Promise<SupabaseCreatorProfile | null> => {
    setError(null)
    try {
      const addressHashValue = await hashAddress(address)
      const res = await fetch(`/api/creators?address_hash=${addressHashValue}`)
      if (!res.ok) {
        setError({ operation: 'getProfile', message: 'Failed to fetch profile', code: res.status })
        return null
      }
      const { profile } = await res.json()
      return profile ?? null
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error fetching profile'
      setError({ operation: 'getProfile', message: msg })
      return null
    }
  }, [])

  const upsertCreatorProfile = useCallback(
    async (
      address: string,
      displayName?: string,
      bio?: string,
      signMessage?: ((msg: Uint8Array) => Promise<Uint8Array | undefined>) | null,
      creatorHash?: string,
      category?: string,
      imageUrl?: string,
      coverUrl?: string,
    ): Promise<SupabaseCreatorProfile | null> => {
      setError(null)
      try {
        const timestamp = Date.now()
        let signature: string | undefined
        if (signMessage) {
          try {
            const msg = new TextEncoder().encode(`veilsub:profile:${timestamp}`)
            const sig = await signMessage(msg)
            if (sig) {
              signature = btoa(String.fromCharCode(...sig))
            }
          } catch {
            // If signing fails, try without (will fail server-side with 403)
          }
        }
        const res = await fetch('/api/creators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, display_name: displayName, bio, creator_hash: creatorHash, signature, timestamp, category, image_url: imageUrl, cover_url: coverUrl }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          const errMsg = errData.error || `Server returned ${res.status}`
          console.error('[useSupabase] upsertProfile failed:', res.status, errMsg)
          setError({ operation: 'upsertProfile', message: errMsg, code: res.status })
          return null
        }
        const data = await res.json()
        return data.profile ?? null
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error saving profile'
        setError({ operation: 'upsertProfile', message: msg })
        return null
      }
    },
    []
  )

  const recordSubscriptionEvent = useCallback(
    async (
      creatorAddress: string,
      tier: number,
      amountMicrocredits: number,
      txId?: string,
      signMessage?: ((msg: Uint8Array) => Promise<Uint8Array>) | null
    ) => {
      try {
        const timestamp = Date.now()
        const walletHash = await computeWalletHash(creatorAddress)
        let signature: string | undefined
        if (signMessage) {
          try {
            const msg = new TextEncoder().encode(`veilsub:analytics:${creatorAddress}:${timestamp}`)
            const sig = await signMessage(msg)
            signature = btoa(String.fromCharCode(...sig))
          } catch {
            // Analytics is best-effort
          }
        }
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator_address: creatorAddress,
            tier,
            amount_microcredits: amountMicrocredits,
            tx_id: txId,
            walletHash,
            signature,
            timestamp,
          }),
        })
      } catch {
        // Analytics recording is best-effort
      }
    },
    []
  )

  const getSubscriptionEvents = useCallback(async (address: string): Promise<SubscriptionEvent[]> => {
    setError(null)
    try {
      const addressHashValue = await hashAddress(address)
      const res = await fetch(`/api/analytics?creator_address_hash=${addressHashValue}`)
      if (!res.ok) {
        setError({ operation: 'getEvents', message: 'Failed to fetch events', code: res.status })
        return []
      }
      const { events } = await res.json()
      return events || []
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error fetching events'
      setError({ operation: 'getEvents', message: msg })
      return []
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    getCreatorProfile,
    upsertCreatorProfile,
    recordSubscriptionEvent,
    getSubscriptionEvents,
    error,
    clearError,
  }
}
