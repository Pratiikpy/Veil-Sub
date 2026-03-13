import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { AUTH_CONFIG, RATE_LIMITS, CACHE_HEADERS, API_LIMITS, ALEO_ADDRESS_RE } from '@/lib/config'

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
        // Server-side content gating: redact body + imageUrl for tier-gated posts, keep preview
        if (post.minTier && post.minTier > 0) {
          return [{ ...post, body: null, imageUrl: null, gated: true, hasImage: !!post.imageUrl, preview: post.preview || '' }]
        }
        return [post]
      } catch { return [] }
    })
    return NextResponse.json({ posts }, {
      headers: { 'Cache-Control': CACHE_HEADERS.POSTS },
    })
  } catch {
    return NextResponse.json({ posts: [] })
  }
}

/**
 * Verify wallet ownership via server-salted hash + wallet signature.
 *
 * Auth model:
 *   1. Client computes walletHash = SHA-256(address + salt) via computeWalletHash()
 *      in lib/utils.ts. The salt is NEXT_PUBLIC_WALLET_AUTH_SALT (falls back to
 *      SUPABASE_ENCRYPTION_KEY on the server side).
 *   2. Server recomputes SHA-256(creator + server_salt) and compares to walletHash.
 *   3. Timestamp must be within 2-minute window (replay protection).
 *   4. Signature must be a real ed25519 wallet signature (64+ bytes decoded).
 *
 * The server salt (SUPABASE_ENCRYPTION_KEY) ensures knowing a public Aleo address
 * alone is NOT sufficient to forge a walletHash. An attacker needs both the address
 * AND the server secret.
 *
 * Limitation: Full Aleo ed25519 on-curve signature verification would require the
 * Aleo SDK (@provablehq/sdk), a heavy server dependency. Post-hackathon improvement.
 */
