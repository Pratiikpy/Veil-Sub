import { useCallback } from 'react'
import { hashAddress } from '@/lib/encryption'

interface SupabaseCreatorProfile {
  address_hash: string
  display_name: string | null
  bio: string | null
  created_at: string
}

interface SubscriptionEvent {
  tier: number
  amount_microcredits: number
  tx_id: string | null
  created_at: string
}

export function useSupabase() {
  const getCreatorProfile = useCallback(async (address: string): Promise<SupabaseCreatorProfile | null> => {
    try {
      const addressHashValue = await hashAddress(address)
      const res = await fetch(`/api/creators?address_hash=${addressHashValue}`)
      if (!res.ok) return null
      const { profile } = await res.json()
      return profile ?? null
    } catch {
      return null
    }
  }, [])

  const upsertCreatorProfile = useCallback(
    async (
      address: string,
      displayName?: string,
      bio?: string,
      signMessage?: ((msg: Uint8Array) => Promise<Uint8Array>) | null
    ): Promise<SupabaseCreatorProfile | null> => {
      try {
        const timestamp = Date.now()
        let signature: string | undefined
        if (signMessage) {
          try {
            const msg = new TextEncoder().encode(`veilsub:profile:${timestamp}`)
            const sig = await signMessage(msg)
            signature = btoa(String.fromCharCode(...sig))
          } catch {
            // If signing fails, try without (will fail server-side with 403)
          }
        }
        const res = await fetch('/api/creators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, display_name: displayName, bio, signature, timestamp }),
        })
        if (!res.ok) return null
        const { profile } = await res.json()
        return profile ?? null
      } catch {
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
        let signature: string | undefined
        if (signMessage) {
          try {
            const msg = new TextEncoder().encode(`veilsub:analytics:${timestamp}`)
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
    try {
      const addressHashValue = await hashAddress(address)
      const res = await fetch(`/api/analytics?creator_address_hash=${addressHashValue}`)
      if (!res.ok) return []
      const { events } = await res.json()
      return events || []
    } catch {
      return []
    }
  }, [])

  return {
    getCreatorProfile,
    upsertCreatorProfile,
    recordSubscriptionEvent,
    getSubscriptionEvents,
  }
}
