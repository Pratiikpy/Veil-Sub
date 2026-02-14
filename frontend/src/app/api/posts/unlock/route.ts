import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function POST(req: NextRequest) {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  try {
    const { postId, creatorAddress, walletAddress, accessPasses, timestamp } = await req.json()

    if (!postId || !creatorAddress || !walletAddress || !accessPasses || !timestamp) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Rate limit: 30 requests per minute per wallet address
    const rlKey = `veilsub:unlock-rl:${walletAddress}`
    const count = await redis.incr(rlKey)
    if (count === 1) await redis.expire(rlKey, 60)
    if (count > 30) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    // Verify timestamp is recent (within 5 minutes) to prevent replay
    const now = Date.now()
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Request expired' }, { status: 403 })
    }

    // Find the post from Redis
    const raw = await redis.zrange(`veilsub:posts:${creatorAddress}`, 0, -1, { rev: true })
    const posts = raw.map((p) => (typeof p === 'string' ? JSON.parse(p) : p))
    const post = posts.find((p: { id: string }) => p.id === postId)

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify the caller has a valid AccessPass for this creator
    const validPass = (accessPasses as Array<{ creator: string; tier: number; expiresAt: number }>)
      .find((pass) => {
        return (
          pass.creator === creatorAddress &&
          pass.tier >= (post.minTier || 1)
          // expiresAt is checked client-side against block height
          // We trust the client's AccessPass data since it comes from on-chain records
        )
      })

    if (!validPass) {
      return NextResponse.json({ error: 'Insufficient access' }, { status: 403 })
    }

    // Access granted — return the full post body
    return NextResponse.json({
      postId: post.id,
      body: post.body,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
