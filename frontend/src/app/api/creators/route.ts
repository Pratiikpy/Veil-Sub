import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { encrypt, hashAddress } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  const addressHash = req.nextUrl.searchParams.get('address_hash')
  if (!addressHash) {
    return NextResponse.json({ error: 'address_hash required' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ profile: null })
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

  try {
    const { address, display_name, bio } = await req.json()
    if (!address) {
      return NextResponse.json({ error: 'address required' }, { status: 400 })
    }

    const encryptedAddress = await encrypt(address)
    const addressHashValue = await hashAddress(address)

    const { data, error } = await supabase
      .from('creator_profiles')
      .upsert(
        {
          encrypted_address: encryptedAddress,
          address_hash: addressHashValue,
          display_name: display_name || null,
          bio: bio || null,
        },
        { onConflict: 'address_hash' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
