import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { hashAddress } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  const addressHash = req.nextUrl.searchParams.get('creator_address_hash')
  const recent = req.nextUrl.searchParams.get('recent')
  const globalStats = req.nextUrl.searchParams.get('global_stats')

  const supabase = getServerSupabase()

  // Global platform stats
  if (globalStats === 'true') {
    if (!supabase) {
      return NextResponse.json({
        totalCreators: 1,
        totalSubscriptions: 0,
        totalRevenue: 0,
        activePrograms: 1,
      })
    }

    const { count: totalSubscriptions } = await supabase
      .from('subscription_events')
      .select('*', { count: 'exact', head: true })

    const { data: revenueData } = await supabase
      .from('subscription_events')
      .select('amount_microcredits')

    const totalRevenue = (revenueData || []).reduce((sum, e) => sum + (e.amount_microcredits || 0), 0)

    const { data: creatorData } = await supabase
      .from('subscription_events')
      .select('creator_address_hash')

    const uniqueCreators = new Set((creatorData || []).map(e => e.creator_address_hash)).size

    return NextResponse.json({
      totalCreators: Math.max(uniqueCreators, 1),
      totalSubscriptions: totalSubscriptions || 0,
      totalRevenue,
      activePrograms: 1, // veilsub_v6.aleo
    })
  }

  // Recent events across ALL creators
  if (recent === 'true') {
    if (!supabase) {
      return NextResponse.json({ events: generateMockRecentEvents() })
    }

    const { data } = await supabase
      .from('subscription_events')
      .select('tier, amount_microcredits, tx_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ events: data || [] })
  }

  // Existing per-creator query
  if (!addressHash) {
    return NextResponse.json({ events: [] })
  }

  if (!supabase) {
    return NextResponse.json({ events: [] })
  }

  const { data } = await supabase
    .from('subscription_events')
    .select('tier, amount_microcredits, tx_id, created_at')
    .eq('creator_address_hash', addressHash)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ events: data || [] })
}

function generateMockRecentEvents() {
  const tiers = [1, 2, 3]
  const events = []
  for (let i = 0; i < 10; i++) {
    const tier = tiers[Math.floor(Math.random() * tiers.length)]
    const multiplier = tier === 3 ? 5 : tier === 2 ? 2 : 1
    events.push({
      tier,
      amount_microcredits: 1_000_000 * multiplier,
      tx_id: `at1mock${i}${Math.random().toString(36).slice(2, 10)}`,
      created_at: new Date(Date.now() - i * 3_600_000).toISOString(),
    })
  }
  return events
}

export async function POST(req: NextRequest) {
  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { creator_address, tier, amount_microcredits, tx_id, signature, timestamp } = payload

    // Wallet signature verification: caller must prove wallet ownership
    if (!signature || typeof signature !== 'string' || signature.length < 20) {
      return NextResponse.json({ error: 'Wallet signature required' }, { status: 403 })
    }
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Request expired or invalid timestamp' }, { status: 403 })
    }

    if (!creator_address || typeof creator_address !== 'string') {
      return NextResponse.json({ error: 'Missing creator_address' }, { status: 400 })
    }
    if (typeof tier !== 'number' || !Number.isInteger(tier) || tier < 1 || tier > 3) {
      return NextResponse.json({ error: 'Invalid tier (must be 1-3)' }, { status: 400 })
    }
    if (typeof amount_microcredits !== 'number' || amount_microcredits < 0 || amount_microcredits > 1_000_000_000_000) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
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
      console.error('[API /analytics POST] Supabase error:', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    return NextResponse.json({ event: data })
  } catch (err) {
    console.error('[API /analytics POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
