/**
 * Shared utility for waiting until the wallet syncs new records after a split.
 * Uses an exponential backoff retry loop instead of a single 2s wait.
 *
 * After a credits.aleo/split, the wallet needs time to:
 * 1. Detect the split transaction is finalized on-chain
 * 2. Mark the consumed input record as spent
 * 3. Add the two new output records to its local cache
 *
 * We use generous delays because premature record access causes
 * "input ID already exists in the ledger" rejections.
 */

const RETRY_DELAYS = [5000, 8000, 12000, 15000, 20000, 25000]

export function extractNonce(record: string): string {
  const m = record.match(/_nonce:\s*(\S+?)\.public/)
  return m?.[1] ?? record
}

export function dedupeRecords(records: string[]): string[] {
  const seen = new Set<string>()
  return records.filter((r) => {
    const nonce = extractNonce(r)
    if (seen.has(nonce)) return false
    seen.add(nonce)
    return true
  })
}

/**
 * Wait for the wallet to sync new records after a split.
 *
 * @param getCreditsRecords  Fetches all credit records from the wallet
 * @param setStatusMessage   UI status callback
 * @param excludeNonces      Nonces of records consumed by the split — these may
 *                           still appear "unspent" in the wallet's local cache,
 *                           but are already spent on-chain. MUST be excluded to
 *                           avoid "input ID already exists in the ledger" errors.
 */
export async function waitForRecordSync(
  getCreditsRecords: () => Promise<string[]>,
  setStatusMessage: (msg: string | null) => void,
  excludeNonces?: Set<string>,
): Promise<string[]> {
  for (let i = 0; i < RETRY_DELAYS.length; i++) {
    await new Promise((r) => setTimeout(r, RETRY_DELAYS[i]))
    setStatusMessage(`Syncing new records (attempt ${i + 1} of ${RETRY_DELAYS.length})...`)
    try {
      const raw = await getCreditsRecords()
      console.log(`[recordSync] Attempt ${i + 1}: got ${raw.length} raw records`)
      let deduped = dedupeRecords(raw)

      // Exclude records that were consumed by the split but the wallet
      // hasn't marked as spent yet
      if (excludeNonces && excludeNonces.size > 0) {
        deduped = deduped.filter((r) => {
          const nonce = extractNonce(r)
          const excluded = excludeNonces.has(nonce)
          if (excluded) console.log('[recordSync] Excluding stale record with nonce:', nonce)
          return !excluded
        })
      }

      console.log(`[recordSync] After dedup+exclude: ${deduped.length} records`)

      // Need at least 2 distinct records for the follow-up transaction
      if (deduped.length >= 2) {
        // Final validation: ensure first two records have distinct nonces
        const n0 = extractNonce(deduped[0])
        const n1 = extractNonce(deduped[1])
        if (n0 !== n1) {
          console.log('[recordSync] Found 2 valid records with nonces:', n0, n1)
          return deduped
        }
        console.warn('[recordSync] First two records share nonce, retrying...')
      }
    } catch (err) {
      console.warn(`[recordSync] Attempt ${i + 1} failed:`, err)
    }
  }
  throw new Error('Wallet has not synced new records after split. Please close and try again in a minute.')
}
