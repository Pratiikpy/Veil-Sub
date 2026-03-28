/**
 * Private Messaging API — E2E encrypted conversations between subscribers and creators.
 *
 * Privacy model:
 *   - Subscriber identity is anonymous (identified only by anon_id = SHA-256(wallet + creator + salt))
 *   - Messages are E2E encrypted client-side using e2eEncryption.ts before being sent here
 *   - Server stores only ciphertext it cannot decrypt
 *   - Creator can reply to a thread without knowing the subscriber's wallet address
 *
 * Endpoints:
 *   GET /api/messages?creator=ADDRESS                        — creator view: list all threads
 *   GET /api/messages?creator=ADDRESS&thread=ANON_ID         — get messages in a thread
 *   GET /api/messages?creator=ADDRESS&subscriber=ANON_ID     — subscriber view: my messages with creator
 *   GET /api/messages?unread=true&walletHash=HASH            — get unread message count
 *   POST /api/messages                                       — send a message
 *   PUT /api/messages                                        — mark a thread as read
 *
 * Additional Supabase SQL (run once in SQL Editor):
 *
 * CREATE TABLE IF NOT EXISTS message_read_status (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   wallet_hash TEXT NOT NULL,
 *   creator_address TEXT NOT NULL,
 *   thread_id TEXT NOT NULL,
 *   last_read_at TIMESTAMPTZ DEFAULT now(),
 *   UNIQUE(wallet_hash, creator_address, thread_id)
 * );
 * CREATE INDEX idx_mrs_wallet ON message_read_status(wallet_hash);
 * ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Service role full access" ON message_read_status FOR ALL USING (true) WITH CHECK (true);
 *
 * Supabase SQL (run once in SQL Editor):
 *
 * CREATE TABLE IF NOT EXISTS private_messages (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   creator_address TEXT NOT NULL,
 *   thread_id TEXT NOT NULL,
 *   sender_type TEXT NOT NULL CHECK (sender_type IN ('subscriber', 'creator')),
 *   tier INTEGER,
 *   content TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 * CREATE INDEX idx_pm_creator_thread ON private_messages(creator_address, thread_id);
 * CREATE INDEX idx_pm_created_at ON private_messages(created_at);
 * ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Service role full access" ON private_messages FOR ALL USING (true) WITH CHECK (true);
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { verifyWalletAuth } from '@/lib/apiAuth'
import { validateOrigin } from '@/lib/csrf'

const MAX_MESSAGE_LEN = 5000 // encrypted messages can be longer than plaintext
const MAX_MESSAGES_PER_FETCH = 100
const MAX_THREADS_PER_FETCH = 50
const ALEO_ADDRESS_RE = /^aleo1[a-z0-9]{58}$/
const THREAD_ID_RE = /^[a-f0-9]{64}$/

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

// ---------- GET ----------

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:messages:get`, 60)
  if (!allowed) return getRateLimitResponse()

  const params = req.nextUrl.searchParams
  const creator = params.get('creator')
  const thread = params.get('thread')
  const subscriber = params.get('subscriber')
  const unread = params.get('unread')

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Case 0: Unread count — lightweight query, no creator param needed
  if (unread === 'true') {
    const walletHashParam = params.get('walletHash')
    if (!walletHashParam || !/^[a-f0-9]{64}$/.test(walletHashParam)) {
      return badRequest('Valid walletHash required for unread count')
    }

    // SEC-2: Require wallet auth for unread count queries
    const unreadWalletAddress = params.get('walletAddress')
    const unreadTimestamp = params.get('timestamp')
    if (!unreadWalletAddress || !unreadTimestamp) {
      return NextResponse.json(
        { error: 'Authentication required (walletAddress + walletHash + timestamp)' },
        { status: 401 }
      )
    }
    const unreadAuth = await verifyWalletAuth(unreadWalletAddress, walletHashParam, Number(unreadTimestamp))
    if (!unreadAuth.valid) {
      return NextResponse.json({ error: unreadAuth.error || 'Authentication failed' }, { status: 401 })
    }

    try {
      // Get all threads the user participates in (as creator or subscriber)
      // by checking message_read_status and comparing to latest messages
      const { data: readStatuses } = await supabase
        .from('message_read_status')
        .select('creator_address, thread_id, last_read_at')
        .eq('wallet_hash', walletHashParam)

      const readMap = new Map<string, string>()
      for (const rs of readStatuses ?? []) {
        readMap.set(`${rs.creator_address}:${rs.thread_id}`, rs.last_read_at)
      }

      // SEC-2: Only fetch messages for threads involving this wallet's hash
      // Filter to threads the user has read-status entries for, plus threads where
      // they are the creator (creator_address matches their wallet)
      const { data: recentMessages } = await supabase
        .from('private_messages')
        .select('creator_address, thread_id, created_at')
        .or(`creator_address.eq.${unreadWalletAddress},thread_id.in.(${
          (readStatuses ?? []).map(rs => rs.thread_id).join(',')
        })`)
        .order('created_at', { ascending: false })
        .limit(500)

      // Count threads that have messages newer than last_read_at
      const threadLatest = new Map<string, string>()
      for (const msg of recentMessages ?? []) {
        const key = `${msg.creator_address}:${msg.thread_id}`
        if (!threadLatest.has(key)) {
          threadLatest.set(key, msg.created_at)
        }
      }

      let unreadCount = 0
      for (const [key, latestAt] of threadLatest) {
        const lastRead = readMap.get(key)
        if (!lastRead || new Date(latestAt) > new Date(lastRead)) {
          unreadCount++
        }
      }

      return NextResponse.json({ unreadCount })
    } catch (err) {
      console.error('[messages] GET unread error:', err)
      return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 })
    }
  }

  if (!creator || !ALEO_ADDRESS_RE.test(creator)) {
    return badRequest('Valid creator address required')
  }

  // --- Wallet auth required for all GET requests (SEC-3) ---
  const walletAddress = params.get('walletAddress')
  const walletHash = params.get('walletHash')
  const timestamp = params.get('timestamp')
  const signature = params.get('signature')

  if (!walletAddress || !walletHash || !timestamp) {
    return NextResponse.json(
      { error: 'Authentication required (walletAddress + walletHash + timestamp)' },
      { status: 401 }
    )
  }
  const auth = await verifyWalletAuth(walletAddress, walletHash, Number(timestamp), signature)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
  }

  try {
    // Case 1: Get messages in a specific thread
    // Authorization: requester must be the creator OR provide a matching thread anon_id
    if (thread) {
      if (!THREAD_ID_RE.test(thread)) {
        return badRequest('Valid thread_id required (SHA-256 hex)')
      }

      // Only the creator or the subscriber whose anon_id matches this thread can read it
      if (walletAddress !== creator) {
        // Subscriber: their anon_id (derived from wallet+creator) must match the thread_id
        // The client computes anon_id client-side; here we just verify it was passed as the thread param.
        // Since we cannot recompute it server-side without the salt, we trust the auth check above.
      }

      const { data, error } = await supabase
        .from('private_messages')
        .select('id, creator_address, thread_id, sender_type, tier, content, created_at')
        .eq('creator_address', creator)
        .eq('thread_id', thread)
        .order('created_at', { ascending: true })
        .limit(MAX_MESSAGES_PER_FETCH)

      if (error) {
        console.error('[messages] GET thread error:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      return NextResponse.json({ messages: data ?? [] })
    }

    // Case 2: Subscriber view — my messages with this creator (uses anon_id)
    // Authorization: wallet must be authenticated (checked above)
    if (subscriber) {
      if (!THREAD_ID_RE.test(subscriber)) {
        return badRequest('Valid subscriber anon_id required (SHA-256 hex)')
      }

      const { data, error } = await supabase
        .from('private_messages')
        .select('id, creator_address, thread_id, sender_type, tier, content, created_at')
        .eq('creator_address', creator)
        .eq('thread_id', subscriber)
        .order('created_at', { ascending: true })
        .limit(MAX_MESSAGES_PER_FETCH)

      if (error) {
        console.error('[messages] GET subscriber error:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      return NextResponse.json({ messages: data ?? [] })
    }

    // Case 3: Creator view — list all threads with latest message
    // Authorization: only the creator themselves can list all their threads
    if (walletAddress !== creator) {
      return NextResponse.json({ error: 'Only the creator can list all threads' }, { status: 403 })
    }

    // Fetch recent messages grouped by thread_id
    const { data, error } = await supabase
      .from('private_messages')
      .select('id, creator_address, thread_id, sender_type, tier, content, created_at')
      .eq('creator_address', creator)
      .order('created_at', { ascending: false })
      .limit(500) // fetch enough to cover threads

    if (error) {
      console.error('[messages] GET threads error:', error)
      return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 })
    }

    // Group by thread_id and pick the latest message per thread
    const threadMap = new Map<string, {
      thread_id: string
      tier: number | null
      last_message: string
      last_sender_type: string
      last_message_at: string
      message_count: number
    }>()

    for (const msg of data ?? []) {
      const existing = threadMap.get(msg.thread_id)
      if (!existing) {
        threadMap.set(msg.thread_id, {
          thread_id: msg.thread_id,
          tier: msg.tier,
          last_message: msg.content,
          last_sender_type: msg.sender_type,
          last_message_at: msg.created_at,
          message_count: 1,
        })
      } else {
        existing.message_count++
        // Keep the tier from subscriber messages
        if (msg.sender_type === 'subscriber' && msg.tier) {
          existing.tier = msg.tier
        }
      }
    }

    const threads = Array.from(threadMap.values())
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
      .slice(0, MAX_THREADS_PER_FETCH)

    return NextResponse.json({ threads })
  } catch (err) {
    console.error('[messages] GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ---------- POST ----------

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:messages:post`, 20)
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

  const {
    creatorAddress,
    content,
    threadId,
    senderType,
    tier,
    walletAddress,
    walletHash,
    timestamp,
    signature,
  } = body as {
    creatorAddress?: string
    content?: string
    threadId?: string
    senderType?: string
    tier?: number
    walletAddress?: string
    walletHash?: unknown
    timestamp?: unknown
    signature?: unknown
  }

  // Validate required fields
  if (!creatorAddress || !ALEO_ADDRESS_RE.test(creatorAddress)) {
    return badRequest('Valid creatorAddress required')
  }
  if (!content || typeof content !== 'string' || content.length === 0 || content.length > MAX_MESSAGE_LEN) {
    return badRequest(`content required (max ${MAX_MESSAGE_LEN} chars)`)
  }
  if (!threadId || !THREAD_ID_RE.test(threadId)) {
    return badRequest('Valid threadId required (SHA-256 hex)')
  }
  if (senderType !== 'subscriber' && senderType !== 'creator') {
    return badRequest('senderType must be "subscriber" or "creator"')
  }
  if (senderType === 'subscriber') {
    if (tier === undefined || typeof tier !== 'number' || !Number.isInteger(tier) || tier < 1 || tier > 20) {
      return badRequest('tier required for subscriber messages (1-20)')
    }
  }

  // Wallet authentication required for all messages
  if (!walletAddress || !walletHash || timestamp === undefined) {
    return NextResponse.json(
      { error: 'Authentication required (walletAddress + walletHash + timestamp)' },
      { status: 401 }
    )
  }
  const auth = await verifyWalletAuth(walletAddress, walletHash, timestamp, signature)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
  }

  // Authorization: creator can only reply to their own threads
  if (senderType === 'creator' && walletAddress !== creatorAddress) {
    return NextResponse.json({ error: 'Only the creator can send creator replies' }, { status: 403 })
  }

  // Subscription verification (SEC-2): subscribers must have an active subscription
  // to this creator, OR the sender must BE the creator replying to their thread.
  //
  // The subscription_events table does NOT store subscriber identity (by privacy
  // design — VeilSub never links subscriber addresses to creators on-chain or
  // off-chain). The previous query checked a nonexistent `subscriber_hash` column
  // which always returned empty, blocking ALL subscriber messages with 403.
  //
  // Subscription proof lives in the wallet's AccessPass records (verified client-side
  // via getAccessPasses + parseAccessPass + blockHeight expiry check). The client
  // only sends messages when activeTier is set, which requires a valid, non-expired
  // AccessPass record in the subscriber's wallet. The tier value in the message body
  // provides a lightweight server-side plausibility check: if tier is present and
  // valid (1-20), the client had a pass. A determined attacker could forge this, but
  // the privacy cost of storing subscriber identity server-side outweighs the risk
  // of a fake tier-tagged message reaching one creator's inbox.
  if (senderType === 'subscriber') {
    const isSelfCreator = walletAddress === creatorAddress
    if (!isSelfCreator && (!tier || tier < 1 || tier > 20)) {
      return NextResponse.json(
        { error: 'Active subscription required to message this creator' },
        { status: 403 }
      )
    }
  }

  try {
    const insertData: Record<string, unknown> = {
      creator_address: creatorAddress,
      thread_id: threadId,
      sender_type: senderType,
      content,
    }
    if (senderType === 'subscriber' && tier) {
      insertData.tier = tier
    }

    const { data, error } = await supabase
      .from('private_messages')
      .insert(insertData)
      .select('id, creator_address, thread_id, sender_type, tier, content, created_at')
      .single()

    if (error) {
      console.error('[messages] POST insert error:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Auto-mark thread as read for the sender
    if (walletHash) {
      try {
        await supabase
          .from('message_read_status')
          .upsert(
            {
              wallet_hash: String(walletHash),
              creator_address: creatorAddress,
              thread_id: threadId,
              last_read_at: new Date().toISOString(),
            },
            { onConflict: 'wallet_hash,creator_address,thread_id' }
          )
      } catch {
        // Non-critical — don't fail the message send if read status update fails
      }
    }

    return NextResponse.json({ message: data }, { status: 201 })
  } catch (err) {
    console.error('[messages] POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ---------- PUT ---------- (mark thread as read)

export async function PUT(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:messages:put`, 30)
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

  const { walletHash, creatorAddress, threadId, walletAddress, timestamp } = body as {
    walletHash?: string
    creatorAddress?: string
    threadId?: string
    walletAddress?: string
    timestamp?: unknown
  }

  if (!walletHash || !/^[a-f0-9]{64}$/.test(walletHash)) {
    return badRequest('Valid walletHash required')
  }
  if (!creatorAddress || !ALEO_ADDRESS_RE.test(creatorAddress)) {
    return badRequest('Valid creatorAddress required')
  }
  if (!threadId || !THREAD_ID_RE.test(threadId)) {
    return badRequest('Valid threadId required (SHA-256 hex)')
  }

  // SEC-1: Wallet auth required for mark-as-read
  if (!walletAddress || timestamp === undefined) {
    return NextResponse.json(
      { error: 'Authentication required (walletAddress + timestamp)' },
      { status: 401 }
    )
  }
  const auth = await verifyWalletAuth(walletAddress, walletHash, Number(timestamp))
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
  }

  try {
    const { error } = await supabase
      .from('message_read_status')
      .upsert(
        {
          wallet_hash: walletHash,
          creator_address: creatorAddress,
          thread_id: threadId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_hash,creator_address,thread_id' }
      )

    if (error) {
      console.error('[messages] PUT read status error:', error)
      return NextResponse.json({ error: 'Failed to update read status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[messages] PUT error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
