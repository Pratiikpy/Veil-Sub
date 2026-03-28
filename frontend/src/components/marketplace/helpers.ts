import { ALEO_API, MARKETPLACE_PROGRAM_ID } from './constants'
import type { StoredBid } from './constants'

// ─── Shared Auction Registry ─────────────────────────────────────────────────
// Auctions are saved to a global registry keyed by slot ID so that ANY user
// browsing the marketplace can discover them — not just the creator.

export interface SharedAuction {
  slotId: string
  auctionId?: string // On-chain Poseidon2 auction ID (extracted from TX output)
  label: string
  creatorAddress: string
  txId: string
  timestamp: number
}

const SHARED_AUCTIONS_KEY = 'veilsub_shared_auctions'

export function saveSharedAuction(auction: SharedAuction): void {
  if (typeof window === 'undefined') return
  try {
    const existing = JSON.parse(localStorage.getItem(SHARED_AUCTIONS_KEY) || '[]') as SharedAuction[]
    // Deduplicate by slotId + creatorAddress
    const filtered = existing.filter(
      a => !(a.slotId === auction.slotId && a.creatorAddress === auction.creatorAddress)
    )
    filtered.push(auction)
    localStorage.setItem(SHARED_AUCTIONS_KEY, JSON.stringify(filtered))
  } catch { /* localStorage unavailable */ }
}

/** Update the auctionId on an existing shared auction entry (called after TX confirms). */
export function updateSharedAuctionId(slotId: string, creatorAddress: string, auctionId: string): void {
  if (typeof window === 'undefined') return
  try {
    const existing = JSON.parse(localStorage.getItem(SHARED_AUCTIONS_KEY) || '[]') as SharedAuction[]
    const updated = existing.map(a =>
      a.slotId === slotId && a.creatorAddress === creatorAddress
        ? { ...a, auctionId }
        : a
    )
    localStorage.setItem(SHARED_AUCTIONS_KEY, JSON.stringify(updated))
  } catch { /* localStorage unavailable */ }
}

export function getSharedAuctions(): SharedAuction[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(SHARED_AUCTIONS_KEY) || '[]') as SharedAuction[]
  } catch { return [] }
}

// ─── LocalStorage helpers ────────────────────────────────────────────────────

export function saveBidToStorage(bid: StoredBid): void {
  if (typeof window === 'undefined') return
  try {
    const key = 'veilsub_marketplace_bids'
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as StoredBid[]
    const filtered = existing.filter(b => b.auctionId !== bid.auctionId)
    filtered.push(bid)
    localStorage.setItem(key, JSON.stringify(filtered))
  } catch { /* localStorage unavailable */ }
}

export function getBidsFromStorage(): StoredBid[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('veilsub_marketplace_bids') || '[]') as StoredBid[]
  } catch { return [] }
}

export function removeBidFromStorage(auctionId: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = 'veilsub_marketplace_bids'
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as StoredBid[]
    const filtered = existing.filter(b => b.auctionId !== auctionId)
    localStorage.setItem(key, JSON.stringify(filtered))
  } catch { /* localStorage unavailable */ }
}

export function saveAuctionToStorage(slotId: string, label: string, auctionId?: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = 'veilsub_marketplace_auctions'
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as { id: string; label: string; slotId?: string; auctionId?: string }[]
    // Store using the on-chain auctionId as primary key if available, fall back to slotId
    const primaryId = auctionId || slotId
    if (!existing.some(a => a.id === primaryId)) {
      existing.push({ id: primaryId, label, slotId, auctionId })
      localStorage.setItem(key, JSON.stringify(existing))
    }
  } catch { /* localStorage unavailable */ }
}

/** Update the auctionId on an existing stored auction (called after TX output parsing). */
export function updateAuctionStorageWithId(slotId: string, auctionId: string, label?: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = 'veilsub_marketplace_auctions'
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as { id: string; label: string; slotId?: string; auctionId?: string }[]

    // Remove old entry keyed by slotId (if any)
    const filtered = existing.filter(a => a.id !== slotId && a.slotId !== slotId)

    // Add/update entry with real auctionId
    const existingWithId = filtered.find(a => a.id === auctionId || a.auctionId === auctionId)
    if (!existingWithId) {
      filtered.push({
        id: auctionId,
        label: label || `Auction ${auctionId.slice(0, 12)}...`,
        slotId,
        auctionId,
      })
    }
    localStorage.setItem(key, JSON.stringify(filtered))
  } catch { /* localStorage unavailable */ }
}

export function getAuctionsFromStorage(): { id: string; label: string; slotId?: string; auctionId?: string }[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('veilsub_marketplace_auctions') || '[]')
  } catch { return [] }
}

// ─── Generate cryptographic salt ─────────────────────────────────────────────

export function generateSalt(): string {
  const array = new Uint8Array(31) // 31 bytes fits in a field element
  crypto.getRandomValues(array)
  let num = BigInt(0)
  for (let i = 0; i < array.length; i++) {
    num = (num << BigInt(8)) | BigInt(array[i])
  }
  return `${num}field`
}

// ─── Mapping query helper ────────────────────────────────────────────────────

