import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { verifyWalletAuth } from '@/lib/apiAuth'
import { ALEO_ADDRESS_RE } from '@/lib/config'

/**
 * Tip Menu Orders API — tracks tip menu item purchases.
 *
 * POST: Record a tip menu order after payment confirmation
 * GET:  Retrieve orders for a creator (creator-only, requires auth)
 *
 * Data is stored in Redis keyed by creator address.
 */

const TTL_SECONDS = 90 * 24 * 60 * 60 // 90 days retention
const MAX_ORDERS_PER_CREATOR = 100

function validateItemId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 50
}

function validateItemName(name: unknown): name is string {
  return typeof name === 'string' && name.length > 0 && name.length <= 100
}

function validateTxId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 200
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:tip-menu:post`, 20)
  if (!allowed) return getRateLimitResponse()

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { creatorAddress, itemId, itemName, price, txId, walletAddress, walletHash, timestamp, signature } = payload

  // Wallet authentication (subscriber placing the order)
  if (walletAddress && walletHash) {
    const auth = await verifyWalletAuth(walletAddress, walletHash, timestamp, signature)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
    }
  } else {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (!creatorAddress || !ALEO_ADDRESS_RE.test(creatorAddress)) {
    return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
  }
  if (!validateItemId(itemId)) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
  }
  if (!validateItemName(itemName)) {
    return NextResponse.json({ error: 'Invalid item name' }, { status: 400 })
  }
  if (typeof price !== 'number' || price <= 0 || !Number.isFinite(price)) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }
  if (!validateTxId(txId)) {
    return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 })
  }

  // Store order in a list keyed by creator address
  const key = `veilsub:tip-menu-orders:${creatorAddress}`
  const order = {
    id: `order-${crypto.randomUUID()}`,
    itemId,
    itemName,
    price,
    txId,
    subscriberHash: walletHash, // Privacy-preserving: hash instead of address
    timestamp: Date.now(),
    status: 'pending', // pending | fulfilled | cancelled
  }

  // Use a sorted set with timestamp as score for ordering
  await redis.zadd(key, { score: Date.now(), member: JSON.stringify(order) })

  // Trim to keep only the most recent orders
  const count = await redis.zcard(key)
  if (count > MAX_ORDERS_PER_CREATOR) {
    await redis.zremrangebyrank(key, 0, count - MAX_ORDERS_PER_CREATOR - 1)
  }

  // Set TTL on the key
  await redis.expire(key, TTL_SECONDS)

  return NextResponse.json({ saved: true, orderId: order.id })
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:tip-menu:get`, 30)
  if (!allowed) return getRateLimitResponse()

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  const creatorAddress = req.nextUrl.searchParams.get('creatorAddress')
  const walletHash = req.nextUrl.searchParams.get('walletHash')
  const timestamp = req.nextUrl.searchParams.get('timestamp')

  if (!creatorAddress || !ALEO_ADDRESS_RE.test(creatorAddress)) {
    return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
  }

  // Only the creator can view their orders (requires auth)
  if (walletHash && timestamp) {
    const auth = await verifyWalletAuth(creatorAddress, walletHash, parseInt(timestamp, 10), undefined)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
    }
  } else {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const key = `veilsub:tip-menu-orders:${creatorAddress}`
  const raw = await redis.zrange(key, 0, -1, { rev: true })

  const orders = raw.flatMap((entry) => {
    try {
      return [typeof entry === 'string' ? JSON.parse(entry) : entry]
    } catch {
      return []
    }
  })

  return NextResponse.json({ orders })
}

export async function PATCH(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:tip-menu:patch`, 20)
  if (!allowed) return getRateLimitResponse()

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { creatorAddress, orderId, status, walletAddress, walletHash, timestamp, signature } = payload

  // Only the creator can update order status
  if (walletAddress && walletHash) {
    const auth = await verifyWalletAuth(walletAddress, walletHash, timestamp, signature)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
    }
    // Verify the wallet is the creator's wallet
    if (walletAddress !== creatorAddress) {
      return NextResponse.json({ error: 'Only the creator can update orders' }, { status: 403 })
    }
  } else {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (!creatorAddress || !ALEO_ADDRESS_RE.test(creatorAddress)) {
    return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
  }
  if (typeof orderId !== 'string' || !orderId.startsWith('order-')) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
  }
  if (!['pending', 'fulfilled', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const key = `veilsub:tip-menu-orders:${creatorAddress}`
  const raw = await redis.zrange(key, 0, -1, { withScores: true })

  for (let i = 0; i < raw.length; i += 2) {
    const entry = raw[i]
    const score = raw[i + 1] as number
    try {
      const order = typeof entry === 'string' ? JSON.parse(entry) : entry
      if (order.id === orderId) {
        const updated = { ...order, status, updatedAt: Date.now() }
        await redis.zrem(key, typeof entry === 'string' ? entry : JSON.stringify(entry))
        await redis.zadd(key, { score, member: JSON.stringify(updated) })
        return NextResponse.json({ updated: true, order: updated })
      }
    } catch {
      continue
    }
  }

  return NextResponse.json({ error: 'Order not found' }, { status: 404 })
}
