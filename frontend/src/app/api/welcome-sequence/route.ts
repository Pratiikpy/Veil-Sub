import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { ALEO_ADDRESS_RE } from '@/lib/config'
import { hashAddress } from '@/lib/encryption'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

/**
 * Default welcome sequence -- used when a creator hasn't customized theirs.
 * Each step has a delay (ms from subscription time) and content.
 */
const DEFAULT_SEQUENCE = [
  {
    delay: 0,
    title: 'Welcome!',
    message: 'Thanks for subscribing! Check out the creator\'s page for their best posts to get started.',
  },
  {
    delay: 86_400_000, // 1 day
    title: 'Pro tip',
    message: 'Did you know you can tip anonymously? Try it on any post -- your identity is never revealed.',
  },
  {
    delay: 259_200_000, // 3 days
    title: 'Exclusive content',
    message: 'Check out the latest exclusive content -- just for subscribers like you.',
  },
]

const SEQUENCE_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

function sequenceRedisKey(subscriberHash: string, creatorAddress: string): string {
  return `veilsub:welcome:${subscriberHash}:${creatorAddress}`
}

interface WelcomeStep {
  delay: number
  title: string
  message: string
  scheduled_at: number
  delivered: boolean
}

/**
 * GET /api/welcome-sequence?subscriber=aleo1...&creator=aleo1...
 * Returns pending welcome messages that are due for delivery.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:welcome:get`, 20)
  if (!allowed) return getRateLimitResponse()

  const subscriber = req.nextUrl.searchParams.get('subscriber')
  const creator = req.nextUrl.searchParams.get('creator')

  if (!subscriber || !ALEO_ADDRESS_RE.test(subscriber)) {
    return NextResponse.json({ error: 'Valid subscriber address required' }, { status: 400 })
  }
  if (!creator || !ALEO_ADDRESS_RE.test(creator)) {
    return NextResponse.json({ error: 'Valid creator address required' }, { status: 400 })
  }

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ messages: [], fallback: 'no_storage' })
  }

  const subscriberHash = await hashAddress(subscriber)
  const key = sequenceRedisKey(subscriberHash, creator)

  try {
    const raw = await redis.get(key)
    if (!raw) {
      return NextResponse.json({ messages: [] })
    }

    const steps: WelcomeStep[] = typeof raw === 'string' ? JSON.parse(raw) : raw as WelcomeStep[]
    const now = Date.now()

    // Find steps that are due and not yet delivered
    const pending: WelcomeStep[] = []
    const updated = steps.map((step) => {
      if (!step.delivered && step.scheduled_at <= now) {
        pending.push(step)
        return { ...step, delivered: true }
      }
      return step
    })

    // If we delivered new messages, persist the update
    if (pending.length > 0) {
      await redis.set(key, JSON.stringify(updated), { ex: SEQUENCE_TTL_SECONDS })
    }

    return NextResponse.json({
      messages: pending.map((s) => ({ title: s.title, message: s.message })),
    })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}

/**
 * POST /api/welcome-sequence
 * Start a welcome sequence for a subscriber+creator pair.
 * Body: { subscriber: string, creator: string }
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:welcome:post`, 10)
  if (!allowed) return getRateLimitResponse()

  let payload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { subscriber, creator } = payload

  if (!subscriber || typeof subscriber !== 'string' || !ALEO_ADDRESS_RE.test(subscriber)) {
    return NextResponse.json({ error: 'Valid subscriber address required' }, { status: 400 })
  }
  if (!creator || typeof creator !== 'string' || !ALEO_ADDRESS_RE.test(creator)) {
    return NextResponse.json({ error: 'Valid creator address required' }, { status: 400 })
  }

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage not available' }, { status: 503 })
  }

  const subscriberHash = await hashAddress(subscriber)
  const key = sequenceRedisKey(subscriberHash, creator)

  // Check if sequence already exists (don't restart on re-subscribe)
  const existing = await redis.get(key)
  if (existing) {
    return NextResponse.json({ started: false, reason: 'sequence_exists' })
  }

  const now = Date.now()
  const steps: WelcomeStep[] = DEFAULT_SEQUENCE.map((step) => ({
    ...step,
    scheduled_at: now + step.delay,
    delivered: false,
  }))

  try {
    await redis.set(key, JSON.stringify(steps), { ex: SEQUENCE_TTL_SECONDS })
    return NextResponse.json({ started: true, steps: steps.length })
  } catch {
    return NextResponse.json({ error: 'Failed to start sequence' }, { status: 500 })
  }
}
