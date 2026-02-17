// Fire-and-forget analytics event logging.
// Called after a successful on-chain transaction to record activity in Supabase.
// Failures are silently ignored — the on-chain data is the source of truth.
export function logSubscriptionEvent(
  creatorAddress: string,
  tier: number,
  amountMicrocredits: number,
  txId?: string | null
) {
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creator_address: creatorAddress,
      tier,
      amount_microcredits: amountMicrocredits,
      tx_id: txId || null,
    }),
  }).catch(() => { /* best effort */ })
}
