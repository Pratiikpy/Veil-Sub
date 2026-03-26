import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { verifyWalletAuth } from '@/lib/apiAuth'
import { ALEO_ADDRESS_RE } from '@/lib/config'
import { validateOrigin } from '@/lib/csrf'

/**
 * PPV (Pay-Per-View) Unlock API — tracks which subscribers have paid for PPV content.
 *
 * POST: Record a PPV unlock after payment confirmation
 * GET:  Check if a subscriber has unlocked a PPV post
 *
 * Data is stored in Redis with the subscriber's wallet hash (privacy-preserving).
 * The actual payment is verified on-chain via the transaction ID.
 */

const TTL_SECONDS = 365 * 24 * 60 * 60 // 1 year (PPV unlocks are permanent)

function validatePostId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 100
}

function validateTxId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 200
}

function validateWalletHash(hash: unknown): hash is string {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash)
}

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:ppv-unlock:post`, 30)
  if (!allowed) return getRateLimitResponse()

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { postId, txId, walletAddress, walletHash, timestamp, signature, creatorAddress } = payload

  // Wallet authentication
  if (walletAddress && walletHash) {
    const auth = await verifyWalletAuth(walletAddress, walletHash, timestamp, signature)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
    }
  } else {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (!validatePostId(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
  }
  if (!validateTxId(txId)) {
    return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 })
  }
  if (creatorAddress && !ALEO_ADDRESS_RE.test(creatorAddress)) {
    return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
  }

  // Store PPV unlock keyed by wallet hash + post ID
  const key = `veilsub:ppv-unlock:${walletHash}:${postId}`
  const data = JSON.stringify({
    postId,
    txId,
    creatorAddress: creatorAddress || null,
    unlockedAt: Date.now(),
  })

  await redis.set(key, data, { ex: TTL_SECONDS })

  // Also add to a set of all PPV unlocks for this wallet (for listing)
  await redis.sadd(`veilsub:ppv-unlocks:${walletHash}`, postId)

  return NextResponse.json({ unlocked: true })
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:ppv-unlock:get`, 60)
  if (!allowed) return getRateLimitResponse()

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  const walletHash = req.nextUrl.searchParams.get('walletHash')
  const postId = req.nextUrl.searchParams.get('postId')

  if (!validateWalletHash(walletHash)) {
    return NextResponse.json({ error: 'Invalid wallet hash' }, { status: 400 })
  }

  // If postId is provided, check specific unlock
  if (postId) {
    if (!validatePostId(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }
    const key = `veilsub:ppv-unlock:${walletHash}:${postId}`
    const data = await redis.get<string>(key)
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data
        return NextResponse.json({ unlocked: true, data: parsed })
      } catch {
        return NextResponse.json({ unlocked: true })
      }
    }
    return NextResponse.json({ unlocked: false })
  }

  // Otherwise, return all unlocked post IDs for this wallet
  const unlockedPosts = await redis.smembers(`veilsub:ppv-unlocks:${walletHash}`)
  return NextResponse.json({ unlockedPosts: unlockedPosts || [] })
}
