import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { encrypt, hashAddress } from '@/lib/encryption'

const ALEO_ADDRESS_RE = /^aleo1[a-z0-9]{58}$/

export async function GET(req: NextRequest) {
  const addressHash = req.nextUrl.searchParams.get('address_hash')
  if (!addressHash || !/^[a-f0-9]{64}$/.test(addressHash)) {
    return NextResponse.json({ error: 'Valid address_hash required' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('creator_profiles')
    .select('address_hash, display_name, bio, created_at')
    .eq('address_hash', addressHash)
    .single()

  if (error || !data) {
    return NextResponse.json({ profile: null })
  }

  return NextResponse.json({ profile: data })
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
    const { address, display_name, bio } = payload
    if (!address || !ALEO_ADDRESS_RE.test(address)) {
      return NextResponse.json({ error: 'Valid Aleo address required' }, { status: 400 })
    }
    if (display_name && (typeof display_name !== 'string' || display_name.length > 100)) {
      return NextResponse.json({ error: 'Display name too long (max 100)' }, { status: 400 })
    }
    if (bio && (typeof bio !== 'string' || bio.length > 1000)) {
      return NextResponse.json({ error: 'Bio too long (max 1000)' }, { status: 400 })
    }

    const addressHashValue = await hashAddress(address)

    // Check if this creator already exists
    const { data: existing } = await supabase
      .from('creator_profiles')
      .select('address_hash')
      .eq('address_hash', addressHashValue)
      .single()

    const upsertData: Record<string, unknown> = {
      address_hash: addressHashValue,
      display_name: display_name || null,
      bio: bio || null,
    }

    // Only encrypt and store the address on first registration
    if (!existing) {
      upsertData.encrypted_address = await encrypt(address)
    }

    const { data, error } = await supabase
      .from('creator_profiles')
      .upsert(upsertData, { onConflict: 'address_hash' })
      .select()
      .single()

    if (error) {
      console.error('[API /creators POST] Supabase error:', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (err) {
    console.error('[API /creators POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
