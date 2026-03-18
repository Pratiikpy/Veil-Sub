import { MICROCREDITS_PER_CREDIT, SECONDS_PER_BLOCK } from './config'

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
  // Ensure it fits in Aleo's base field (BLS12-377)
  const maxField = BigInt(
    '8444461749428370424248824938781546531375899335154063827935233455917409239041'
  )
  const result = num % maxField
  // Avoid zero pass_id (could be a sentinel value)
  return (result === BigInt(0) ? BigInt(1) : result).toString()
}

/**
 * Format microcredits to human-readable ALEO credits string.
 */
export function formatCredits(microcredits: number): string {
  if (!Number.isFinite(microcredits) || MICROCREDITS_PER_CREDIT <= 0) return '0'
  const credits = microcredits / MICROCREDITS_PER_CREDIT
  if (credits >= 1000) return `${(credits / 1000).toFixed(1)}K`
  if (credits >= 1) {
    return credits === Math.floor(credits) ? credits.toString() : credits.toFixed(2)
  }
  if (credits >= 0.01) return credits.toFixed(2)
  if (credits > 0) return '<0.01'
  return '0'
}

/**
 * Convert ALEO credits to microcredits.
 * Returns 0 for invalid inputs (NaN, Infinity, negative).
 */
export function creditsToMicrocredits(credits: number): number {
  if (!Number.isFinite(credits) || credits < 0) return 0
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
        let strVal = String(v ?? '')
        // Apply same suffix stripping as the string parsing path
        strVal = strVal.replace(/\.(private|public)$/, '')
        strVal = strVal.replace(/^(-?\d+)(u8|u16|u32|u64|u128|i8|i16|i32|i64|i128)$/, '$1')
        strVal = strVal.replace(/^(\d+)(field|scalar|group)$/, '$1')
        result[k] = strVal
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
      // Strip numeric type suffixes only when preceded by digits (safe for addresses)
      val = val.replace(/^(-?\d+)(u8|u16|u32|u64|u128|i8|i16|i32|i64|i128)$/, '$1')
      val = val.replace(/^(\d+)(field|scalar|group)$/, '$1')
      result[key] = val
    }
  } catch {
    // Ignore parse errors — return what we have
  }
  return result
}

/**
 * Parse a record plaintext into a typed AccessPass, returning null if invalid.
 */
export function parseAccessPass(
  plaintext: string
): { owner: string; creator: string; tier: number; passId: string; expiresAt: number; rawPlaintext: string } | null {
  const parsed = parseRecordPlaintext(plaintext)
  const tier = parseInt(parsed.tier ?? '', 10)
  const expiresAt = parseInt(parsed.expires_at ?? '', 10)
  if (!parsed.owner || !parsed.creator || isNaN(tier) || tier < 1 || tier > 20 || isNaN(expiresAt)) {
    return null
  }
  return {
    owner: parsed.owner,
    creator: parsed.creator,
    tier,
    passId: parsed.pass_id ?? '',
    expiresAt,
    rawPlaintext: plaintext,
  }
}

/**
 * Validate an Aleo address format.
 * Aleo addresses are always exactly 63 characters: "aleo1" prefix + 58 chars.
 */
export function isValidAleoAddress(address: string): boolean {
  // Length pre-check prevents ReDoS on maliciously long inputs
  if (typeof address !== 'string' || address.length !== 63) return false
  return /^aleo1[a-z0-9]{58}$/.test(address)
}

/**
 * Shorten an Aleo address for display.
 */
export function shortenAddress(address: string, chars = 6): string {
  if (!address || address.length < 12) return address
  return `${address.slice(0, chars + 4)}...${address.slice(-chars)}`
}

/**
 * Parse microcredits from an Aleo record plaintext string.
 * Extracts the numeric value from patterns like "microcredits: 500000u64".
 * Returns 0 for invalid or unparseable values. Caps at MAX_SAFE_INTEGER.
 */
export function parseMicrocredits(plaintext: string): number {
  const match = plaintext.match(/microcredits\s*:\s*([\d_]+)u64/)
  if (!match?.[1]) return 0
  const parsed = parseInt(match[1].replace(/_/g, ''), 10)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.min(parsed, Number.MAX_SAFE_INTEGER)
}

/**
 * Convert a block count to a human-readable duration string.
 * Aleo testnet: ~3 seconds per block.
 *
 * Examples: "~30 days", "~12 hours", "~50 minutes"
 */
export function blocksToTimeString(blocks: number): string {
  if (!Number.isFinite(blocks) || blocks <= 0) return '< 1 minute'
  const seconds = blocks * SECONDS_PER_BLOCK
  const days = seconds / 86400
  if (days >= 1) {
    const rounded = Math.round(days)
    return `~${rounded} day${rounded !== 1 ? 's' : ''}`
  }
  const hours = seconds / 3600
  if (hours >= 1) {
    const rounded = Math.round(hours)
    return `~${rounded} hour${rounded !== 1 ? 's' : ''}`
  }
  const minutes = Math.round(seconds / 60)
  return `~${minutes} minute${minutes !== 1 ? 's' : ''}`
}

/**
 * Convert an Aleo block height to an approximate human-readable date string.
 * Requires the current block height as a reference point.
 *
 * If the target block is in the future, returns "in ~X days" / "in ~X hours".
 * If the target block is in the past, returns "~X days ago" / "~X hours ago".
 * If currentBlockHeight is null/undefined, returns a fallback like "block 864000".
 */
