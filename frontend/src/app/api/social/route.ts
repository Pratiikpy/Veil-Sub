/**
 * Social Interactions API — comments, reactions (aggregate counts)
 *
 * Privacy: subscriber_hash = SHA-256(wallet), never raw addresses.
 * Reaction counts are aggregate only. Bookmarks stay client-side.
 *
 * Anonymous comments: subscribers can comment showing only their tier level
 * (e.g. "Tier 2 Subscriber") instead of their identity. Uses a per-post
 * anon_id = SHA-256(wallet + postId + salt) for spam detection while
 * preserving anonymity.
 *
 * Supabase SQL (run once in SQL Editor):
 *
 * CREATE TABLE IF NOT EXISTS post_comments (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   content_id TEXT NOT NULL, subscriber_hash TEXT NOT NULL,
 *   text TEXT NOT NULL CHECK (char_length(text) <= 280),
 *   parent_id UUID REFERENCES post_comments(id),
 *   likes_count INTEGER DEFAULT 0,
 *   author_type TEXT DEFAULT 'identified',
 *   anon_id TEXT,
 *   tier INTEGER,
 *   created_at TIMESTAMPTZ DEFAULT now());
 * CREATE INDEX idx_comments_content ON post_comments(content_id);
 * ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "anyone_can_read_comments" ON post_comments FOR SELECT USING (true);
 * CREATE POLICY "service_role_manages_comments" ON post_comments FOR ALL USING (true);
 *
 * -- Migration for existing tables:
 * ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS author_type TEXT DEFAULT 'identified';
 * ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS anon_id TEXT;
 * ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS tier INTEGER;
 *
 * CREATE TABLE IF NOT EXISTS post_reaction_counts (
 *   content_id TEXT NOT NULL, reaction_type TEXT NOT NULL,
 *   count INTEGER DEFAULT 0, PRIMARY KEY (content_id, reaction_type));
 * ALTER TABLE post_reaction_counts ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "anyone_can_read_reactions" ON post_reaction_counts FOR SELECT USING (true);
 * CREATE POLICY "service_role_manages_reactions" ON post_reaction_counts FOR ALL USING (true);
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { verifyWalletAuth } from '@/lib/apiAuth'
import { validateOrigin } from '@/lib/csrf'

const VALID_REACTION_TYPES = new Set(['heart', 'fire', 'clap', 'wow', 'idea', 'pray', 'endorse'])
const MAX_COMMENT_LEN = 280
const MAX_COMMENTS_PER_FETCH = 100
const CONTENT_ID_RE = /^[\w-]{1,128}$/

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

// ---------- GET ----------

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:social:get`, 60)
  if (!allowed) return getRateLimitResponse()

  const params = req.nextUrl.searchParams
  const type = params.get('type')
  const contentId = params.get('contentId')

  if (!type || !contentId || !CONTENT_ID_RE.test(contentId)) {
    return badRequest('type and valid contentId required')
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    if (type === 'comments') {
      const { data, error } = await supabase
        .from('post_comments')
        .select('id, content_id, subscriber_hash, text, parent_id, likes_count, author_type, anon_id, tier, created_at')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false })
        .limit(MAX_COMMENTS_PER_FETCH)

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
      }
      return NextResponse.json({ comments: data ?? [] }, {
        headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
      })
    }

    if (type === 'reactions') {
      const { data, error } = await supabase
        .from('post_reaction_counts')
        .select('reaction_type, count')
        .eq('content_id', contentId)

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 })
      }

      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        if (row.count > 0) counts[row.reaction_type] = row.count
      }
      return NextResponse.json({ counts }, {
        headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
      })
    }

    return badRequest('type must be "comments" or "reactions"')
  } catch (err) {
    console.error('[social] GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ---------- POST ----------

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:social:post`, 30)
  if (!allowed) return getRateLimitResponse()

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const { type, contentId } = body as { type?: string; contentId?: string }
  if (!type || !contentId || typeof contentId !== 'string' || !CONTENT_ID_RE.test(contentId)) {
    return badRequest('type and valid contentId required')
  }

  // Wallet authentication — required for comments and endorsements (create persistent data),
  // optional for reactions/likes (lightweight, CSRF-protected by validateOrigin above)
  const { walletAddress, walletHash, timestamp, signature } = body as {
    walletAddress?: string; walletHash?: unknown; timestamp?: unknown; signature?: unknown
  }
  if (type === 'comment' || type === 'endorse') {
    if (!walletAddress || !walletHash || timestamp === undefined) {
      return NextResponse.json({ error: 'Authentication required (walletAddress + walletHash + timestamp)' }, { status: 401 })
    }
    const auth = await verifyWalletAuth(walletAddress, walletHash, timestamp, signature)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
    }
  }

  try {
    // --- Create comment ---
    if (type === 'comment') {
      const { text, subscriberHash, parentId, anonymousTier, anonId } = body as {
        text?: string; subscriberHash?: string; parentId?: string
        anonymousTier?: number; anonId?: string
      }
      if (!text || typeof text !== 'string' || text.trim().length === 0 || text.length > MAX_COMMENT_LEN) {
        return badRequest(`text required (max ${MAX_COMMENT_LEN} chars)`)
      }
      if (!subscriberHash || typeof subscriberHash !== 'string' || !/^[a-f0-9]{64}$/.test(subscriberHash)) {
        return badRequest('Valid subscriberHash required (SHA-256 hex)')
      }
      // Validate parentId format if provided (UUID)
      if (parentId !== undefined && parentId !== null) {
        if (typeof parentId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentId)) {
          return badRequest('Invalid parentId format')
        }
      }
      // Validate anonymous comment fields
      const isAnonymous = anonymousTier !== undefined && anonymousTier !== null
      if (isAnonymous) {
        if (typeof anonymousTier !== 'number' || !Number.isInteger(anonymousTier) || anonymousTier < 1 || anonymousTier > 20) {
          return badRequest('anonymousTier must be an integer between 1 and 20')
        }
        if (!anonId || typeof anonId !== 'string' || !/^[a-f0-9]{64}$/.test(anonId)) {
          return badRequest('Valid anonId required for anonymous comments (SHA-256 hex)')
        }
      }

      const insertData: Record<string, unknown> = {
        content_id: contentId,
        subscriber_hash: isAnonymous ? anonId : subscriberHash,
        text: text.trim(),
        parent_id: parentId || null,
      }
      if (isAnonymous) {
        insertData.author_type = 'anonymous'
        insertData.anon_id = anonId
        insertData.tier = anonymousTier
      }

      const { data, error } = await supabase
        .from('post_comments')
        .insert(insertData)
        .select('id, content_id, subscriber_hash, text, parent_id, likes_count, author_type, anon_id, tier, created_at')
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
      }
      return NextResponse.json({ comment: data }, { status: 201 })
    }

    // --- Toggle reaction (increment / decrement) ---
    if (type === 'reaction') {
      const { reactionType, delta } = body as { reactionType?: string; delta?: number }
      if (!reactionType || !VALID_REACTION_TYPES.has(reactionType)) {
        return badRequest('Valid reactionType required (heart|fire|clap|wow|idea|pray|endorse)')
      }
      if (delta !== 1 && delta !== -1) {
        return badRequest('delta must be 1 or -1')
      }

      // Upsert: create row if missing, then increment/decrement
      const { data: existing } = await supabase
        .from('post_reaction_counts')
        .select('count')
        .eq('content_id', contentId)
        .eq('reaction_type', reactionType)
        .single()

      const currentCount = existing?.count ?? 0
      const newCount = Math.max(0, currentCount + delta)

      if (!existing) {
        // Insert new row
        const { error } = await supabase
          .from('post_reaction_counts')
          .insert({ content_id: contentId, reaction_type: reactionType, count: newCount })

        if (error) {
          return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 })
        }
      } else {
        // Update existing row
        const { error } = await supabase
          .from('post_reaction_counts')
          .update({ count: newCount })
          .eq('content_id', contentId)
          .eq('reaction_type', reactionType)

        if (error) {
          return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 })
        }
      }

      return NextResponse.json({ reactionType, count: newCount })
    }

    // --- Like a comment (increment / decrement likes_count) ---
    if (type === 'comment_like') {
      const { commentId, delta } = body as { commentId?: string; delta?: number }
      if (!commentId || typeof commentId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commentId)) {
        return badRequest('Valid commentId required (UUID)')
      }
      if (delta !== 1 && delta !== -1) {
        return badRequest('delta must be 1 or -1')
      }

      const { data: comment } = await supabase
        .from('post_comments')
        .select('likes_count')
        .eq('id', commentId)
        .single()

      if (!comment) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
      }

      const newLikes = Math.max(0, (comment.likes_count ?? 0) + delta)
      const { error } = await supabase
        .from('post_comments')
        .update({ likes_count: newLikes })
        .eq('id', commentId)

      if (error) {
        return NextResponse.json({ error: 'Failed to update like' }, { status: 500 })
      }

      return NextResponse.json({ commentId, likes_count: newLikes })
    }

    return badRequest('type must be "comment", "reaction", or "comment_like"')
  } catch (err) {
    console.error('[social] POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
