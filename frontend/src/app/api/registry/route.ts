import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { ALEO_ADDRESS_RE, AUTH_CONFIG } from '@/lib/config'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { validateOrigin } from '@/lib/csrf'
import { timingSafeEqual } from 'crypto'

// Valid registry entry types
const VALID_TYPES = ['auction', 'chat_room', 'proposal', 'story', 'collab'] as const
type RegistryType = (typeof VALID_TYPES)[number]

function isValidType(t: unknown): t is RegistryType {
  return typeof t === 'string' && (VALID_TYPES as readonly string[]).includes(t)
}

// ─── GET: Public discovery — list registry entries by type ─────────────────

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:registry:get`, 30)
  if (!allowed) return getRateLimitResponse()

  const type = req.nextUrl.searchParams.get('type')
  if (!type || !isValidType(type)) {
    return NextResponse.json(
      { error: 'Valid type required (auction, chat_room, proposal, story, collab)' },
      { status: 400 }
    )
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ entries: [], error: 'Database unavailable' }, { status: 503 })
  }

  try {
    const { data, error } = await supabase
      .from('companion_registry')
      .select('id, type, creator_address, item_id, label, metadata, tx_id, created_at')
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[registry] supabase query error:', error.message)
      return NextResponse.json({ entries: [], error: 'Query failed' }, { status: 500 })
    }

    return NextResponse.json(
      { entries: data ?? [] },
      { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' } }
    )
  } catch (err) {
    console.error('[registry] unexpected error:', err)
    return NextResponse.json({ entries: [], error: 'Internal error' }, { status: 500 })
  }
}

// ─── Wallet auth verification (same pattern as posts/route.ts) ────────────

async function verifyWalletAuth(
  creatorAddress: string,
  walletHash: unknown,
  timestamp: unknown
): Promise<string | null> {
  if (typeof walletHash !== 'string' || !/^[a-f0-9]{64}$/.test(walletHash)) {
    return 'Invalid wallet hash'
  }
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return 'Invalid timestamp'
  }
  if (Math.abs(Date.now() - timestamp) > AUTH_CONFIG.TIMESTAMP_WINDOW_MS) {
    return 'Request expired'
  }

  const salt =
    process.env.WALLET_AUTH_SECRET ||
    process.env.NEXT_PUBLIC_WALLET_AUTH_SALT ||
    'veilsub-auth-v1'
  const encoder = new TextEncoder()
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(creatorAddress + salt))
  const expectedHash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const hashBuffer1 = Buffer.from(walletHash, 'hex')
  const hashBuffer2 = Buffer.from(expectedHash, 'hex')
  if (hashBuffer1.length !== hashBuffer2.length || !timingSafeEqual(hashBuffer1, hashBuffer2)) {
    return 'Wallet hash mismatch'
  }

  return null // valid
}

// ─── POST: Create a registry entry (requires wallet auth) ─────────────────

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:registry:post`, 10)
  if (!allowed) return getRateLimitResponse()

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const {
      type,
      creatorAddress,
      itemId,
      label,
      metadata,
      txId,
      walletAddress,
      walletHash,
      timestamp,
    } = payload as {
      type: unknown
      creatorAddress: unknown
      itemId: unknown
      label: unknown
      metadata: unknown
      txId: unknown
      walletAddress: unknown
      walletHash: unknown
      timestamp: unknown
    }

    // Validate required fields
    if (!isValidType(type)) {
      return NextResponse.json(
        { error: 'Valid type required (auction, chat_room, proposal, story, collab)' },
        { status: 400 }
      )
    }
    if (typeof creatorAddress !== 'string' || !ALEO_ADDRESS_RE.test(creatorAddress)) {
      return NextResponse.json({ error: 'Valid creator address required' }, { status: 400 })
    }
    if (typeof itemId !== 'string' || itemId.length === 0 || itemId.length > 200) {
      return NextResponse.json({ error: 'Valid item ID required (max 200 chars)' }, { status: 400 })
    }

    // Wallet auth: the address used for auth is walletAddress (or creatorAddress as fallback)
    const authAddress =
      typeof walletAddress === 'string' && ALEO_ADDRESS_RE.test(walletAddress)
        ? walletAddress
        : creatorAddress
    const authError = await verifyWalletAuth(authAddress, walletHash, timestamp)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 403 })
    }

    // Sanitize optional fields
    const safeLabel =
      typeof label === 'string' ? label.slice(0, 200) : null
    const safeMetadata =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? metadata
        : {}
    const safeTxId =
      typeof txId === 'string' ? txId.slice(0, 128) : null

    // Per-address rate limit via Supabase: max 20 entries per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('companion_registry')
      .select('id', { count: 'exact', head: true })
      .eq('creator_address', creatorAddress)
      .gte('created_at', oneHourAgo)

    if (recentCount !== null && recentCount >= 20) {
      return NextResponse.json({ error: 'Rate limited — max 20 entries per hour' }, { status: 429 })
    }

    // Insert
    const { data, error } = await supabase
      .from('companion_registry')
      .insert({
        type,
        creator_address: creatorAddress,
        item_id: itemId,
        label: safeLabel,
        metadata: safeMetadata,
        tx_id: safeTxId,
      })
      .select('id, type, creator_address, item_id, label, metadata, tx_id, created_at')
      .single()

    if (error) {
      console.error('[registry] insert error:', error.message)
      return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
    }

    return NextResponse.json({ entry: data }, { status: 201 })
  } catch (err) {
    console.error('[registry] unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
