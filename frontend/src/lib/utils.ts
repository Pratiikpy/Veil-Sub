import { MICROCREDITS_PER_CREDIT } from './config'

/**
 * Generate a unique pass_id as a field value string.
 * Uses crypto.getRandomValues for 128-bit randomness,
 * constrained to fit within Aleo's field size.
 */
export function generatePassId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let num = BigInt(0)
  for (let i = 0; i < bytes.length; i++) {
    num = num * BigInt(256) + BigInt(bytes[i])
  }
  // Ensure it fits in Aleo's scalar field (< 2^253)
  const maxField = BigInt(
    '8444461749428370424248824938781546531375899335154063827935233455917409239040'
  )
  return (num % maxField).toString()
}

/**
 * Format microcredits to human-readable ALEO credits string.
 */
export function formatCredits(microcredits: number): string {
  if (!Number.isFinite(microcredits)) return '0'
  const credits = microcredits / MICROCREDITS_PER_CREDIT
  if (credits >= 1000) return `${(credits / 1000).toFixed(1)}K`
  if (credits === Math.floor(credits)) return credits.toString()
  return credits.toFixed(2)
}

/**
 * Convert ALEO credits to microcredits.
 */
export function creditsToMicrocredits(credits: number): number {
  return Math.floor(credits * MICROCREDITS_PER_CREDIT)
}

/**
 * Parse an Aleo record plaintext string into key-value pairs.
 * Records come as: { owner: aleo1...private, creator: aleo1...private, tier: 1u8.private, ... }
 */
export function parseRecordPlaintext(
  plaintext: string | Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {}
  try {
    if (typeof plaintext === 'object' && plaintext !== null) {
      // Wallet adapters may return pre-parsed objects
      const obj: Record<string, unknown> = plaintext
      for (const [k, v] of Object.entries(obj)) {
        result[k] = String(v ?? '')
      }
      return result
    }
    const inner = plaintext.replace(/^\{/, '').replace(/\}$/, '').trim()
    const pairs = inner.split(',').map((s) => s.trim()).filter(Boolean)
    for (const pair of pairs) {
      const colonIdx = pair.indexOf(':')
      if (colonIdx === -1) continue
      const key = pair.slice(0, colonIdx).trim()
      let val = pair.slice(colonIdx + 1).trim()
      // Strip visibility suffix (.private / .public)
      val = val.replace(/\.(private|public)$/, '')
      // Strip type suffixes (u8, u64, field, etc.)
      val = val.replace(/(u8|u16|u32|u64|u128|i8|i16|i32|i64|i128|field|scalar|group|bool)$/, '')
      result[key] = val
    }
  } catch {
    // Ignore parse errors — return what we have
  }
  return result
}

/**
 * Validate an Aleo address format.
 */
export function isValidAleoAddress(address: string): boolean {
  return /^aleo1[a-z0-9]{58}$/.test(address)
}

/**
 * Shorten an Aleo address for display.
 */
export function shortenAddress(address: string, chars = 6): string {
  if (!address || address.length < 12) return address
  return `${address.slice(0, chars + 4)}...${address.slice(-chars)}`
}
