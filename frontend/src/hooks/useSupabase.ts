import { useCallback } from 'react'
import { hashAddress } from '@/lib/encryption'

interface CreatorProfile {
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
  const getCreatorProfile = useCallback(async (address: string): Promise<CreatorProfile | null> => {
    try {
      const addressHashValue = await hashAddress(address)
      const res = await fetch(`/api/creators?address_hash=${addressHashValue}`)
      const { profile } = await res.json()
      return profile
    } catch {
      return null
    }
  }, [])

  const upsertCreatorProfile = useCallback(
    async (address: string, displayName?: string, bio?: string): Promise<CreatorProfile | null> => {
      try {
        const res = await fetch('/api/creators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, display_name: displayName, bio }),
        })
        const { profile } = await res.json()
        return profile
      } catch {
        return null
      }
    },
    []
  )

  const recordSubscriptionEvent = useCallback(
    async (creatorAddress: string, tier: number, amountMicrocredits: number, txId?: string) => {
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator_address: creatorAddress,
            tier,
            amount_microcredits: amountMicrocredits,
            tx_id: txId,
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
