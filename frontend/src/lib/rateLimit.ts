import { NextResponse } from 'next/server'

/**
 * Simple in-memory rate limiter for API routes.
 *
 * Uses a Map keyed by identifier (typically IP + route). Each entry tracks
 * a rolling window with request count and reset timestamp.
 *
 * Sufficient for testnet / hackathon usage. For production, replace with
 * Redis-backed rate limiting (e.g., Upstash @upstash/ratelimit).
 */
const requests = new Map<string, { count: number; resetAt: number }>()

// Periodic cleanup to prevent memory leaks from stale entries
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
let lastCleanup = Date.now()

function cleanupStaleEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, record] of requests) {
    if (now > record.resetAt) {
      requests.delete(key)
    }
  }
}

export function rateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  cleanupStaleEntries()

  const now = Date.now()
  const record = requests.get(identifier)

  if (!record || now > record.resetAt) {
    requests.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: limit - record.count }
}

export function getRateLimitResponse() {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': '60' } }
  )
}

/**
 * Extract a client identifier from the request for rate limiting.
 * Uses x-forwarded-for (Vercel/proxy), x-real-ip, or falls back to 'unknown'.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
