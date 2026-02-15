import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { hashAddress } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  const addressHash = req.nextUrl.searchParams.get('creator_address_hash')
  if (!addressHash) {
    return NextResponse.json({ events: [] })
  }

  const supabase = getServerSupabase()
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
    const { creator_address, tier, amount_microcredits, tx_id } = payload
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
