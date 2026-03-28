import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { hashAddress } from '@/lib/encryption'
import { getRedis } from '@/lib/redis'
import { API_LIMITS, RATE_LIMITS, CACHE_HEADERS, AUTH_CONFIG, ALEO_ADDRESS_RE } from '@/lib/config'
import { rateLimit as rl, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { validateOrigin } from '@/lib/csrf'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rl(`${ip}:analytics:get`, 60)
  if (!allowed) return getRateLimitResponse()

  const addressHash = req.nextUrl.searchParams.get('creator_address_hash')
  const recent = req.nextUrl.searchParams.get('recent')
  const globalStats = req.nextUrl.searchParams.get('global_stats')

  const supabase = getServerSupabase()

  // Global platform stats
  if (globalStats === 'true') {
    if (!supabase) {
      return NextResponse.json({
        totalCreators: 0,
        totalSubscriptions: 0,
        totalRevenue: 0,
        activePrograms: 1,
        fallback: 'no_database',
      }, {
        status: 503,
        headers: {
          'Cache-Control': CACHE_HEADERS.ANALYTICS,
        },
      })
    }

    const { count: totalSubscriptions, error: subsErr } = await supabase
      .from('subscription_events')
      .select('*', { count: 'exact', head: true })

    const { data: revenueData, error: revErr } = await supabase
      .from('subscription_events')
      .select('amount_microcredits')

    const totalRevenue = (revenueData || []).reduce((sum, e) => sum + (e.amount_microcredits || 0), 0)

    const { data: creatorData, error: creatErr } = await supabase
      .from('subscription_events')
      .select('creator_address_hash')

    const uniqueCreators = new Set((creatorData || []).map(e => e.creator_address_hash)).size

    // If any query failed, indicate degraded state
    const fallback = (subsErr || revErr || creatErr) ? 'partial_error' : undefined

    return NextResponse.json({
      totalCreators: uniqueCreators,
      totalSubscriptions: totalSubscriptions || 0,
      totalRevenue,
      activePrograms: 1, // veilsub_v30.aleo (deployed)
      ...(fallback && { fallback }),
    }, {
      headers: {
        'Cache-Control': CACHE_HEADERS.ANALYTICS,
      },
    })
  }

  // Recent events across ALL creators
  if (recent === 'true') {
    if (!supabase) {
      return NextResponse.json({ events: [], fallback: 'no_database' }, {
        status: 503,
        headers: {
          'Cache-Control': CACHE_HEADERS.ANALYTICS,
        },
      })
    }

    const { data, error: recentErr } = await supabase
      .from('subscription_events')
      .select('tier, amount_microcredits, tx_id, created_at')
      .order('created_at', { ascending: false })
      .limit(API_LIMITS.ANALYTICS_EVENTS_LIMIT)

    if (recentErr) {
      return NextResponse.json({ events: [], error: 'Database query failed' }, {
        status: 503,
        headers: {
          'Cache-Control': CACHE_HEADERS.ANALYTICS,
        },
      })
    }

    return NextResponse.json({ events: data || [] }, {
      headers: {
        'Cache-Control': CACHE_HEADERS.ANALYTICS,
      },
    })
  }

  // Existing per-creator query
  if (!addressHash) {
    return NextResponse.json({ error: 'Missing creator_address_hash parameter' }, { status: 400 })
  }

  if (!supabase) {
    return NextResponse.json({ events: [], fallback: 'no_database' }, { status: 503 })
  }

  const { data, error: queryErr } = await supabase
    .from('subscription_events')
    .select('tier, amount_microcredits, tx_id, created_at')
    .eq('creator_address_hash', addressHash)
    .order('created_at', { ascending: false })
    .limit(API_LIMITS.ANALYTICS_EVENTS_LIMIT)

  if (queryErr) {
    return NextResponse.json({ events: [], error: 'Database query failed' }, {
      status: 503,
      headers: {
        'Cache-Control': CACHE_HEADERS.ANALYTICS,
      },
    })
  }

  return NextResponse.json({ events: data || [] }, {
    headers: {
      'Cache-Control': CACHE_HEADERS.ANALYTICS,
    },
  })
}