export function blockToDate(
  targetBlock: number,
  currentBlockHeight?: number | null,
): string {
  if (!Number.isFinite(targetBlock)) return 'Unknown'
  if (currentBlockHeight == null || !Number.isFinite(currentBlockHeight)) {
    return `block ${targetBlock.toLocaleString()}`
  }

  const blockDiff = targetBlock - currentBlockHeight
  const secondsDiff = Math.abs(blockDiff) * SECONDS_PER_BLOCK

  // For dates that are far out, show an estimated calendar date
  const now = new Date()
  const estimatedDate = new Date(now.getTime() + blockDiff * SECONDS_PER_BLOCK * 1000)

  // If the absolute difference is less than 2 hours, show relative
  if (secondsDiff < 7200) {
    const minutes = Math.round(secondsDiff / 60)
    if (minutes < 1) return 'now'
    if (blockDiff > 0) return `in ~${minutes} min`
    return `~${minutes} min ago`
  }

  // If less than 48 hours, show relative hours
  if (secondsDiff < 172800) {
    const hours = Math.round(secondsDiff / 3600)
    if (blockDiff > 0) return `in ~${hours} hours`
    return `~${hours} hours ago`
  }

  // If less than 90 days, show relative days
  if (secondsDiff < 7776000) {
    const days = Math.round(secondsDiff / 86400)
    if (blockDiff > 0) return `in ~${days} days`
    return `~${days} days ago`
  }

  // Otherwise show a calendar date
  return estimatedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a block-height expiry into a user-friendly expiry string.
 * Returns e.g. "Expires in ~25 days" or "Expired ~3 days ago".
 */
export function formatExpiry(
  expiresAtBlock: number,
  currentBlockHeight: number | null,
): string {
  if (currentBlockHeight == null) return 'Expiry pending'
  if (expiresAtBlock <= currentBlockHeight) {
    const blocksPast = currentBlockHeight - expiresAtBlock
    return `Expired ${blocksToTimeString(blocksPast).replace('~', '~')} ago`
  }
  const blocksLeft = expiresAtBlock - currentBlockHeight
  return `Expires ${blockToDate(expiresAtBlock, currentBlockHeight)}`
}

/**
 * Estimate reading time from text content.
 * Strips HTML tags and assumes average reading speed of 200 words per minute.
 * Returns human-readable string like "3 min read".
 */
export function estimateReadingTime(text: string): string {
  if (!text) return '1 min read'
  const stripped = text.replace(/<[^>]*>/g, '').trim()
  if (!stripped) return '1 min read'
  const words = stripped.split(/\s+/).length
  const minutes = Math.max(1, Math.ceil(words / 200))
  return `${minutes} min read`
}

/**
 * Compute a server-salted wallet hash for API authentication.
 *
 * Hash = SHA-256(address + salt), where salt is SUPABASE_ENCRYPTION_KEY on the
 * server side and NEXT_PUBLIC_WALLET_AUTH_SALT on the client side. Both must
 * be configured to the same value for auth to work.
 *
 * This prevents forgery from public address alone -- the attacker needs the salt.
 * Combined with wallet signature + tight timestamp, this provides practical auth
 * for off-chain Redis content storage.
 */
export async function computeWalletHash(address: string): Promise<string> {
  const salt = process.env.NEXT_PUBLIC_WALLET_AUTH_SALT || ''
  const encoder = new TextEncoder()
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(address + salt))
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Privacy-preserving subscriber threshold tiers.
 * Instead of showing exact subscriber counts (which leak raw data from
 * on-chain mappings), we display threshold badges like "50+" or "1K+".
 *
 * The contract stores both raw u64 subscriber_count AND Pedersen
 * commitments (subscriber_commit). The raw count makes the commitment
 * pointless for privacy. Until v30 removes the raw count, the frontend
 * avoids displaying exact numbers to reduce the information surface.
 */
const SUBSCRIBER_THRESHOLDS = [10_000, 5_000, 1_000, 500, 100, 50, 10] as const

/**
 * Convert a raw subscriber count into a privacy-friendly threshold label.
 *
 * Examples:
 *   0  -> "New"
 *   5  -> "New"
 *   10 -> "10+"
 *   89 -> "50+"
 *   150 -> "100+"
 *   1500 -> "1K+"
 *   12000 -> "10K+"
 */
export function subscriberThresholdLabel(count: number): string {
  if (!Number.isFinite(count) || count < 10) return 'New'
  for (const threshold of SUBSCRIBER_THRESHOLDS) {
    if (count >= threshold) {
      if (threshold >= 1000) return `${threshold / 1000}K+`
      return `${threshold}+`
    }
  }
  return 'New'
}

/**
 * Convert a raw revenue amount (microcredits) into a privacy-friendly
 * threshold label. Avoids leaking exact revenue figures publicly.
 */
export function revenueThresholdLabel(microcredits: number): string {
  if (!Number.isFinite(microcredits) || microcredits <= 0) return 'New'
  const credits = microcredits / 1_000_000
  if (credits >= 10_000) return '10K+ ALEO'
  if (credits >= 5_000) return '5K+ ALEO'
  if (credits >= 1_000) return '1K+ ALEO'
  if (credits >= 500) return '500+ ALEO'
  if (credits >= 100) return '100+ ALEO'
  if (credits >= 50) return '50+ ALEO'
  if (credits >= 10) return '10+ ALEO'
  if (credits >= 1) return '1+ ALEO'
  return '<1 ALEO'
}
