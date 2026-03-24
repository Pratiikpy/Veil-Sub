import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

/**
 * Subscriber profile API.
 *
 * Keyed by subscriber_hash (SHA-256 of wallet address), NOT raw address.
 * Stores optional display_name and avatar_url for use in comments/feed.
 *
 * Required Supabase table:
 *   CREATE TABLE IF NOT EXISTS subscriber_profiles (
 *     subscriber_hash TEXT PRIMARY KEY,
 *     display_name TEXT,
 *     avatar_url TEXT,
 *     created_at TIMESTAMPTZ DEFAULT now()
 *   );
 */

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:sub-profile:get`, 60)
  if (!allowed) return getRateLimitResponse()

  const subscriberHash = req.nextUrl.searchParams.get('subscriber_hash')
  if (!subscriberHash || !/^[a-f0-9]{64}$/.test(subscriberHash)) {
    return NextResponse.json({ error: 'Valid subscriber_hash required' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const { data, error } = await supabase
      .from('subscriber_profiles')
      .select('subscriber_hash, display_name, avatar_url, created_at')
      .eq('subscriber_hash', subscriberHash)
      .single()

    if (error || !data) {
      return NextResponse.json({ profile: null })
    }

    return NextResponse.json({ profile: data }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch subscriber profile' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:sub-profile:post`, 30)
  if (!allowed) return getRateLimitResponse()

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let payload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { subscriber_hash, display_name, avatar_url } = payload

    if (!subscriber_hash || typeof subscriber_hash !== 'string' || !/^[a-f0-9]{64}$/.test(subscriber_hash)) {
      return NextResponse.json({ error: 'Valid subscriber_hash required' }, { status: 400 })
    }

    if (display_name !== null && display_name !== undefined) {
      if (typeof display_name !== 'string' || display_name.length > 30) {
        return NextResponse.json({ error: 'Display name too long (max 30)' }, { status: 400 })
      }
    }

    if (avatar_url !== null && avatar_url !== undefined) {
      if (typeof avatar_url !== 'string' || avatar_url.length > 500) {
        return NextResponse.json({ error: 'Avatar URL too long (max 500)' }, { status: 400 })
      }
      // Validate URL format
      if (avatar_url) {
        try {
          const parsed = new URL(avatar_url)
          if (parsed.protocol !== 'https:' && !avatar_url.startsWith('data:')) {
            return NextResponse.json({ error: 'Avatar URL must use HTTPS' }, { status: 400 })
          }
        } catch {
          return NextResponse.json({ error: 'Invalid avatar URL format' }, { status: 400 })
        }
      }
    }

    const { data, error } = await supabase
      .from('subscriber_profiles')
      .upsert({
        subscriber_hash,
        display_name: display_name || null,
        avatar_url: avatar_url || null,
      }, { onConflict: 'subscriber_hash' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to save subscriber profile' }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
