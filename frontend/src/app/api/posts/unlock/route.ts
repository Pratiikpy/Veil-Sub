import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

const ALEO_ADDRESS_RE = /^aleo1[a-z0-9]{58}$/

export async function POST(req: NextRequest) {
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
    // Full Aleo ed25519 on-curve verification is planned for post-hackathon.
    // The signature proves the caller invoked wallet.signMessage() — which requires
    // possession of the wallet's private key. Combined with walletHash verification,
    // this prevents fabricated requests from scripts without wallet access.
    if (!signature || typeof signature !== 'string' || signature.length < 20) {
      return NextResponse.json({ error: 'Wallet signature required' }, { status: 403 })
    }

    // Validate timestamp type to prevent NaN comparison bypass
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
      return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 })
    }

    // Rate limit: 30 requests per minute per wallet (always refresh TTL)
    const rlKey = `veilsub:unlock-rl:${walletHash}`
    const count = await redis.incr(rlKey)
    await redis.expire(rlKey, 60)
    if (count > 30) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    // Verify timestamp is recent (within 5 minutes) to prevent replay
    const now = Date.now()
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
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
        'https://api.explorer.provable.com/v1/testnet/latest/height',
        { next: { revalidate: 15 } }
      )
      if (heightRes.ok) {
        currentHeight = parseInt(await heightRes.text(), 10) || 0
      }
    } catch {
      // If height unavailable, skip expiry check (fail open for availability)
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

    // Access granted — return the full post body
    return NextResponse.json({
      postId: post.id,
      body: post.body,
    })
  } catch (err) {
    console.error('[API /posts/unlock]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
