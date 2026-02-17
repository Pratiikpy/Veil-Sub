/**
 * Shared utility for waiting until the wallet syncs new records after a split.
 * Uses an exponential backoff retry loop instead of a single 2s wait.
 */

const RETRY_DELAYS = [3000, 5000, 8000, 12000, 15000]

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
    setStatusMessage(`Syncing new records (attempt ${i + 2} of ${RETRY_DELAYS.length + 1})...`)
    try {
      const raw = await getCreditsRecords()
      let deduped = dedupeRecords(raw)

      // Exclude records that were consumed by the split but the wallet
      // hasn't marked as spent yet
      if (excludeNonces && excludeNonces.size > 0) {
        deduped = deduped.filter((r) => {
          const nonce = extractNonce(r)
          return !excludeNonces.has(nonce)
        })
      }

      if (deduped.length >= 2) return deduped
    } catch {
      // retry on next iteration
    }
  }
  throw new Error('Wallet has not synced new records after split. Please close and try again in a minute.')
}