// Use centralized auth config
const { MIN_SIG_BYTES, TIMESTAMP_WINDOW_MS } = AUTH_CONFIG

/**
 * Verify wallet auth for analytics events.
 * Same model as the posts API: server-salted hash + wallet signature + tight timestamp.
 * See /api/posts/route.ts verifyWalletAuth for full documentation.
 */
async function verifyAnalyticsAuth(
  address: string,
  walletHash: unknown,
  timestamp: unknown,
  signature: unknown
): Promise<string | null> {
  if (typeof walletHash !== 'string' || !/^[a-f0-9]{64}$/.test(walletHash)) {
    return 'Invalid wallet hash'
  }
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return 'Invalid timestamp'
  }
  if (Math.abs(Date.now() - timestamp) > TIMESTAMP_WINDOW_MS) {
    return 'Request expired'
  }
  // Server-salted hash verification — prefer server-only secret for security
  const salt = process.env.WALLET_AUTH_SECRET || process.env.NEXT_PUBLIC_WALLET_AUTH_SALT || 'veilsub-auth-v1'
  const encoder = new TextEncoder()
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(address + salt))
  const expectedHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
  if (walletHash !== expectedHash) {
    return 'Wallet hash mismatch'
  }
  // Validate wallet signature format and byte length
  if (typeof signature !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(signature)) {
    return 'Wallet signature required'
  }
  try {
    const decoded = Uint8Array.from(atob(signature), c => c.charCodeAt(0))
    if (decoded.length < MIN_SIG_BYTES) {
      return 'Wallet signature too short'
    }
  } catch {
    return 'Invalid signature encoding'
  }
  return null
}

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ip2 = getClientIp(req)
  const { allowed: allowed2 } = rl(`${ip2}:analytics:post`, 30)
  if (!allowed2) return getRateLimitResponse()

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { creator_address, tier, amount_microcredits, tx_id, walletHash, timestamp, signature } = payload

    if (!creator_address || typeof creator_address !== 'string') {
      return NextResponse.json({ error: 'Missing creator_address' }, { status: 400 })
    }
    // Validate creator_address is a real Aleo address format
    if (!ALEO_ADDRESS_RE.test(creator_address)) {
      return NextResponse.json({ error: 'Invalid creator address format' }, { status: 400 })
    }

    // Wallet authentication: verify the caller has wallet signing capability
    const authError = await verifyAnalyticsAuth(creator_address, walletHash, timestamp, signature)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 403 })
    }

    if (typeof tier !== 'number' || !Number.isInteger(tier) || tier < 0 || tier > API_LIMITS.MAX_TIER_ID) {
      return NextResponse.json({ error: `Invalid tier (must be 0-${API_LIMITS.MAX_TIER_ID})` }, { status: 400 })
    }
    if (typeof amount_microcredits !== 'number' || amount_microcredits < 0 || amount_microcredits > API_LIMITS.MAX_MICROCREDITS) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    // tx_id must be a non-empty string if provided
    if (tx_id !== undefined && tx_id !== null && (typeof tx_id !== 'string' || tx_id.length > API_LIMITS.MAX_TX_ID_LENGTH)) {
      return NextResponse.json({ error: 'Invalid tx_id' }, { status: 400 })
    }

    // Rate limit: 10 analytics events per minute per address (prevents spam/abuse)
    const redis = getRedis()
    if (redis) {
      const rlKey = `veilsub:analytics-rl:${walletHash}`
      const count = await redis.incr(rlKey)
      await redis.expire(rlKey, 60)
      if (count > RATE_LIMITS.ANALYTICS_PER_MINUTE) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
      }
    }

    const creatorHash = await hashAddress(creator_address)

    const { data, error } = await supabase
      .from('subscription_events')
      .insert({
        creator_address_hash: creatorHash,
        tier,
        amount_microcredits,
        tx_id: tx_id || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    return NextResponse.json({ event: data })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
