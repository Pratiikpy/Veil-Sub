import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { getRedis } from '@/lib/redis'
import { ALEO_ADDRESS_RE, AUTH_CONFIG } from '@/lib/config'
import { hashAddress } from '@/lib/encryption'
import { encryptContent, decryptContent } from '@/lib/contentEncryption'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { verifyWalletAuth } from '@/lib/apiAuth'
import { validateOrigin } from '@/lib/csrf'

// Fixed key identifier for notification encryption (not creator-specific)
const NOTIFICATION_KEY_ID = 'veilsub:notifications'

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

  // Require timestamp parameter to prevent enumeration of arbitrary wallet hashes
  const timestampParam = req.nextUrl.searchParams.get('timestamp')
  const timestamp = timestampParam ? parseInt(timestampParam, 10) : NaN
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > AUTH_CONFIG.TIMESTAMP_WINDOW_MS) {
    return NextResponse.json({ error: 'Valid timestamp required', notifications: [] }, { status: 401 })
  }

  const wallet = req.nextUrl.searchParams.get('wallet')
  if (!wallet || !ALEO_ADDRESS_RE.test(wallet)) {
    return NextResponse.json({ error: 'Valid Aleo wallet address required', notifications: [] }, { status: 400 })
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
          title: decryptContent(row.title, NOTIFICATION_KEY_ID),
          message: decryptContent(row.message, NOTIFICATION_KEY_ID),
          createdAt: row.created_at,
          read: row.read ?? false,
          data: row.data ?? undefined,
        }))
        return NextResponse.json({ notifications })
      }
    } catch (err) {
      console.error('[notifications] GET supabase error:', err)
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
          notifications.push({
            ...parsed,
            title: decryptContent(parsed.title, NOTIFICATION_KEY_ID),
            message: decryptContent(parsed.message, NOTIFICATION_KEY_ID),
          } as StoredNotification)
        } catch {
          // Skip malformed entries
        }
      }
      return NextResponse.json({ notifications })
    } catch (err) {
      console.error('[notifications] GET redis error:', err)
      // Redis not available
    }
  }

  // Both Supabase and Redis unavailable — return empty with fallback indicator
  return NextResponse.json({ notifications: [], fallback: 'no_storage' }, { status: 503 })
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

  // Encrypt title and message at rest (AES-256-GCM, fixed notification key)
  const encryptedTitle = encryptContent(title, NOTIFICATION_KEY_ID)
  const encryptedMessage = encryptContent(message, NOTIFICATION_KEY_ID)

  const notificationId = crypto.randomUUID()
  // Stored version has encrypted title/message
  const storedNotification: StoredNotification = {
    id: notificationId,
    type,
    title: encryptedTitle,
    message: encryptedMessage,
    createdAt: new Date().toISOString(),
    read: false,
    data: data ?? undefined,
  }

  // Response version has plaintext title/message (caller just created it)
  const responseNotification: StoredNotification = {
    id: notificationId,
    type,
    title,
    message,
    createdAt: storedNotification.createdAt,
    read: false,
    data: data ?? undefined,
  }

  // Try Supabase first
  const supabase = getServerSupabase()
  if (supabase) {
    try {
      const { error: insertError } = await supabase.from('notifications').insert({
        id: storedNotification.id,
        wallet_hash: walletHash,
        type: storedNotification.type,
        title: storedNotification.title,
        message: storedNotification.message,
        read: false,
        data: storedNotification.data ?? null,
      })
      if (!insertError) {
        return NextResponse.json({ notification: responseNotification })
      }
    } catch (err) {
      console.error('[notifications] POST supabase error:', err)
      // Fall through to Redis
    }
  }

  // Fallback: Redis
  const redis = getRedis()
  if (redis) {
    try {
      const key = redisKey(walletHash)
      await redis.lpush(key, JSON.stringify(storedNotification))
      await redis.ltrim(key, 0, MAX_NOTIFICATIONS - 1)
      await redis.expire(key, NOTIFICATION_TTL_SECONDS)
      return NextResponse.json({ notification: responseNotification })
    } catch (err) {
      console.error('[notifications] POST redis error:', err)
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
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:notifications:patch`, 30)
  if (!allowed) return getRateLimitResponse()

  let payload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { wallet, notificationId: nId, markAll, walletAddress: patchWalletAddr, walletHash: patchWalletHash, timestamp: patchTimestamp, signature: patchSig } = payload

  if (!wallet || typeof wallet !== 'string') {
    return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })
  }

  // Wallet authentication for mark-read operations
  const authAddr = patchWalletAddr || (ALEO_ADDRESS_RE.test(wallet) ? wallet : null)
  if (authAddr && patchWalletHash) {
    const auth = await verifyWalletAuth(authAddr, patchWalletHash, patchTimestamp, patchSig)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
    }
  } else {
    return NextResponse.json({ error: 'Authentication required (walletAddress + walletHash + timestamp)' }, { status: 401 })
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
    } catch (err) {
      console.error('[notifications] PATCH supabase error:', err)
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
    } catch (err) {
      console.error('[notifications] PATCH redis error:', err)
      // Redis not available
    }
  }

  return NextResponse.json({ error: 'Storage not available' }, { status: 503 })
}

/**
 * DELETE /api/notifications
 * Dismiss (delete) a notification.
 * Body: { wallet, notificationId }
 */
export async function DELETE(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:notifications:delete`, 30)
  if (!allowed) return getRateLimitResponse()

  let payload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { wallet, notificationId: nId, walletAddress: delWalletAddr, walletHash: delWalletHash, timestamp: delTimestamp, signature: delSig } = payload

  if (!wallet || typeof wallet !== 'string') {
    return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })
  }
  if (!nId || typeof nId !== 'string') {
    return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 })
  }

  // Wallet authentication for delete operations
  const delAuthAddr = delWalletAddr || (ALEO_ADDRESS_RE.test(wallet) ? wallet : null)
  if (delAuthAddr && delWalletHash) {
    const auth = await verifyWalletAuth(delAuthAddr, delWalletHash, delTimestamp, delSig)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
    }
  } else {
    return NextResponse.json({ error: 'Authentication required (walletAddress + walletHash + timestamp)' }, { status: 401 })
  }

  const walletHash = ALEO_ADDRESS_RE.test(wallet)
    ? await hashAddress(wallet)
    : wallet

  // Try Supabase first
  const supabase = getServerSupabase()
  if (supabase) {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', nId)
        .eq('wallet_hash', walletHash)
      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[notifications] DELETE supabase error:', err)
      // Fall through to Redis
    }
  }

  // Fallback: Redis — remove item from list
  const redis = getRedis()
  if (redis) {
    try {
      const key = redisKey(walletHash)
      const items = await redis.lrange(key, 0, MAX_NOTIFICATIONS - 1)
      const remaining: StoredNotification[] = []

      for (const item of items) {
        try {
          const parsed: StoredNotification =
            typeof item === 'string' ? JSON.parse(item) : (item as StoredNotification)
          // Keep all except the one being dismissed
          if (parsed.id !== nId) {
            remaining.push(parsed)
          }
        } catch {
          // Skip malformed
        }
      }

      // Replace the list atomically
      const pipeline = redis.pipeline()
      pipeline.del(key)
      for (const n of remaining) {
        pipeline.rpush(key, JSON.stringify(n))
      }
      pipeline.expire(key, NOTIFICATION_TTL_SECONDS)
      await pipeline.exec()

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[notifications] DELETE redis error:', err)
      // Redis unavailable for DELETE
    }
  }

  return NextResponse.json({ error: 'Storage not available' }, { status: 503 })
}
