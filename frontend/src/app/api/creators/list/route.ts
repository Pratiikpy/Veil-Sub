import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ creators: [] })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase()

  try {
    let query = supabase
      .from('creator_profiles')
      .select('encrypted_address, display_name, bio, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (q) {
      // Escape LIKE wildcards to prevent injection
      const escaped = q.replace(/[%_\\]/g, '\\$&')
      query = query.ilike('display_name', `%${escaped}%`)
    }

    const { data, error } = await query

    if (error || !data) {
      return NextResponse.json({ creators: [] })
    }

    // Decrypt addresses server-side
    const creators = await Promise.all(
      data.map(async (row) => {
        try {
          const address = await decrypt(row.encrypted_address)
          return {
            address,
            display_name: row.display_name,
            bio: row.bio,
            created_at: row.created_at,
          }
        } catch {
          return null
        }
      })
    )

    return NextResponse.json({
      creators: creators.filter(Boolean),
    })
  } catch (err) {
    console.error('[API /creators/list]', err)
    return NextResponse.json({ creators: [] })
  }
}