export async function queryMapping(mapping: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${ALEO_API}/program/${encodeURIComponent(MARKETPLACE_PROGRAM_ID)}/mapping/${encodeURIComponent(mapping)}/${encodeURIComponent(key)}`
    )
    if (!res.ok) return null
    const text = await res.text()
    const cleaned = text.replace(/^"|"$/g, '').trim()
    if (cleaned === 'null' || cleaned === '') return null
    return cleaned
  } catch {
    return null
  }
}

// ─── Parse on-chain values ───────────────────────────────────────────────────

export function parseU64(raw: string | null): number {
  if (!raw) return 0
  const cleaned = raw.replace(/"/g, '').replace(/u\d+$/, '').trim()
  return parseInt(cleaned, 10) || 0
}

export function parseU8(raw: string | null): number {
  if (!raw) return 0
  const cleaned = raw.replace(/"/g, '').replace(/u\d+$/, '').trim()
  return parseInt(cleaned, 10) || 0
}

// ─── Auction ID Extraction from Transaction Outputs ─────────────────────────
// The on-chain create_auction transition computes:
//   auction_id = Poseidon2(creator_hash + content_slot_id + DOMAIN_SEP)
// This value is NOT available in JavaScript (Poseidon2 is a ZK-circuit hash).
// Instead, we extract the auction_id from the confirmed transaction outputs
// on the Provable API, following the same pattern Obscura uses.
//
// The transition passes auction_id as the first finalize argument, which
// appears in the future output's arguments array.

/**
 * Extract a field value (auction_id) from a transition's outputs.
 * Checks both public outputs and future arguments.
 */
function extractFieldFromOutputs(outputs: Array<Record<string, unknown>>): string | null {
  for (const output of outputs) {
    // Direct public field output (if contract returned it as a public value)
    if (
      (output.type === 'public' || output.type === 'private') &&
      typeof output.value === 'string' &&
      output.value.endsWith('field')
    ) {
      return output.value
    }

    // Future output: contains finalize arguments where auction_id is first arg
    if (output.type === 'future') {
      // String format: "{ program_id: ..., arguments: [ 123field, 456field ] }"
      if (typeof output.value === 'string') {
        const fieldMatches = output.value.match(/(\d+)field/g)
        if (fieldMatches && fieldMatches.length > 0) {
          return fieldMatches[0]
        }
      }
      // Object format: { program_id, function_name, arguments: ["123field", ...] }
      if (output.value && typeof output.value === 'object') {
        const futureVal = output.value as Record<string, unknown>
        const args = futureVal.arguments
        if (Array.isArray(args) && args.length > 0) {
          const firstArg = String(args[0])
          const match = firstArg.match(/(\d+field)/)
          if (match) return match[1]
        }
      }
    }
  }
  return null
}

/**
 * Extract auction_id from the finalize mapping operations of a ConfirmedTransaction.
 * Finalize operations set mapping keys — the first key written to auction_status
 * is the auction_id.
 */
function extractFieldFromFinalize(finalize: unknown): string | null {
  if (!Array.isArray(finalize)) return null
  for (const ops of finalize) {
    const entries = Array.isArray(ops) ? ops : [ops]
    for (const entry of entries) {
      if (entry && typeof entry === 'object') {
        const e = entry as Record<string, unknown>
        if (typeof e.key === 'string' && e.key.endsWith('field')) {
          return e.key
        }
      }
    }
  }
  return null
}

/**
 * Fetch a confirmed transaction and extract the auction_id from its outputs.
 * The Provable API returns the full transaction including finalize arguments.
 *
 * This is the primary method for getting the on-chain auction_id after
 * create_auction succeeds. Same approach as Obscura's extractAuctionIdFromTx.
 */
export async function extractAuctionIdFromTx(txId: string): Promise<string | null> {
  const url = `${ALEO_API}/transaction/${txId}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()

    const transitions = data?.execution?.transitions
    if (!Array.isArray(transitions) || transitions.length === 0) return null

    // Find the create_auction transition (may be in any position)
    const createTx = transitions.find(
      (t: Record<string, unknown>) =>
        (t.program === MARKETPLACE_PROGRAM_ID || t.program_id === MARKETPLACE_PROGRAM_ID) &&
        (t.function === 'create_auction' || t.function_name === 'create_auction')
    ) || transitions[0]

    // Try outputs first (future arguments contain auction_id as first arg)
    const fromOutputs = extractFieldFromOutputs(
      (createTx?.outputs || []) as Array<Record<string, unknown>>
    )
    if (fromOutputs) return fromOutputs

    // Fallback: check finalize mapping operations
    return extractFieldFromFinalize(data?.finalize || createTx?.finalize)
  } catch {
    return null
  }
}

/**
 * Poll for a confirmed transaction and extract the auction_id.
 * Retries up to maxAttempts times with intervalMs delay between attempts.
 * Returns a cleanup function to cancel polling.
 *
 * Same pattern as Obscura's pollForAuctionId.
 */
export function pollForAuctionId(
  txId: string,
  onFound: (auctionId: string) => void,
  maxAttempts = 40,
  intervalMs = 3000
): () => void {
  let attempts = 0
  let cancelled = false

  const timer = setInterval(async () => {
    if (cancelled) {
      clearInterval(timer)
      return
    }
    attempts++
    if (attempts > maxAttempts) {
      clearInterval(timer)
      return
    }
    const auctionId = await extractAuctionIdFromTx(txId)
    if (auctionId && !cancelled) {
      clearInterval(timer)
      onFound(auctionId)
    }
  }, intervalMs)

  return () => {
    cancelled = true
    clearInterval(timer)
  }
}

/**
 * Verify that an auction_id actually exists on-chain by querying
 * the auction_status mapping. Returns true if the auction is found.
 */
export async function verifyAuctionOnChain(auctionId: string): Promise<boolean> {
  const key = auctionId.endsWith('field') ? auctionId : `${auctionId}field`
  const status = await queryMapping('auction_status', key)
  return status !== null
}
