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

export async function waitForRecordSync(
  getCreditsRecords: () => Promise<string[]>,
  setStatusMessage: (msg: string | null) => void,
): Promise<string[]> {
  for (let i = 0; i < RETRY_DELAYS.length; i++) {
    await new Promise((r) => setTimeout(r, RETRY_DELAYS[i]))
    setStatusMessage(`Syncing new records (attempt ${i + 2} of ${RETRY_DELAYS.length + 1})...`)
    try {
      const raw = await getCreditsRecords()
      const deduped = dedupeRecords(raw)
      if (deduped.length >= 2) return deduped
    } catch {
      // retry on next iteration
    }
  }
  throw new Error('Wallet has not synced new records after split. Please close and try again in a minute.')
}
