import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { ALEO_ADDRESS_RE } from '@/lib/config'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { verifyWalletAuth } from '@/lib/apiAuth'

// GET /api/tiers/perks?creator=aleo1...
// Returns all tier perks for a creator — public, no auth required
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:tiers:perks:get`, 60)
  if (!allowed) return getRateLimitResponse()

  const creator = req.nextUrl.searchParams.get('creator')
  if (!creator || !ALEO_ADDRESS_RE.test(creator)) {
    return NextResponse.json({ error: 'Valid Aleo address required' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    // Database not configured — client uses localStorage as primary (graceful degradation)
    return NextResponse.json({ tiers: [], fallback: 'no_database' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('tier_perks')
    .select('tier_id, perks, description')
    .eq('creator_address', creator)

  if (error) {
    // Query failed (table may not exist) — client uses localStorage as primary (graceful degradation)
    return NextResponse.json({ tiers: [], fallback: 'query_error' }, { status: 503 })
  }

  return NextResponse.json({ tiers: data ?? [] }, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  })
}

// POST /api/tiers/perks
// Upserts perks for a specific tier — called by creator from dashboard
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:tiers:perks:post`, 30)
  if (!allowed) return getRateLimitResponse()

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { creator_address, tier_id, perks, description, walletHash, timestamp, signature } = payload

  // Validate creator_address
  if (!creator_address || typeof creator_address !== 'string' || !ALEO_ADDRESS_RE.test(creator_address)) {
    return NextResponse.json({ error: 'Valid Aleo address required' }, { status: 400 })
  }

  // Wallet authentication
  if (walletHash) {
    const auth = await verifyWalletAuth(creator_address, walletHash, timestamp, signature)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
    }
  } else {
    return NextResponse.json({ error: 'Authentication required (walletHash + timestamp)' }, { status: 401 })
  }

  // Validate tier_id
  if (typeof tier_id !== 'number' || !Number.isInteger(tier_id) || tier_id < 1 || tier_id > 20) {
    return NextResponse.json({ error: 'tier_id must be 1–20' }, { status: 400 })
  }

  // Validate perks array
  if (!Array.isArray(perks)) {
    return NextResponse.json({ error: 'perks must be an array of strings' }, { status: 400 })
  }
  if (perks.length > 10) {
    return NextResponse.json({ error: 'Maximum 10 perks per tier' }, { status: 400 })
  }

  // Sanitize perks: filter non-strings, trim, cap length, remove empties
  const cleanPerks = perks
    .filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0)
    .map((p: string) => p.trim().slice(0, 100))

  // Validate optional description
  const cleanDescription = (typeof description === 'string' && description.trim().length > 0)
    ? description.trim().slice(0, 200)
    : null

  const supabase = getServerSupabase()
  if (!supabase) {
    // No database — client stores in localStorage as primary (graceful degradation)
    return NextResponse.json({ success: false, fallback: 'localStorage', note: 'no_database' }, { status: 503 })
  }

  const { error } = await supabase
    .from('tier_perks')
    .upsert({
      creator_address,
      tier_id,
      perks: cleanPerks,
      description: cleanDescription,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'creator_address,tier_id' })

  if (error) {
    // Table might not exist yet — graceful fallback, client uses localStorage
    return NextResponse.json({ success: false, warning: 'database_unavailable', fallback: 'localStorage' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
