import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { getRedis } from '@/lib/redis'
import { ALEO_ADDRESS_RE } from '@/lib/config'
import { hashAddress } from '@/lib/encryption'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

const MAX_NOTIFICATIONS = 50
const NOTIFICATION_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

function redisKey(walletHash: string): string {
  return `veilsub:notifications:${walletHash}`
}

interface StoredNotification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
  data?: Record<string, string>
}

/**
 * GET /api/notifications?wallet=aleo1...&limit=20
 * Fetch notifications for a wallet address.
 * Storage: Supabase notifications table first, fallback to Redis.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:notifications:get`, 30)
  if (!allowed) return getRateLimitResponse()

  const wallet = req.nextUrl.searchParams.get('wallet')
  if (!wallet || !ALEO_ADDRESS_RE.test(wallet)) {
    return NextResponse.json({ notifications: [] })
  }

  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10) || 20,
    MAX_NOTIFICATIONS
  )

  const walletHash = await hashAddress(wallet)

  // Try Supabase first
  const supabase = getServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, created_at, read, data')
        .eq('wallet_hash', walletHash)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error && data) {
        const notifications = data.map((row) => ({
          id: row.id,
          type: row.type,
          title: row.title,
          message: row.message,
          createdAt: row.created_at,
          read: row.read ?? false,
          data: row.data ?? undefined,
        }))
        return NextResponse.json({ notifications })
      }
    } catch {
      // Fall through to Redis
    }
  }

  // Fallback: Redis
  const redis = getRedis()
  if (redis) {
    try {
      const raw = await redis.lrange(redisKey(walletHash), 0, limit - 1)
      const notifications: StoredNotification[] = []
      for (const item of raw) {
        try {
          const parsed = typeof item === 'string' ? JSON.parse(item) : item
          notifications.push(parsed as StoredNotification)
        } catch {
          // Skip malformed entries
        }
      }
      return NextResponse.json({ notifications })
    } catch {
      // Redis not available
    }
  }

  // Both Supabase and Redis unavailable — return empty with fallback indicator
  return NextResponse.json({ notifications: [], fallback: 'no_storage' })
}

/**
 * POST /api/notifications
 * Create a notification for a wallet.
 * Body: { wallet, type, title, message, data? }
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:notifications:post`, 30)
  if (!allowed) return getRateLimitResponse()

  let payload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { wallet, type, title, message, data } = payload

  if (!wallet || typeof wallet !== 'string') {
    return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })
  }
  if (!type || typeof type !== 'string') {
    return NextResponse.json({ error: 'Missing type' }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || title.length > 200) {
    return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
  }
  if (!message || typeof message !== 'string' || message.length > 1000) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
  }

  // Wallet can be an address or an address hash — normalize
  const walletHash = ALEO_ADDRESS_RE.test(wallet)
    ? await hashAddress(wallet)
    : wallet

  const notificationId = crypto.randomUUID()
  const notification: StoredNotification = {
    id: notificationId,
    type,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    data: data ?? undefined,
  }

  // Try Supabase first
  const supabase = getServerSupabase()
  if (supabase) {
    try {
      const { error: insertError } = await supabase.from('notifications').insert({
        id: notification.id,
        wallet_hash: walletHash,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: false,
        data: notification.data ?? null,
      })
      if (!insertError) {
        return NextResponse.json({ notification })
      }
    } catch {
      // Fall through to Redis
    }
  }

  // Fallback: Redis
  const redis = getRedis()
  if (redis) {
    try {
      const key = redisKey(walletHash)
      await redis.lpush(key, JSON.stringify(notification))
      await redis.ltrim(key, 0, MAX_NOTIFICATIONS - 1)
      await redis.expire(key, NOTIFICATION_TTL_SECONDS)
      return NextResponse.json({ notification })
    } catch {
      // Redis not available
    }
  }

  return NextResponse.json({ error: 'Storage not available' }, { status: 503 })
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read.
 * Body: { wallet, notificationId } or { wallet, markAll: true }
 */
export async function PATCH(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:notifications:patch`, 30)
  if (!allowed) return getRateLimitResponse()

  let payload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { wallet, notificationId: nId, markAll } = payload

  if (!wallet || typeof wallet !== 'string') {
    return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })
  }

  const walletHash = ALEO_ADDRESS_RE.test(wallet)
    ? await hashAddress(wallet)
    : wallet

  // Try Supabase first
  const supabase = getServerSupabase()
  if (supabase) {
    try {
      if (markAll) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('wallet_hash', walletHash)
          .eq('read', false)
      } else if (nId) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', nId)
          .eq('wallet_hash', walletHash)
      }
      return NextResponse.json({ success: true })
    } catch {
      // Fall through to Redis
    }
  }

  // Fallback: Redis — update items in list
  const redis = getRedis()
  if (redis) {
    try {
      const key = redisKey(walletHash)
      const items = await redis.lrange(key, 0, MAX_NOTIFICATIONS - 1)
      const updated: StoredNotification[] = []

      for (const item of items) {
        try {
          const parsed: StoredNotification =
            typeof item === 'string' ? JSON.parse(item) : (item as StoredNotification)
          if (markAll || parsed.id === nId) {
            updated.push({ ...parsed, read: true })
          } else {
            updated.push(parsed)
          }
        } catch {
          // Skip malformed
        }
      }

      // Replace the list atomically
      const pipeline = redis.pipeline()
      pipeline.del(key)
      for (const n of updated) {
        pipeline.rpush(key, JSON.stringify(n))
      }
      pipeline.expire(key, NOTIFICATION_TTL_SECONDS)
      await pipeline.exec()

      return NextResponse.json({ success: true })
    } catch {
      // Redis not available
    }
  }

  return NextResponse.json({ error: 'Storage not available' }, { status: 503 })
}
