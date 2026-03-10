import { computeWalletHash } from '@/lib/utils'

// Fire-and-forget analytics event logging.
// Called after a successful on-chain transaction to record activity in Supabase.
// Failures are silently ignored — the on-chain data is the source of truth.
//
// Requires wallet auth: walletHash (server-salted) + timestamp + signature.
// The signFn should be the wallet adapter's signMessage function.
export function logSubscriptionEvent(
  creatorAddress: string,
  tier: number,
  amountMicrocredits: number,
  txId?: string | null,
  signFn?: ((msg: Uint8Array) => Promise<Uint8Array>) | null
) {
  const timestamp = Date.now()

  // Build auth payload asynchronously, then fire the request
  ;(async () => {
    try {
      const walletHash = await computeWalletHash(creatorAddress)

      let signature: string | undefined
      if (signFn) {
        try {
          const msg = new TextEncoder().encode(`veilsub:analytics:${creatorAddress}:${timestamp}`)
          const sigBytes = await signFn(msg)
          let binary = ''
          for (let i = 0; i < sigBytes.length; i++) {
            binary += String.fromCharCode(sigBytes[i])
          }
          signature = btoa(binary)
        } catch {
          // Wallet signing failed — request will be rejected by server (acceptable for best-effort analytics)
        }
      }

      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_address: creatorAddress,
          tier,
          amount_microcredits: amountMicrocredits,
          tx_id: txId || null,
          walletHash,
          timestamp,
          signature,
        }),
      })
    } catch {
      // best effort — on-chain data is the source of truth
    }
  })()
}
