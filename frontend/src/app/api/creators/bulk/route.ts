import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

/**
 * GET /api/creators/bulk
 *
 * Returns ALL creator profiles in a single bulk request.
 *
 * Privacy rationale: By fetching every creator at once (on the /explore page),
 * Supabase access logs only show "user fetched the full directory" — not which
 * specific creator the subscriber later navigates to. Individual per-creator
 * Supabase fetches become a fallback for cache misses, not the primary path.
 *
 * Response is cached (CDN: 5 min, stale-while-revalidate: 1 min) so repeated
 * requests from different subscribers share the same cached response.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:creators:bulk`, 30)
  if (!allowed) return getRateLimitResponse()

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ creators: [] })
  }

  try {
    const { data, error } = await supabase
      .from('creator_profiles')
      .select('encrypted_address, display_name, bio, category, creator_hash')
      .limit(200)

    if (error || !data) {
      return NextResponse.json({ creators: [] })
    }

    // Decrypt addresses server-side so the client gets usable data
    const creators = (
      await Promise.all(
        data.map(async (row) => {
          try {
            const address = await decrypt(row.encrypted_address)
            return {
              address,
              display_name: row.display_name ?? null,
              bio: row.bio ?? null,
              category: row.category ?? null,
              creator_hash: row.creator_hash ?? null,
            }
          } catch {
            return null
          }
        })
      )
    ).filter(Boolean)

    return NextResponse.json(
      { creators },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    )
  } catch {
    return NextResponse.json({ creators: [] })
  }
}
