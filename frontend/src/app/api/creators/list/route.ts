import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import { CACHE_HEADERS } from '@/lib/config'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

/**
 * GET /api/creators/list
 *
 * Query params:
 *   q        - search term (matches display_name or bio via ilike)
 *   category - filter by category (exact match, case-insensitive)
 *   sort     - 'newest' | 'oldest' (default: newest)
 *   limit    - max results (default: 50, max: 100)
 *   offset   - pagination offset (default: 0)
 *
 * Returns: { creators: CreatorListItem[], total: number }
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:creators:list`, 60)
  if (!allowed) return getRateLimitResponse()

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() || ''
  const category = req.nextUrl.searchParams.get('category')?.trim() || ''
  const sort = req.nextUrl.searchParams.get('sort')?.trim() || 'newest'
  const limitParam = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10)
  const offsetParam = parseInt(req.nextUrl.searchParams.get('offset') || '0', 10)

  const limit = Math.min(Math.max(1, Number.isFinite(limitParam) ? limitParam : 50), 100)
  const offset = Math.max(0, Number.isFinite(offsetParam) ? offsetParam : 0)

  try {
    let query = supabase
      .from('creator_profiles')
      .select('encrypted_address, display_name, bio, category, image_url, cover_url, created_at, creator_hash', { count: 'exact' })

    // Search by name or bio
    if (q) {
      const escaped = q.replace(/[%_\\]/g, '\\$&')
      // Search both display_name and bio
      query = query.or(`display_name.ilike.%${escaped}%,bio.ilike.%${escaped}%`)
    }

    // Filter by category (case-insensitive match)
    if (category && category !== 'all') {
      query = query.ilike('category', category)
    }

    // Sort
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else {
      // Default: newest first
      query = query.order('created_at', { ascending: false })
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error || !data) {
      // If category column doesn't exist yet, fall back to query without it
      if (error?.message?.includes('category')) {
        const fallbackQuery = supabase
          .from('creator_profiles')
          .select('encrypted_address, display_name, bio, image_url, cover_url, created_at, creator_hash', { count: 'exact' })
          .order('created_at', { ascending: sort === 'oldest' })
          .range(offset, offset + limit - 1)

        const fallbackResult = await (q
          ? fallbackQuery.ilike('display_name', `%${q.replace(/[%_\\]/g, '\\$&')}%`)
          : fallbackQuery)

        if (fallbackResult.error || !fallbackResult.data) {
          return NextResponse.json({ error: 'Failed to load creators' }, { status: 500 })
        }

        const creators = await decryptCreators(fallbackResult.data)
        return NextResponse.json({
          creators,
          total: fallbackResult.count ?? creators.length,
        }, {
          headers: { 'Cache-Control': CACHE_HEADERS.POSTS },
        })
      }

      return NextResponse.json({ error: 'Failed to load creators' }, { status: 500 })
    }

    const creators = await decryptCreators(data)

    return NextResponse.json({
      creators,
      total: count ?? creators.length,
    }, {
      headers: { 'Cache-Control': CACHE_HEADERS.POSTS },
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

interface RawCreatorRow {
  encrypted_address: string
  display_name: string | null
  bio: string | null
  category?: string | null
  image_url?: string | null
  cover_url?: string | null
  created_at: string
  creator_hash?: string | null
}

async function decryptCreators(data: RawCreatorRow[]) {
  const results = await Promise.all(
    data.map(async (row) => {
      try {
        const address = await decrypt(row.encrypted_address)
        return {
          address,
          display_name: row.display_name,
          bio: row.bio,
          category: row.category ?? null,
          image_url: row.image_url ?? null,
          cover_url: row.cover_url ?? null,
          created_at: row.created_at,
          creator_hash: row.creator_hash ?? null,
        }
      } catch {
        return null
      }
    })
  )
  return results.filter(Boolean)
}
