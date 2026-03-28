import { ALEO_API, MARKETPLACE_PROGRAM_ID } from './constants'
import type { StoredBid } from './constants'

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

export function saveAuctionToStorage(auctionId: string, label: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = 'veilsub_marketplace_auctions'
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as { id: string; label: string }[]
    if (!existing.some(a => a.id === auctionId)) {
      existing.push({ id: auctionId, label })
      localStorage.setItem(key, JSON.stringify(existing))
    }
  } catch { /* localStorage unavailable */ }
}

export function getAuctionsFromStorage(): { id: string; label: string }[] {
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
  const cleaned = raw.replace('u64', '').replace(/"/g, '').trim()
  return parseInt(cleaned, 10) || 0
}

export function parseU8(raw: string | null): number {
  if (!raw) return 0
  const cleaned = raw.replace('u8', '').replace(/"/g, '').trim()
  return parseInt(cleaned, 10) || 0
}
