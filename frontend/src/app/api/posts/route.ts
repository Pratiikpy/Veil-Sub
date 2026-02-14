import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function GET(req: NextRequest) {
  const creator = req.nextUrl.searchParams.get('creator')
  if (!creator) return NextResponse.json({ posts: [] })

  const redis = getRedis()
  if (!redis) return NextResponse.json({ posts: [] })

  try {
    const raw = await redis.zrange(`veilsub:posts:${creator}`, 0, -1, { rev: true })
    const posts = raw.map((p) => (typeof p === 'string' ? JSON.parse(p) : p))
    return NextResponse.json({ posts })
  } catch {
    return NextResponse.json({ posts: [] })
  }
}

export async function POST(req: NextRequest) {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  try {
    const { creator, title, body, minTier, contentId } = await req.json()
    if (!creator || !title || !body) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Rate limit: 5 posts per minute per address
    const rlKey = `veilsub:ratelimit:${creator}`
    const count = await redis.incr(rlKey)
    if (count === 1) await redis.expire(rlKey, 60)
    if (count > 5) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const post = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      body,
      minTier: minTier ?? 1,
      createdAt: new Date().toISOString(),
      contentId: contentId || '',
    }

    await redis.zadd(`veilsub:posts:${creator}`, {
      score: Date.now(),
      member: JSON.stringify(post),
    })

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
