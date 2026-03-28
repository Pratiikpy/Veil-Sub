import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { verifyWalletAuth } from '@/lib/apiAuth'
import { validateOrigin } from '@/lib/csrf'

/**
 * Supabase table (run once in SQL editor):
 *
 * CREATE TABLE IF NOT EXISTS notification_emails (
 *   subscriber_hash TEXT PRIMARY KEY,
 *   email TEXT NOT NULL,
 *   creator_hashes TEXT[] DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 * ALTER TABLE notification_emails ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Service role full access" ON notification_emails
 *   FOR ALL USING (true) WITH CHECK (true);
 */

/**
 * GET /api/notification-emails?subscriber_hash=xxx
 *
 * Retrieve notification email preferences for a subscriber.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`notif-email:get:${ip}`, 20, 60_000)
  if (!allowed) return getRateLimitResponse()

  const subscriberHash = req.nextUrl.searchParams.get('subscriber_hash')
  if (!subscriberHash || !/^[a-f0-9]{64}$/.test(subscriberHash)) {
    return NextResponse.json({ error: 'Valid subscriber_hash required' }, { status: 400 })
  }

  // Wallet authentication — email preferences contain PII (email address)
  const walletAddress = req.nextUrl.searchParams.get('walletAddress')
  const walletHash = req.nextUrl.searchParams.get('walletHash')
  const timestamp = req.nextUrl.searchParams.get('timestamp')
  if (!walletAddress || !walletHash || !timestamp) {
    return NextResponse.json({ error: 'Authentication required (walletAddress + walletHash + timestamp)' }, { status: 401 })
  }
  const auth = await verifyWalletAuth(walletAddress, walletHash, Number(timestamp))
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const { data, error } = await supabase
      .from('notification_emails')
      .select('email, creator_hashes, created_at')
      .eq('subscriber_hash', subscriberHash)
      .single()

    if (error || !data) {
      // No record found — not an error, subscriber just hasn't opted in
      return NextResponse.json({ subscription: null })
    }

    return NextResponse.json({
      subscription: {
        email: data.email,
        creatorHashes: data.creator_hashes || [],
        createdAt: data.created_at,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }
}

/**
 * POST /api/notification-emails
 *
 * Create or update notification email preferences.
 *
 * Body: {
 *   subscriberHash: string  (SHA-256 of wallet address)
 *   email: string
 *   creatorHashes: string[] (SHA-256 of creator addresses to get notifications for)
 * }
 */
export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ip = getClientIp(req)
  const { allowed } = rateLimit(`notif-email:post:${ip}`, 10, 60_000)
  if (!allowed) return getRateLimitResponse()

  let body: {
    subscriberHash?: string
    email?: string
    creatorHashes?: string[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { subscriberHash, email, creatorHashes, walletAddress, walletHash, timestamp: authTimestamp, signature } = body as {
    subscriberHash?: string; email?: string; creatorHashes?: string[]
    walletAddress?: string; walletHash?: unknown; timestamp?: unknown; signature?: unknown
  }

  // Wallet authentication
  if (walletAddress && walletHash) {
    const auth = await verifyWalletAuth(walletAddress, walletHash, authTimestamp, signature)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
    }
  } else {
    return NextResponse.json({ error: 'Authentication required (walletAddress + walletHash + timestamp)' }, { status: 401 })
  }

  // Validate subscriber hash
  if (!subscriberHash || typeof subscriberHash !== 'string' || !/^[a-f0-9]{64}$/.test(subscriberHash)) {
    return NextResponse.json({ error: 'Valid subscriber_hash required (SHA-256 hex)' }, { status: 400 })
  }

  // Validate email
  if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 320) {
    return NextResponse.json({ error: 'Valid email address required' }, { status: 400 })
  }

  // Validate creator hashes (optional, defaults to empty)
  const safeCreatorHashes = Array.isArray(creatorHashes)
    ? creatorHashes.filter(h => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h)).slice(0, 50)
    : []

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const { error } = await supabase
      .from('notification_emails')
      .upsert(
        {
          subscriber_hash: subscriberHash,
          email,
          creator_hashes: safeCreatorHashes,
        },
        { onConflict: 'subscriber_hash' }
      )

    if (error) {
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }
}

/**
 * DELETE /api/notification-emails
 *
 * Remove notification email preferences (unsubscribe).
 *
 * Body: { subscriberHash: string }
 */
export async function DELETE(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ip = getClientIp(req)
  const { allowed } = rateLimit(`notif-email:del:${ip}`, 10, 60_000)
  if (!allowed) return getRateLimitResponse()

  let body: { subscriberHash?: string; walletAddress?: string; walletHash?: unknown; timestamp?: unknown; signature?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { subscriberHash, walletAddress: delWallet, walletHash: delHash, timestamp: delTimestamp, signature: delSig } = body

  // Wallet authentication
  if (delWallet && delHash) {
    const auth = await verifyWalletAuth(delWallet, delHash, delTimestamp, delSig)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
    }
  } else {
    return NextResponse.json({ error: 'Authentication required (walletAddress + walletHash + timestamp)' }, { status: 401 })
  }

  if (!subscriberHash || typeof subscriberHash !== 'string' || !/^[a-f0-9]{64}$/.test(subscriberHash)) {
    return NextResponse.json({ error: 'Valid subscriber_hash required' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    await supabase
      .from('notification_emails')
      .delete()
      .eq('subscriber_hash', subscriberHash)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete preferences' }, { status: 500 })
  }
}
