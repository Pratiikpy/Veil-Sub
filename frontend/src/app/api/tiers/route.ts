import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { hashAddress } from '@/lib/encryption'
import { ALEO_ADDRESS_RE } from '@/lib/config'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

// GET /api/tiers?address=aleo1...
// Returns all tiers for a creator — public, no auth required
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:tiers:get`, 60)
  if (!allowed) return getRateLimitResponse()

  const address = req.nextUrl.searchParams.get('address')
  if (!address || !ALEO_ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Valid Aleo address required' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ tiers: [] }, { status: 200 }) // graceful — fall back to config
  }

  const addressHash = await hashAddress(address)
  const { data, error } = await supabase
    .from('creator_tiers')
    .select('tier_id, name, price_microcredits')
    .eq('address_hash', addressHash)
    .order('tier_id', { ascending: true })

  if (error) {
    return NextResponse.json({ tiers: [] }, { status: 200 }) // graceful fallback
  }

  return NextResponse.json({ tiers: data ?? [] }, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  })
}

// POST /api/tiers
// Upserts a tier for a creator — called after create_custom_tier on-chain succeeds
export async function POST(req: NextRequest) {
  const ip2 = getClientIp(req)
  const { allowed: allowed2 } = rateLimit(`${ip2}:tiers:post`, 30)
  if (!allowed2) return getRateLimitResponse()

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { address, tier_id, name, price_microcredits } = payload

  if (!address || !ALEO_ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Valid Aleo address required' }, { status: 400 })
  }
  if (typeof tier_id !== 'number' || tier_id < 1 || tier_id > 20) {
    return NextResponse.json({ error: 'tier_id must be 1–20' }, { status: 400 })
  }
  if (!name || typeof name !== 'string' || name.length > 64) {
    return NextResponse.json({ error: 'name required (max 64 chars)' }, { status: 400 })
  }
  if (typeof price_microcredits !== 'number' || price_microcredits <= 0) {
    return NextResponse.json({ error: 'price_microcredits must be positive' }, { status: 400 })
  }

  const addressHash = await hashAddress(address)

  const { data, error } = await supabase
    .from('creator_tiers')
    .upsert(
      { address_hash: addressHash, tier_id, name, price_microcredits },
      { onConflict: 'address_hash,tier_id' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save tier' }, { status: 500 })
  }

  return NextResponse.json({ tier: data })
}
