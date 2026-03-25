/**
 * Fetch wrapper that automatically adds wallet auth headers.
 * Use this for ALL API calls to authenticated endpoints.
 *
 * For header-based auth (e.g., /api/upload with multipart/form-data):
 *   authenticatedFetch(url, { walletAddress, method: 'POST', body: formData })
 *
 * For body-based auth (e.g., /api/tiers with JSON):
 *   Use addAuthToBody() to inject walletAddress/walletHash/timestamp into the body.
 */

import { computeWalletHash } from '@/lib/utils'

/**
 * Fetch wrapper that automatically adds wallet auth headers
 * (x-wallet-address, x-wallet-hash, x-wallet-timestamp).
 *
 * Use for endpoints that check headers (e.g., /api/upload).
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit & { walletAddress?: string } = {}
): Promise<Response> {
  const { walletAddress, headers: existingHeaders, ...rest } = options

  if (!walletAddress) {
    throw new Error('Wallet address required for authenticated API calls')
  }

  const timestamp = Date.now().toString()
  const walletHash = await computeWalletHash(walletAddress)

  const authHeaders: Record<string, string> = {
    'x-wallet-address': walletAddress,
    'x-wallet-hash': walletHash,
    'x-wallet-timestamp': timestamp,
  }

  // Merge existing headers with auth headers
  const mergedHeaders: Record<string, string> = { ...authHeaders }
  if (existingHeaders) {
    const entries = existingHeaders instanceof Headers
      ? Array.from(existingHeaders.entries())
      : Array.isArray(existingHeaders)
        ? existingHeaders
        : Object.entries(existingHeaders)
    for (const [key, value] of entries) {
      mergedHeaders[key] = value as string
    }
  }

  return fetch(url, {
    ...rest,
    headers: mergedHeaders,
  })
}

/**
 * Build wallet auth fields to include in a JSON request body.
 * Use for endpoints that extract auth from the body (e.g., /api/tiers, /api/social).
 *
 * Returns { walletAddress, walletHash, timestamp } ready to spread into your payload.
 */
export async function buildAuthPayload(
  walletAddress: string
): Promise<{ walletAddress: string; walletHash: string; timestamp: number }> {
  const walletHash = await computeWalletHash(walletAddress)
  return {
    walletAddress,
    walletHash,
    timestamp: Date.now(),
  }
}
