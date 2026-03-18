import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { encrypt, hashAddress } from '@/lib/encryption'
import { ALEO_ADDRESS_RE } from '@/lib/config'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:creators:get`, 60)
  if (!allowed) return getRateLimitResponse()

  const addressHash = req.nextUrl.searchParams.get('address_hash')
  if (!addressHash || !/^[a-f0-9]{64}$/.test(addressHash)) {
    return NextResponse.json({ error: 'Valid address_hash required' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const { data, error } = await supabase
      .from('creator_profiles')
      .select('address_hash, creator_hash, display_name, bio, category, created_at')
      .eq('address_hash', addressHash)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile: data }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:creators:post`, 60)
  if (!allowed) return getRateLimitResponse()

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { address, display_name, bio, category, creator_hash, signature, timestamp } = payload
    if (!address || !ALEO_ADDRESS_RE.test(address)) {
      return NextResponse.json({ error: 'Valid Aleo address required' }, { status: 400 })
    }

    // Wallet signature verification: caller must prove wallet ownership
    if (!signature || typeof signature !== 'string' || signature.length < 20) {
      return NextResponse.json({ error: 'Wallet signature required' }, { status: 403 })
    }
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 2 * 60 * 1000) {
      return NextResponse.json({ error: 'Request expired or invalid timestamp' }, { status: 403 })
    }
    if (display_name && (typeof display_name !== 'string' || display_name.length > 100)) {
      return NextResponse.json({ error: 'Display name too long (max 100)' }, { status: 400 })
    }
    if (bio && (typeof bio !== 'string' || bio.length > 1000)) {
      return NextResponse.json({ error: 'Bio too long (max 1000)' }, { status: 400 })
    }
    const VALID_CATEGORIES = ['Content Creator', 'Writer', 'Artist', 'Developer', 'Educator', 'Journalist', 'Other']
    if (category && (typeof category !== 'string' || !VALID_CATEGORIES.includes(category))) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const addressHashValue = await hashAddress(address)

    // Check if this creator already exists
    const { data: existing } = await supabase
      .from('creator_profiles')
      .select('address_hash')
      .eq('address_hash', addressHashValue)
      .single()

    // Validate creator_hash if provided: must be digits followed by "field"
    if (creator_hash !== undefined && creator_hash !== null) {
      if (typeof creator_hash !== 'string' || !/^\d+field$/.test(creator_hash)) {
        return NextResponse.json({ error: 'Invalid creator_hash format' }, { status: 400 })
      }
    }

    const upsertData: Record<string, unknown> = {
      address_hash: addressHashValue,
      display_name: display_name || null,
      bio: bio || null,
      ...(category ? { category } : {}),
      ...(creator_hash ? { creator_hash } : {}),
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
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