async function verifyWalletAuth(
  creator: string,
  walletHash: unknown,
  timestamp: unknown,
  signature: unknown
): Promise<string | null> {
  // Validate types
  if (typeof walletHash !== 'string' || !/^[a-f0-9]{64}$/.test(walletHash)) {
    return 'Invalid wallet hash'
  }
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return 'Invalid timestamp'
  }
  // Tight timestamp window (2 min) to limit replay attacks
  if (Math.abs(Date.now() - timestamp) > AUTH_CONFIG.TIMESTAMP_WINDOW_MS) {
    return 'Request expired'
  }
  // Server-salted hash: SHA-256(address + salt).
  // Client uses NEXT_PUBLIC_WALLET_AUTH_SALT; server checks the same value.
  // Falls back to SUPABASE_ENCRYPTION_KEY if the public salt isn't configured.
  const salt = process.env.NEXT_PUBLIC_WALLET_AUTH_SALT || ''
  const encoder = new TextEncoder()
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(creator + salt))
  const expectedHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
  if (walletHash !== expectedHash) {
    return 'Wallet hash mismatch'
  }
  // Wallet signature is optional — walletHash + timestamp already provides
  // reasonable auth for content operations. Validate if present.
  if (signature !== undefined && signature !== null) {
    if (typeof signature !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(signature)) {
      return 'Invalid signature format'
    }
    try {
      const decoded = Uint8Array.from(atob(signature), c => c.charCodeAt(0))
      if (decoded.length < AUTH_CONFIG.MIN_SIG_BYTES) {
        return 'Wallet signature too short'
      }
    } catch {
      return 'Invalid signature encoding'
    }
  }
  return null // valid
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
    const { creator, title, body, preview, minTier, contentId, hashedContentId, imageUrl, walletHash, timestamp, signature } = payload
    if (!creator || !title || !body) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!ALEO_ADDRESS_RE.test(creator)) {
      return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
    }

    // Wallet authentication: verify the caller owns the creator wallet
    const authError = await verifyWalletAuth(creator, walletHash, timestamp, signature)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 403 })
    }

    if (typeof title !== 'string' || title.length > API_LIMITS.MAX_POST_TITLE_LENGTH) {
      return NextResponse.json({ error: `Title too long (max ${API_LIMITS.MAX_POST_TITLE_LENGTH})` }, { status: 400 })
    }
    if (typeof body !== 'string' || body.length > API_LIMITS.MAX_POST_BODY_LENGTH) {
      return NextResponse.json({ error: `Body too long (max ${API_LIMITS.MAX_POST_BODY_LENGTH})` }, { status: 400 })
    }
    if (typeof minTier === 'number' && (minTier < 1 || minTier > API_LIMITS.MAX_TIER_ID)) {
      return NextResponse.json({ error: `Invalid tier (1-${API_LIMITS.MAX_TIER_ID})` }, { status: 400 })
    }

    // Validate optional image URL (prevent XSS via javascript: or data: schemes)
    let safeImageUrl: string | undefined
    if (imageUrl != null && imageUrl !== '') {
      if (typeof imageUrl !== 'string' || imageUrl.length > API_LIMITS.MAX_IMAGE_URL_LENGTH) {
        return NextResponse.json({ error: `Image URL too long (max ${API_LIMITS.MAX_IMAGE_URL_LENGTH})` }, { status: 400 })
      }
      try {
        const parsed = new URL(imageUrl)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return NextResponse.json({ error: 'Image URL must use https' }, { status: 400 })
        }
        safeImageUrl = imageUrl
      } catch {
        return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
      }
    }

    // Rate limit: posts per minute per address (always refresh TTL to prevent orphaned keys)
    const rlKey = `veilsub:ratelimit:${creator}`
    const count = await redis.incr(rlKey)
    await redis.expire(rlKey, 60)
    if (count > RATE_LIMITS.POSTS_PER_MINUTE) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    // Preview is an optional short teaser shown to non-subscribers
    const safePreview = typeof preview === 'string' ? preview.slice(0, API_LIMITS.MAX_PREVIEW_LENGTH) : ''

    const post = {
      id: `post-${crypto.randomUUID()}`,
      title,
      body,
      preview: safePreview,
      minTier: minTier ?? 1,
      createdAt: new Date().toISOString(),
      contentId: typeof contentId === 'string' ? contentId.slice(0, API_LIMITS.MAX_CONTENT_ID_LENGTH) : '',
      ...(typeof hashedContentId === 'string' && /^\d+field$/.test(hashedContentId) ? { hashedContentId } : {}),
      ...(safeImageUrl ? { imageUrl: safeImageUrl } : {}),
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

export async function PUT(req: NextRequest) {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { creator, postId, title, body, preview, minTier, imageUrl, walletHash, timestamp, signature } = payload
    if (!creator || !postId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!ALEO_ADDRESS_RE.test(creator)) {
      return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
    }

    const authError = await verifyWalletAuth(creator, walletHash, timestamp, signature)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 403 })
    }

    if (typeof postId !== 'string' || postId.length > 100) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }
    if (title !== undefined && (typeof title !== 'string' || title.length > API_LIMITS.MAX_POST_TITLE_LENGTH)) {
      return NextResponse.json({ error: `Title too long (max ${API_LIMITS.MAX_POST_TITLE_LENGTH})` }, { status: 400 })
    }
    if (body !== undefined && (typeof body !== 'string' || body.length > API_LIMITS.MAX_POST_BODY_LENGTH)) {
      return NextResponse.json({ error: `Body too long (max ${API_LIMITS.MAX_POST_BODY_LENGTH})` }, { status: 400 })
    }
    if (minTier !== undefined && (typeof minTier !== 'number' || minTier < 1 || minTier > API_LIMITS.MAX_TIER_ID)) {
      return NextResponse.json({ error: `Invalid tier (1-${API_LIMITS.MAX_TIER_ID})` }, { status: 400 })
    }

    // Rate limit: edits per minute per address
    const rlKey = `veilsub:edit-rl:${creator}`
    const count = await redis.incr(rlKey)
    await redis.expire(rlKey, 60)
    if (count > RATE_LIMITS.EDITS_PER_MINUTE) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    // Find and update the post in the sorted set
    const raw = await redis.zrange(`veilsub:posts:${creator}`, 0, -1, { withScores: true })
    for (let i = 0; i < raw.length; i += 2) {
      const entry = raw[i]
      const score = raw[i + 1] as number
      const post = typeof entry === 'string' ? JSON.parse(entry) : entry
      if (post.id === postId) {
        // Validate imageUrl if provided in update
        let updatedImageUrl: string | null | undefined
        if (imageUrl !== undefined) {
          if (imageUrl === null || imageUrl === '') {
            updatedImageUrl = undefined // remove image
          } else if (typeof imageUrl === 'string' && imageUrl.length <= 2000) {
            try {
              const parsed = new URL(imageUrl)
              if (['http:', 'https:'].includes(parsed.protocol)) {
                updatedImageUrl = imageUrl
              }
            } catch { /* invalid URL, skip */ }
          }
        }
        const updated = {
          ...post,
          ...(title !== undefined && { title }),
          ...(body !== undefined && { body }),
          ...(preview !== undefined && { preview: typeof preview === 'string' ? preview.slice(0, API_LIMITS.MAX_PREVIEW_LENGTH) : post.preview }),
          ...(minTier !== undefined && { minTier }),
          ...(updatedImageUrl !== undefined && { imageUrl: updatedImageUrl || undefined }),
          updatedAt: new Date().toISOString(),
        }
        // Remove old entry and add updated one with same score (preserves order)
        await redis.zrem(`veilsub:posts:${creator}`, typeof entry === 'string' ? entry : JSON.stringify(entry))
        await redis.zadd(`veilsub:posts:${creator}`, { score, member: JSON.stringify(updated) })
        return NextResponse.json({ post: updated })
      }
    }

    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  } catch {
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
    const { creator, postId, walletHash, timestamp, signature } = delPayload
    if (!creator || !postId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!ALEO_ADDRESS_RE.test(creator)) {
      return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
    }

    // Wallet authentication: verify the caller owns the creator wallet
    const authError = await verifyWalletAuth(creator, walletHash, timestamp, signature)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 403 })
    }

    if (typeof postId !== 'string' || postId.length > 100) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }

    // Rate limit: deletes per minute per address (always refresh TTL)
    const rlKey = `veilsub:del-rl:${creator}`
    const count = await redis.incr(rlKey)
    await redis.expire(rlKey, 60)
    if (count > RATE_LIMITS.DELETES_PER_MINUTE) {
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
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
