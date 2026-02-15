import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

const ALEO_ADDRESS_RE = /^aleo1[a-z0-9]{58}$/

export async function GET(req: NextRequest) {
  const creator = req.nextUrl.searchParams.get('creator')
  if (!creator || !ALEO_ADDRESS_RE.test(creator)) return NextResponse.json({ posts: [] })

  const redis = getRedis()
  if (!redis) return NextResponse.json({ posts: [] })

  try {
    const raw = await redis.zrange(`veilsub:posts:${creator}`, 0, -1, { rev: true })
    const posts = raw.flatMap((p) => {
      try {
      const post = typeof p === 'string' ? JSON.parse(p) : p
      // Server-side content gating: redact body for tier-gated posts
      if (post.minTier && post.minTier > 0) {
        return {
          ...post,
          body: null, // Body is NEVER sent for gated content
          gated: true,
        }
      }
      return [post]
      } catch { return [] }
    })
    return NextResponse.json({ posts })
  } catch (err) {
    console.error('[API /posts GET]', err)
    return NextResponse.json({ posts: [] })
  }
}

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
    const { creator, title, body, minTier, contentId } = payload
    if (!creator || !title || !body) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!ALEO_ADDRESS_RE.test(creator)) {
      return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
    }
    if (typeof title !== 'string' || title.length > 200) {
      return NextResponse.json({ error: 'Title too long (max 200)' }, { status: 400 })
    }
    if (typeof body !== 'string' || body.length > 50000) {
      return NextResponse.json({ error: 'Body too long (max 50000)' }, { status: 400 })
    }
    if (typeof minTier === 'number' && (minTier < 1 || minTier > 3)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Rate limit: 5 posts per minute per address (always refresh TTL to prevent orphaned keys)
    const rlKey = `veilsub:ratelimit:${creator}`
    const count = await redis.incr(rlKey)
    await redis.expire(rlKey, 60)
    if (count > 5) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const post = {
      id: `post-${crypto.randomUUID()}`,
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
  } catch (err) {
    console.error('[API /posts POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let delPayload
  try { delPayload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { creator, postId } = delPayload
    if (!creator || !postId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!ALEO_ADDRESS_RE.test(creator)) {
      return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
    }

    if (typeof postId !== 'string' || postId.length > 100) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }

    // Rate limit: 10 deletes per minute per address (always refresh TTL)
    const rlKey = `veilsub:del-rl:${creator}`
    const count = await redis.incr(rlKey)
    await redis.expire(rlKey, 60)
    if (count > 10) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const raw = await redis.zrange(`veilsub:posts:${creator}`, 0, -1)
    for (const entry of raw) {
      const post = typeof entry === 'string' ? JSON.parse(entry) : entry
      if (post.id === postId) {
        await redis.zrem(`veilsub:posts:${creator}`, typeof entry === 'string' ? entry : JSON.stringify(entry))
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  } catch (err) {
    console.error('[API /posts DELETE]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
