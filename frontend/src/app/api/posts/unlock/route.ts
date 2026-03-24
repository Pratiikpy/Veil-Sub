import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { ALEO_API_BASE_URL, RATE_LIMITS, AUTH_CONFIG, ALEO_ADDRESS_RE } from '@/lib/config'
import { decryptContent } from '@/lib/contentEncryption'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:unlock`, 30)
  if (!allowed) return getRateLimitResponse()

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { postId, creatorAddress, walletHash, accessPasses, timestamp, signature } = payload

    if (!postId || !creatorAddress || !walletHash || !accessPasses || !timestamp) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!ALEO_ADDRESS_RE.test(creatorAddress)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }
    // walletHash is a SHA-256 hex string (64 chars) — never the raw address
    if (typeof walletHash !== 'string' || !/^[a-f0-9]{64}$/.test(walletHash)) {
      return NextResponse.json({ error: 'Invalid wallet hash' }, { status: 400 })
    }
    if (!Array.isArray(accessPasses)) {
      return NextResponse.json({ error: 'Invalid access passes' }, { status: 400 })
    }

    // Wallet signature verification: required for content unlock.
    // Full Aleo ed25519 on-curve verification requires @provablehq/sdk (post-hackathon).
    // We validate format + decoded byte length (64+ for ed25519) to reject trivially-forged strings.
    if (!signature || typeof signature !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(signature)) {
      return NextResponse.json({ error: 'Wallet signature required' }, { status: 403 })
    }
    try {
      const decoded = Uint8Array.from(atob(signature), c => c.charCodeAt(0))
      if (decoded.length < 64) {
        return NextResponse.json({ error: 'Wallet signature too short' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid signature encoding' }, { status: 403 })
    }

    // Validate timestamp type to prevent NaN comparison bypass
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
      return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 })
    }

    // Rate limit: unlock requests per minute per wallet (always refresh TTL)
    const rlKey = `veilsub:unlock-rl:${walletHash}`
    const count = await redis.incr(rlKey)
    await redis.expire(rlKey, 60)
    if (count > RATE_LIMITS.UNLOCK_PER_MINUTE) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    // Verify timestamp is recent (within config window) to limit replay attacks
    const now = Date.now()
    if (Math.abs(now - timestamp) > AUTH_CONFIG.TIMESTAMP_WINDOW_MS) {
      return NextResponse.json({ error: 'Request expired' }, { status: 403 })
    }

    // Find the post from Redis (individual JSON.parse to survive corrupt entries)
    const raw = await redis.zrange(`veilsub:posts:${creatorAddress}`, 0, -1, { rev: true })
    const posts = raw.flatMap((p) => {
      try { return [typeof p === 'string' ? JSON.parse(p) : p] } catch { return [] }
    })
    const post = posts.find((p: { id: string }) => p.id === postId)

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Validate and filter accessPasses shape before use.
    // Each pass must have a string creator and numeric tier at minimum.
    const validatedPasses = accessPasses.filter(
      (p: unknown): p is { creator: string; tier: number; expiresAt: number } =>
        typeof p === 'object' && p !== null &&
        typeof (p as Record<string, unknown>).creator === 'string' &&
        typeof (p as Record<string, unknown>).tier === 'number' &&
        Number.isFinite((p as Record<string, unknown>).tier)
    )

    // Fetch current block height for server-side expiry validation.
    // Call the Provable API directly (server-side, no need for rewrite proxy).
    let currentHeight = 0
    try {
      const heightRes = await fetch(
        `${ALEO_API_BASE_URL}/latest/height`,
        { next: { revalidate: 15 } }
      )
      if (heightRes.ok) {
        currentHeight = parseInt(await heightRes.text(), 10) || 0
      }
    } catch {
      // Height unavailable — handled below
    }

    // If block height is unavailable (API down), use time-based estimation as fallback.
    // Aleo testnet: ~3 seconds per block, genesis approx Jan 1 2024.
    // This is an ESTIMATE — not cryptographically verified — but better than a hard 503
    // when the Provable API is intermittently down (common on testnet).
    if (currentHeight === 0) {
      const GENESIS_TIMESTAMP = 1704067200000 // Jan 1 2024 00:00:00 UTC
      const BLOCK_TIME_MS = 3000
      const estimatedHeight = Math.floor((Date.now() - GENESIS_TIMESTAMP) / BLOCK_TIME_MS)
      if (estimatedHeight > 0) {
        currentHeight = estimatedHeight
      } else {
        return NextResponse.json({ error: 'Cannot verify subscription status. Try again.' }, { status: 503 })
      }
    }

    // Verify the caller has a valid, non-expired AccessPass for this creator
    const validPass = validatedPasses
      .find((pass) => {
        const tierOk = pass.creator === creatorAddress && pass.tier >= (post.minTier || 1)
        if (!tierOk) return false
        // Server-side expiry check when block height is available
        if (currentHeight > 0 && typeof pass.expiresAt === 'number' && pass.expiresAt > 0) {
          return pass.expiresAt > currentHeight
        }
        return true
      })

    if (!validPass) {
      return NextResponse.json({ error: 'Insufficient access' }, { status: 403 })
    }

    // Access granted — determine decryption strategy:
    // E2E content (starts with 'e2e:'): return encrypted blob as-is. The CLIENT
    // will derive the tier key from their AccessPass and decrypt in-browser.
    // Server-encrypted content (legacy): decrypt server-side and return plaintext.
    const bodyRaw = post.body || ''
    const isE2E = bodyRaw.startsWith('e2e:')
    const responseBody = isE2E ? bodyRaw : (bodyRaw ? decryptContent(bodyRaw, creatorAddress) : '')

    // Decrypt media URLs (may be encrypted at rest or plaintext legacy)
    const decryptedImageUrl = post.imageUrl ? decryptContent(post.imageUrl, creatorAddress) : null
    const decryptedVideoUrl = post.videoUrl ? decryptContent(post.videoUrl, creatorAddress) : null

    return NextResponse.json({
      postId: post.id,
      body: responseBody,
      imageUrl: decryptedImageUrl,
      videoUrl: decryptedVideoUrl,
      e2e: isE2E || undefined,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
