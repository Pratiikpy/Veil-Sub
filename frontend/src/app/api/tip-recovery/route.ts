import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

/**
 * Tip Recovery API — encrypted backup of commit-reveal tip salt data.
 *
 * POST: Save encrypted tip recovery data (keyed by subscriber_hash)
 * GET:  Check for pending tips for a subscriber_hash
 * DELETE: Clear recovery data after successful reveal
 *
 * Data is stored in Redis with a 7-day TTL matching the TipModal restore window.
 */

const TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function validateSubscriberHash(hash: unknown): hash is string {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash)
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:tip-recovery:post`, 10)
  if (!allowed) return getRateLimitResponse()

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { subscriberHash, creatorAddress, salt, amount, commitTxId } = payload

  if (!validateSubscriberHash(subscriberHash)) {
    return NextResponse.json({ error: 'Invalid subscriber hash' }, { status: 400 })
  }
  if (typeof creatorAddress !== 'string' || !/^aleo1[a-z0-9]{58}$/.test(creatorAddress)) {
    return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
  }
  if (typeof salt !== 'string' || salt.length === 0 || salt.length > 200) {
    return NextResponse.json({ error: 'Invalid salt' }, { status: 400 })
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }
  if (typeof commitTxId !== 'string' || commitTxId.length === 0 || commitTxId.length > 200) {
    return NextResponse.json({ error: 'Invalid commit tx ID' }, { status: 400 })
  }

  const key = `veilsub:tip-recovery:${subscriberHash}:${creatorAddress}`
  const data = JSON.stringify({
    salt,
    amount,
    creatorAddress,
    commitTxId,
    timestamp: Date.now(),
  })

  await redis.set(key, data, { ex: TTL_SECONDS })

  return NextResponse.json({ saved: true })
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:tip-recovery:get`, 20)
  if (!allowed) return getRateLimitResponse()

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  const subscriberHash = req.nextUrl.searchParams.get('subscriberHash')
  const creatorAddress = req.nextUrl.searchParams.get('creatorAddress')

  if (!validateSubscriberHash(subscriberHash)) {
    return NextResponse.json({ error: 'Invalid subscriber hash' }, { status: 400 })
  }
  if (typeof creatorAddress !== 'string' || !/^aleo1[a-z0-9]{58}$/.test(creatorAddress)) {
    return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
  }

  const key = `veilsub:tip-recovery:${subscriberHash}:${creatorAddress}`
  const raw = await redis.get<string>(key)

  if (!raw) {
    return NextResponse.json({ pending: null })
  }

  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    return NextResponse.json({ pending: data })
  } catch {
    return NextResponse.json({ pending: null })
  }
}

export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:tip-recovery:delete`, 10)
  if (!allowed) return getRateLimitResponse()

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let payload
  try { payload = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { subscriberHash, creatorAddress } = payload

  if (!validateSubscriberHash(subscriberHash)) {
    return NextResponse.json({ error: 'Invalid subscriber hash' }, { status: 400 })
  }
  if (typeof creatorAddress !== 'string' || !/^aleo1[a-z0-9]{58}$/.test(creatorAddress)) {
    return NextResponse.json({ error: 'Invalid creator address' }, { status: 400 })
  }

  const key = `veilsub:tip-recovery:${subscriberHash}:${creatorAddress}`
  await redis.del(key)

  return NextResponse.json({ cleared: true })
}
