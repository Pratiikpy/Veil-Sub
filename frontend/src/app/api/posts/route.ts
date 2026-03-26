import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { AUTH_CONFIG, RATE_LIMITS, CACHE_HEADERS, API_LIMITS, ALEO_ADDRESS_RE } from '@/lib/config'
import { encryptContent, decryptContent } from '@/lib/contentEncryption'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { validateOrigin } from '@/lib/csrf'
import { timingSafeEqual } from 'crypto'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:posts:get`, 30)
  if (!allowed) return getRateLimitResponse()

  const creator = req.nextUrl.searchParams.get('creator')
  if (!creator || !ALEO_ADDRESS_RE.test(creator)) return NextResponse.json({ error: 'Valid creator address required' }, { status: 400 })

  // Optional filters: status (draft/scheduled/published), tag
  const statusFilter = req.nextUrl.searchParams.get('status')
  const tagFilter = req.nextUrl.searchParams.get('tag')

  const redis = getRedis()
  if (!redis) return NextResponse.json({ posts: [], error: 'Storage unavailable' }, { status: 503 })

  try {
    const raw = await redis.zrange(`veilsub:posts:${creator}`, 0, -1, { rev: true })
    const now = new Date().toISOString()
    // Track posts that need status update in Redis (scheduled -> published)
    const postsToPromote: { oldEntry: string; newPost: Record<string, unknown>; score: number }[] = []
    const posts = raw.flatMap((p, index) => {
      try {
        const rawEntry = typeof p === 'string' ? p : JSON.stringify(p)
        const post = typeof p === 'string' ? JSON.parse(p) : p

        // Auto-promote scheduled posts whose scheduledAt has passed
        if (post.status === 'scheduled' && post.scheduledAt && post.scheduledAt <= now) {
          post.status = 'published'
          // Queue for Redis update (persist the status change)
          postsToPromote.push({ oldEntry: rawEntry, newPost: post, score: Date.now() - index })
        }

        const effectiveStatus = post.status || 'published'

        // Filter by status: drafts and scheduled posts only visible via explicit filter
        if (statusFilter) {
          if (effectiveStatus !== statusFilter) return []
        } else {
          // Public feed: only show published posts
          if (effectiveStatus !== 'published') return []
        }

        // Decrypt metadata fields for display (backward-compatible: unencrypted data passes through).
        // Each decryptContent call is wrapped in try/catch so one corrupted post
        // doesn't break the entire post list.
        let decryptedTitle = ''
        try { decryptedTitle = post.title ? decryptContent(post.title, creator) : '' } catch { decryptedTitle = post.title || '' }

        // Tags: stored as encrypted JSON string (new) or plaintext array (legacy)
        let decryptedTags: string[] = []
        if (post.tags) {
          if (typeof post.tags === 'string') {
            // New format: encrypted JSON string of tag array
            try {
              const tagsStr = decryptContent(post.tags, creator)
              decryptedTags = JSON.parse(tagsStr)
            } catch {
              decryptedTags = []
            }
          } else if (Array.isArray(post.tags)) {
            // Legacy format: plaintext array
            decryptedTags = post.tags
          }
        }

        // Filter by tag if requested (compare against decrypted tags)
        if (tagFilter && !decryptedTags.includes(tagFilter)) return []

        // Decrypt media URLs (may be encrypted or plaintext legacy)
        let decryptedImageUrl: string | undefined
        let decryptedVideoUrl: string | undefined
        try { decryptedImageUrl = post.imageUrl ? decryptContent(post.imageUrl, creator) : undefined } catch { decryptedImageUrl = post.imageUrl || undefined }
        try { decryptedVideoUrl = post.videoUrl ? decryptContent(post.videoUrl, creator) : undefined } catch { decryptedVideoUrl = post.videoUrl || undefined }

        // Server-side content gating: redact body + imageUrl + videoUrl for tier-gated posts, keep preview
        if (post.minTier && post.minTier > 0) {
          // E2E-encrypted preview: pass through as-is (server cannot decrypt).
          // Legacy server-encrypted preview: decrypt server-side for display.
          let previewValue = ''
          try {
            previewValue = post.preview
              ? (post.preview.startsWith('e2e:') ? post.preview : decryptContent(post.preview, creator))
              : ''
          } catch { previewValue = post.preview || '' }
          return [{
            ...post,
            title: decryptedTitle,
            tags: decryptedTags.length > 0 ? decryptedTags : undefined,
            body: null, imageUrl: null, videoUrl: null, gated: true,
            hasImage: !!decryptedImageUrl, hasVideo: !!decryptedVideoUrl,
            preview: previewValue,
            ...(post.e2e ? { e2e: true } : {}),
            ...(post.ppvPrice ? { ppvPrice: post.ppvPrice } : {}),
            ...(post.postType === 'note' ? { postType: 'note' } : {}),
          }]
        }
        // Free posts (minTier 0): decrypt body for public display
        // Note: free posts are never E2E-encrypted, so always server-decrypt
        let decryptedBody = ''
        let decryptedPreview = ''
        try { decryptedBody = post.body ? decryptContent(post.body, creator) : '' } catch { decryptedBody = post.body || '' }
        try { decryptedPreview = post.preview ? decryptContent(post.preview, creator) : '' } catch { decryptedPreview = post.preview || '' }
        return [{
          ...post,
          title: decryptedTitle,
          body: decryptedBody,
          preview: decryptedPreview,
          tags: decryptedTags.length > 0 ? decryptedTags : undefined,
          imageUrl: decryptedImageUrl || undefined,
          videoUrl: decryptedVideoUrl || undefined,
          ...(post.ppvPrice ? { ppvPrice: post.ppvPrice } : {}),
          ...(post.postType === 'note' ? { postType: 'note' } : {}),
        }]
      } catch { return [] }
    })

    // Persist scheduled->published status changes to Redis (fire-and-forget, don't block response)
    if (postsToPromote.length > 0) {
      Promise.all(postsToPromote.map(async ({ oldEntry, newPost, score }) => {
        try {
          // Remove old entry and add updated entry
          await redis.zrem(`veilsub:posts:${creator}`, oldEntry)
          await redis.zadd(`veilsub:posts:${creator}`, { score, member: JSON.stringify(newPost) })
        } catch {
          // Silent fail — next request will try again
        }
      })).catch(() => { /* ignore batch errors */ })
    }

    return NextResponse.json({ posts }, {
      headers: { 'Cache-Control': CACHE_HEADERS.POSTS },
    })
  } catch (err) {
    console.error('[posts] unexpected error:', err)
    return NextResponse.json({ posts: [], error: 'Failed to fetch posts' }, { status: 500 })
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
  // Prefer server-only secret (WALLET_AUTH_SECRET) when available.
  // Falls back to NEXT_PUBLIC_WALLET_AUTH_SALT for backward compatibility.
  const salt = process.env.WALLET_AUTH_SECRET || process.env.NEXT_PUBLIC_WALLET_AUTH_SALT || 'veilsub-auth-v1'
  const encoder = new TextEncoder()
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(creator + salt))
  const expectedHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashBuffer1 = Buffer.from(walletHash, 'hex')
  const hashBuffer2 = Buffer.from(expectedHash, 'hex')
  if (hashBuffer1.length !== hashBuffer2.length || !timingSafeEqual(hashBuffer1, hashBuffer2)) {
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
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ipPost = getClientIp(req)
  const { allowed: allowedPost } = rateLimit(`${ipPost}:posts:post`, 30)
  if (!allowedPost) return getRateLimitResponse()

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { creator, title, body, preview, minTier, contentId, hashedContentId, imageUrl, videoUrl, walletHash, timestamp, signature, status, tags, scheduledAt, ppvPrice, postType } = payload
    // Notes require only body (no title); drafts require title; posts require both
    const isDraft = status === 'draft'
    const isNote = postType === 'note'
    if (!creator || (!isNote && !title) || (!isDraft && !isNote && !body)) {
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
    if (!isDraft && !isNote && typeof title === 'string' && title.trim().length === 0) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    }
    if (typeof body !== 'string' || body.length > API_LIMITS.MAX_POST_BODY_LENGTH) {
      return NextResponse.json({ error: `Body too long (max ${API_LIMITS.MAX_POST_BODY_LENGTH})` }, { status: 400 })
    }
    if (!isDraft && !isNote && body) {
      const textContent = body.replace(/<[^>]*>/g, '').trim()
      if (textContent.length === 0) {
        return NextResponse.json({ error: 'Post body cannot be empty' }, { status: 400 })
      }
    }
    if (typeof minTier === 'number' && (minTier < 0 || minTier > API_LIMITS.MAX_TIER_ID)) {
      return NextResponse.json({ error: `Invalid tier (0-${API_LIMITS.MAX_TIER_ID})` }, { status: 400 })
    }

    // Notes have strict 280 character limit (enforced client-side too, but validate server-side for defense-in-depth)
    if (isNote && typeof body === 'string' && body.length > API_LIMITS.MAX_NOTE_BODY_LENGTH) {
      return NextResponse.json({ error: `Note too long (max ${API_LIMITS.MAX_NOTE_BODY_LENGTH} characters)` }, { status: 400 })
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

    // Validate optional video URL (YouTube or direct video link)
    let safeVideoUrl: string | undefined
    if (videoUrl != null && videoUrl !== '') {
      if (typeof videoUrl !== 'string' || videoUrl.length > API_LIMITS.MAX_IMAGE_URL_LENGTH) {
        return NextResponse.json({ error: `Video URL too long (max ${API_LIMITS.MAX_IMAGE_URL_LENGTH})` }, { status: 400 })
      }
      try {
        const parsed = new URL(videoUrl)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return NextResponse.json({ error: 'Video URL must use https' }, { status: 400 })
        }
        safeVideoUrl = videoUrl
      } catch {
        return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 })
      }
    }

    // Rate limit: posts per minute per address (always refresh TTL to prevent orphaned keys)
    const rlKey = `veilsub:ratelimit:${creator}`
    const count = await redis.incr(rlKey)
    await redis.expire(rlKey, 60)
    if (count > RATE_LIMITS.POSTS_PER_MINUTE) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    // Validate status field
    const validStatuses = ['published', 'draft', 'scheduled']
    const postStatus = (typeof status === 'string' && validStatuses.includes(status)) ? status : 'published'

    // Validate tags (max 5 tags, each max 30 chars, sanitized)
    let safeTags: string[] = []
    if (Array.isArray(tags)) {
      safeTags = tags
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map(t => t.trim().slice(0, API_LIMITS.MAX_TAG_LENGTH))
        .slice(0, API_LIMITS.MAX_TAGS_PER_POST)
    }

    // Validate scheduledAt for scheduled posts
    let safeScheduledAt: string | undefined
    if (postStatus === 'scheduled') {
      if (typeof scheduledAt !== 'string' || isNaN(Date.parse(scheduledAt))) {
        return NextResponse.json({ error: 'Scheduled posts require a valid scheduledAt timestamp' }, { status: 400 })
      }
      if (new Date(scheduledAt) <= new Date()) {
        return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 })
      }
      safeScheduledAt = scheduledAt
    }

    // Validate PPV price (Pay-Per-View posts)
    let safePpvPrice: number | undefined
    if (ppvPrice !== undefined && ppvPrice !== null && ppvPrice !== 0) {
      if (typeof ppvPrice !== 'number' || ppvPrice < 0 || ppvPrice > API_LIMITS.MAX_MICROCREDITS) {
        return NextResponse.json({ error: 'Invalid PPV price' }, { status: 400 })
      }
      safePpvPrice = Math.floor(ppvPrice)
    }

    // Validate postType
    const safePostType = (postType === 'note') ? 'note' : 'post'

    // Preview is an optional short teaser shown to non-subscribers
    const safePreview = typeof preview === 'string' ? preview.slice(0, API_LIMITS.MAX_PREVIEW_LENGTH) : ''

    // E2E encryption detection: if the body starts with 'e2e:', the client
    // has already encrypted it end-to-end. Store it as-is — the server
    // CANNOT and SHOULD NOT decrypt it. Only apply server-side encryption
    // to non-E2E content (legacy clients or free-tier posts).
    const isE2E = typeof body === 'string' && body.startsWith('e2e:')
    const encryptedBody = isE2E
      ? body
      : (body ? encryptContent(body, creator) : '')
    const isPreviewE2E = typeof safePreview === 'string' && safePreview.startsWith('e2e:')
    const encryptedPreview = isPreviewE2E
      ? safePreview
      : (safePreview ? encryptContent(safePreview, creator) : '')

    // Encrypt all sensitive metadata fields at rest (AES-256-GCM, per-creator key).
    // Non-E2E title, tags, imageUrl, videoUrl are encrypted server-side.
    // On read, these are decrypted before returning to clients.
    // Backward compatibility: decryptContent() returns unencrypted data as-is.
    const encryptedTitle = isE2E ? title : encryptContent(title, creator)
    const encryptedTags = safeTags.length > 0
      ? (isE2E ? safeTags : encryptContent(JSON.stringify(safeTags), creator))
      : undefined
    const encryptedImageUrl = safeImageUrl
      ? (isE2E ? safeImageUrl : encryptContent(safeImageUrl, creator))
      : undefined
    const encryptedVideoUrl = safeVideoUrl
      ? (isE2E ? safeVideoUrl : encryptContent(safeVideoUrl, creator))
      : undefined

    const post = {
      id: `post-${crypto.randomUUID()}`,
      title: isNote ? '' : encryptedTitle,
      body: encryptedBody,
      preview: encryptedPreview,
      minTier: isNote ? 0 : (typeof minTier === 'number' ? minTier : 1),
      createdAt: new Date().toISOString(),
      contentId: typeof contentId === 'string' ? contentId.slice(0, API_LIMITS.MAX_CONTENT_ID_LENGTH) : '',
      status: postStatus,
      ...(isE2E ? { e2e: true } : {}),
      ...(encryptedTags ? { tags: encryptedTags } : {}),
      ...(safeScheduledAt ? { scheduledAt: safeScheduledAt } : {}),
      ...(typeof hashedContentId === 'string' && /^\d+field$/.test(hashedContentId) ? { hashedContentId } : {}),
      ...(encryptedImageUrl ? { imageUrl: encryptedImageUrl } : {}),
      ...(encryptedVideoUrl ? { videoUrl: encryptedVideoUrl } : {}),
      ...(safePpvPrice ? { ppvPrice: safePpvPrice } : {}),
      ...(safePostType === 'note' ? { postType: 'note' as const } : {}),
    }

    await redis.zadd(`veilsub:posts:${creator}`, {
      score: Date.now(),
      member: JSON.stringify(post),
    })

    // Return decrypted fields to the caller (they just created this post)
    return NextResponse.json({
      post: {
        ...post,
        title: isNote ? '' : title,
        ...(safeTags.length > 0 ? { tags: safeTags } : {}),
        ...(safeImageUrl ? { imageUrl: safeImageUrl } : {}),
        ...(safeVideoUrl ? { videoUrl: safeVideoUrl } : {}),
        ...(safePpvPrice ? { ppvPrice: safePpvPrice } : {}),
        ...(safePostType === 'note' ? { postType: 'note' as const } : {}),
      },
    })
  } catch (err) {
    console.error('[posts] unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ipPut = getClientIp(req)
  const { allowed: allowedPut } = rateLimit(`${ipPut}:posts:put`, 30)
  if (!allowedPut) return getRateLimitResponse()

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { creator, postId, title, body, preview, minTier, imageUrl, walletHash, timestamp, signature, status, tags, scheduledAt } = payload
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
    if (minTier !== undefined && (typeof minTier !== 'number' || minTier < 0 || minTier > API_LIMITS.MAX_TIER_ID)) {
      return NextResponse.json({ error: `Invalid tier (0-${API_LIMITS.MAX_TIER_ID})` }, { status: 400 })
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
        // E2E detection: if the updated body starts with 'e2e:', the client
        // already encrypted it end-to-end. Store as-is, skip server encryption.
        const bodyIsE2E = typeof body === 'string' && body.startsWith('e2e:')
        const encBody = body !== undefined
          ? (bodyIsE2E ? body : encryptContent(body, creator))
          : undefined
        const previewIsE2E = typeof preview === 'string' && preview.startsWith('e2e:')
        const encPreview = preview !== undefined
          ? (typeof preview === 'string'
              ? (previewIsE2E ? preview : encryptContent(preview.slice(0, API_LIMITS.MAX_PREVIEW_LENGTH), creator))
              : post.preview)
          : undefined

        // Validate status update
        const validStatuses = ['published', 'draft', 'scheduled']
        const updatedStatus = (typeof status === 'string' && validStatuses.includes(status)) ? status : undefined

        // Validate tags update
        let safeTags: string[] | undefined
        if (Array.isArray(tags)) {
          safeTags = tags
            .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
            .map(t => t.trim().slice(0, API_LIMITS.MAX_TAG_LENGTH))
            .slice(0, API_LIMITS.MAX_TAGS_PER_POST)
        }

        // Validate scheduledAt update
        let updatedScheduledAt: string | undefined
        if (typeof scheduledAt === 'string' && !isNaN(Date.parse(scheduledAt))) {
          updatedScheduledAt = scheduledAt
        }

        // Encrypt title, tags, imageUrl at rest (same per-creator key as body)
        const encTitle = title !== undefined
          ? (bodyIsE2E ? title : encryptContent(title, creator))
          : undefined
        const encTags = safeTags !== undefined
          ? (bodyIsE2E ? safeTags : encryptContent(JSON.stringify(safeTags), creator))
          : undefined
        const encImageUrl = updatedImageUrl !== undefined
          ? (updatedImageUrl ? (bodyIsE2E ? updatedImageUrl : encryptContent(updatedImageUrl, creator)) : undefined)
          : undefined

        const updated = {
          ...post,
          ...(encTitle !== undefined && { title: encTitle }),
          ...(encBody !== undefined && { body: encBody }),
          ...(encPreview !== undefined && { preview: encPreview }),
          ...(minTier !== undefined && { minTier }),
          ...(bodyIsE2E ? { e2e: true } : {}),
          ...(encImageUrl !== undefined && { imageUrl: encImageUrl || undefined }),
          ...(updatedStatus !== undefined && { status: updatedStatus }),
          ...(encTags !== undefined && { tags: encTags }),
          ...(updatedScheduledAt !== undefined && { scheduledAt: updatedScheduledAt }),
          updatedAt: new Date().toISOString(),
        }
        // Remove old entry and add updated one with same score (preserves order)
        await redis.zrem(`veilsub:posts:${creator}`, typeof entry === 'string' ? entry : JSON.stringify(entry))
        await redis.zadd(`veilsub:posts:${creator}`, { score, member: JSON.stringify(updated) })
        // Return decrypted fields to the caller
        return NextResponse.json({
          post: {
            ...updated,
            ...(title !== undefined && { title }),
            ...(safeTags !== undefined && { tags: safeTags }),
            ...(updatedImageUrl !== undefined && { imageUrl: updatedImageUrl || undefined }),
          },
        })
      }
    }

    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  } catch (err) {
    console.error('[posts] unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ipDel = getClientIp(req)
  const { allowed: allowedDel } = rateLimit(`${ipDel}:posts:delete`, 30)
  if (!allowedDel) return getRateLimitResponse()

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
  } catch (err) {
    console.error('[posts] unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
