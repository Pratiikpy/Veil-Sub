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

  try {
    const { creator_address, tier, amount_microcredits, tx_id } = await req.json()
    if (!creator_address || !tier || !amount_microcredits) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ event: data })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
