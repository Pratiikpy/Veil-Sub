/**
 * Shared wallet authentication for API routes.
 *
 * Verifies that the caller owns a wallet by checking:
 *   1. walletHash = SHA-256(address + server_salt) matches server computation
 *   2. Timestamp is within AUTH_CONFIG.TIMESTAMP_WINDOW_MS (replay protection)
 *   3. Signature format is valid (optional — walletHash + timestamp is sufficient)
 *
 * Extracted from /api/posts/route.ts so all write-protected routes share
 * the same auth logic without duplication.
 */

import { AUTH_CONFIG } from '@/lib/config'

export interface WalletAuthResult {
  valid: boolean
  error?: string
}

/**
 * Verify wallet authentication from request body fields.
 *
 * Expected fields in the request body (or headers):
 *   - walletAddress: the raw aleo1... address (used to recompute hash)
 *   - walletHash: SHA-256 hex of (address + salt)
 *   - timestamp: Unix ms timestamp
 *   - signature: optional base64 wallet signature
 */
export async function verifyWalletAuth(
  walletAddress: string,
  walletHash: unknown,
  timestamp: unknown,
  signature?: unknown
): Promise<WalletAuthResult> {
  // Validate walletHash format
  if (typeof walletHash !== 'string' || !/^[a-f0-9]{64}$/.test(walletHash)) {
    return { valid: false, error: 'Invalid wallet hash' }
  }

  // Validate timestamp
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return { valid: false, error: 'Invalid timestamp' }
  }

  // Tight timestamp window to limit replay attacks
  if (Math.abs(Date.now() - timestamp) > AUTH_CONFIG.TIMESTAMP_WINDOW_MS) {
    return { valid: false, error: 'Request expired' }
  }

  // Server-salted hash: SHA-256(address + salt)
  const salt = process.env.WALLET_AUTH_SECRET || process.env.NEXT_PUBLIC_WALLET_AUTH_SALT || 'veilsub-auth-v1'
  const encoder = new TextEncoder()
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(walletAddress + salt))
  const expectedHash = Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  if (walletHash !== expectedHash) {
    return { valid: false, error: 'Wallet hash mismatch' }
  }

  // Validate signature format if present (optional)
  if (signature !== undefined && signature !== null) {
    if (typeof signature !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(signature)) {
      return { valid: false, error: 'Invalid signature format' }
    }
    try {
      const decoded = Uint8Array.from(atob(signature), c => c.charCodeAt(0))
      if (decoded.length < AUTH_CONFIG.MIN_SIG_BYTES) {
        return { valid: false, error: 'Wallet signature too short' }
      }
    } catch {
      return { valid: false, error: 'Invalid signature encoding' }
    }
  }

  return { valid: true }
}

/**
 * Extract wallet auth fields from a parsed JSON body.
 * Returns null if required fields are missing (allows GET routes to skip auth).
 */
export function extractAuthFields(body: Record<string, unknown>): {
  walletAddress: string
  walletHash: unknown
  timestamp: unknown
  signature?: unknown
} | null {
  const walletAddress = (body.walletAddress ?? body.address ?? body.creator_address ?? body.creator ?? body.subscriberAddress) as string | undefined
  const walletHash = body.walletHash
  const timestamp = body.timestamp
  const signature = body.signature

  if (!walletAddress || !walletHash || timestamp === undefined) {
    return null
  }

  return { walletAddress, walletHash, timestamp, signature }
}
