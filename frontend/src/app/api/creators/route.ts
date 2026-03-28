import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { encrypt, hashAddress } from '@/lib/encryption'
import { ALEO_ADDRESS_RE, AUTH_CONFIG } from '@/lib/config'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { validateOrigin } from '@/lib/csrf'
import { verifyWalletAuth } from '@/lib/apiAuth'

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
      .select('address_hash, creator_hash, display_name, bio, category, image_url, cover_url, created_at')
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
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

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
    const { address, display_name, bio, category, image_url, cover_url, creator_hash, signature, timestamp } = payload
    if (!address || !ALEO_ADDRESS_RE.test(address)) {
      return NextResponse.json({ error: 'Valid Aleo address required' }, { status: 400 })
    }

    // Wallet authentication — required for all profile upserts
    const walletHash = payload.walletHash
    if (!walletHash || timestamp === undefined) {
      return NextResponse.json({ error: 'Authentication required (walletHash + timestamp)' }, { status: 401 })
    }
    const authResult = await verifyWalletAuth(address, walletHash, timestamp, signature)
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error || 'Authentication failed' }, { status: 401 })
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
    if (image_url && (typeof image_url !== 'string' || image_url.length > 10000)) {
      return NextResponse.json({ error: 'Image URL too long' }, { status: 400 })
    }
    // Validate image URL format if provided (allow HTTPS and data:image/ base64, but block SVG)
    if (image_url) {
      if (image_url.startsWith('data:image/svg')) {
        return NextResponse.json({ error: 'SVG data URLs not allowed for security reasons' }, { status: 400 })
      } else if (image_url.startsWith('data:image/')) {
        // Allow base64-encoded images from local upload (non-SVG)
      } else {
        try {
          const parsed = new URL(image_url)
          if (parsed.protocol !== 'https:') {
            return NextResponse.json({ error: 'Image URL must use HTTPS or be a data:image/ URL' }, { status: 400 })
          }
        } catch {
          return NextResponse.json({ error: 'Invalid image URL format' }, { status: 400 })
        }
      }
    }
    if (cover_url && (typeof cover_url !== 'string' || cover_url.length > 10000)) {
      return NextResponse.json({ error: 'Cover URL too long' }, { status: 400 })
    }
    // Validate cover URL format if provided (allow HTTPS and data:image/ base64, but block SVG)
    if (cover_url) {
      if (cover_url.startsWith('data:image/svg')) {
        return NextResponse.json({ error: 'SVG data URLs not allowed for security reasons' }, { status: 400 })
      } else if (cover_url.startsWith('data:image/')) {
        // Allow base64-encoded images from local upload (non-SVG)
      } else {
        try {
          const parsed = new URL(cover_url)
          if (parsed.protocol !== 'https:') {
            return NextResponse.json({ error: 'Cover URL must use HTTPS or be a data:image/ URL' }, { status: 400 })
          }
        } catch {
          return NextResponse.json({ error: 'Invalid cover URL format' }, { status: 400 })
        }
      }
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

    // Always encrypt the address for upsert (needed for INSERT if row doesn't exist)
    const encryptedAddress = await encrypt(address)

    const upsertData: Record<string, unknown> = {
      address_hash: addressHashValue,
      encrypted_address: encryptedAddress,
      display_name: display_name || null,
      bio: bio || null,
      ...(category ? { category } : {}),
      ...(image_url ? { image_url } : {}),
      ...(cover_url ? { cover_url } : {}),
      ...(creator_hash ? { creator_hash } : {}),
    }

    const { data, error } = await supabase
      .from('creator_profiles')
      .upsert(upsertData, { onConflict: 'address_hash' })
      .select()
      .single()

    if (error) {
      console.error('[creators] upsert failed:', error.message, error.code, error.details)
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (err) {
    console.error('[creators] unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
