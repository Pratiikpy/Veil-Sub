import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { hashAddress } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('creator')
  if (!address) {
    return NextResponse.json({ error: 'Missing creator address' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    // Return mock data when Supabase is not configured
    return NextResponse.json(generateMockData())
  }

  try {
    const addressHash = await hashAddress(address)

    // Fetch all events for this creator
    const { data: events } = await supabase
      .from('subscription_events')
      .select('tier, amount_microcredits, created_at')
      .eq('creator_address_hash', addressHash)
      .order('created_at', { ascending: true })
      .limit(500)

    if (!events || events.length === 0) {
      return NextResponse.json({
        daily: Array.from({ length: 30 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (29 - i))
          return { date: d.toISOString().split('T')[0], subscriptions: 0, revenue: 0, tips: 0 }
        }),
        tierDistribution: {},
        totalSubscribers: 0,
        totalRevenue: 0,
      })
    }

    // Bucket into daily aggregates
    const dailyMap = new Map<string, { subscriptions: number; revenue: number; tips: number }>()
    const tierMap = new Map<number, number>()

    for (const event of events) {
      const date = new Date(event.created_at).toISOString().split('T')[0]
      const existing = dailyMap.get(date) || { subscriptions: 0, revenue: 0, tips: 0 }
      existing.subscriptions += 1
      existing.revenue += event.amount_microcredits || 0
      dailyMap.set(date, existing)

      const tierCount = tierMap.get(event.tier) || 0
      tierMap.set(event.tier, tierCount + 1)
    }

    // Generate last 30 days
    const daily = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const data = dailyMap.get(dateStr) || { subscriptions: 0, revenue: 0, tips: 0 }
      daily.push({ date: dateStr, ...data })
    }

    const tierDistribution: Record<string, number> = {}
    for (const [tier, count] of tierMap) {
      tierDistribution[String(tier)] = count
    }

    return NextResponse.json({
      daily,
      tierDistribution,
      totalSubscribers: events.length,
      totalRevenue: events.reduce((sum, e) => sum + (e.amount_microcredits || 0), 0),
    })
  } catch (err) {
    console.error('[API /analytics/summary]', err)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}

function generateMockData() {
  const daily = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    // Generate realistic-looking demo data
    const subs = Math.floor(Math.random() * 4)
    const rev = subs * (2_000_000 + Math.floor(Math.random() * 8_000_000))
    daily.push({
      date: dateStr,
      subscriptions: subs,
      revenue: rev,
      tips: Math.random() > 0.7 ? Math.floor(Math.random() * 2) : 0,
    })
  }

  return {
    daily,
    tierDistribution: { '1': 12, '2': 5, '3': 2 },
    totalSubscribers: 19,
    totalRevenue: 95_000_000,
  }
}
