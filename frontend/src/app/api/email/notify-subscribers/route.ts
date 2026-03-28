import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { newPostNotificationEmail } from '@/lib/emailTemplates'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'
import { ALEO_ADDRESS_RE } from '@/lib/config'
import { validateOrigin } from '@/lib/csrf'
import { verifyWalletAuth } from '@/lib/apiAuth'

/**
 * POST /api/email/notify-subscribers
 *
 * Sends email notifications to subscribers who opted in when a creator
 * publishes new content. Best-effort: failures are logged but never
 * propagated to the client.
 *
 * Body: {
 *   creatorAddress: string,
 *   postTitle: string,
 *   postPreview: string,
 *   postId: string,
 *   walletAddress: string,
 *   walletHash: string,
 *   timestamp: number,
 * }
 *
 * Rate limit: max 1 notification batch per creator per hour.
 */
export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // Rate limit per IP
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`email-notify:${ip}`, 5, 60_000)
  if (!allowed) return getRateLimitResponse()

  let body: {
    creatorAddress?: string
    postTitle?: string
    postPreview?: string
    postId?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { creatorAddress, postTitle, postPreview, postId } = body
  const { walletAddress, walletHash, timestamp } = body as {
    walletAddress?: string; walletHash?: unknown; timestamp?: unknown
  }

  // Validate inputs
  if (!creatorAddress || !ALEO_ADDRESS_RE.test(creatorAddress)) {
    return NextResponse.json({ error: 'Valid creator address required' }, { status: 400 })
  }
  if (!postTitle || typeof postTitle !== 'string') {
    return NextResponse.json({ error: 'Post title required' }, { status: 400 })
  }

  // Wallet authentication — only the creator can trigger subscriber notifications
  if (!walletAddress || !walletHash || timestamp === undefined) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const auth = await verifyWalletAuth(walletAddress, walletHash, timestamp)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 })
  }
  if (walletAddress !== creatorAddress) {
    return NextResponse.json({ error: 'Only the creator can trigger subscriber notifications' }, { status: 403 })
  }

  // Rate limit: max 1 notification batch per creator per hour
  const creatorRl = rateLimit(`email-notify:creator:${creatorAddress}`, 1, 3_600_000)
  if (!creatorRl.allowed) {
    // Silently skip — don't error to the client
    return NextResponse.json({ success: true, skipped: true, reason: 'rate_limited' })
  }

  // Look up Supabase for subscriber emails opted in for this creator
  const supabase = getServerSupabase()
  if (!supabase) {
    // Supabase not configured — graceful skip
    return NextResponse.json({ success: true, skipped: true, reason: 'no_database' })
  }

  try {
    // Hash the creator address for lookup (stored as SHA-256 in notification_emails)
    const encoder = new TextEncoder()
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(creatorAddress))
    const creatorHash = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Query subscribers who opted in for this creator.
    // Two groups: (1) those subscribed to this specific creator, (2) those with
    // empty creator_hashes (meaning "all creators").
    const [specificResult, globalResult] = await Promise.all([
      supabase
        .from('notification_emails')
        .select('email')
        .contains('creator_hashes', [creatorHash]),
      supabase
        .from('notification_emails')
        .select('email')
        .eq('creator_hashes', '{}'),
    ])

    // Merge both result sets, deduplicate by email
    const allSubscribers = [
      ...(specificResult.data || []),
      ...(globalResult.data || []),
    ]
    const seen = new Set<string>()
    const subscribers = allSubscribers.filter(s => {
      if (seen.has(s.email)) return false
      seen.add(s.email)
      return true
    })

    if (subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        reason: 'no_subscribers',
      })
    }

    // Resolve creator display name from Supabase profile
    let creatorName = 'A creator'
    try {
      const creatorAddrHash = creatorHash // reuse
      const { data: profile } = await supabase
        .from('creator_profiles')
        .select('display_name')
        .eq('address_hash', creatorAddrHash)
        .single()
      if (profile?.display_name) {
        creatorName = profile.display_name
      }
    } catch {
      // Ignore — use default name
    }

    const safeTitle = postTitle.slice(0, 200)
    const safePreview = (postPreview || '').slice(0, 300)

    // Send emails in parallel (max 20 per batch to avoid overwhelming Resend)
    const batch = subscribers.slice(0, 20)
    const results = await Promise.allSettled(
      batch.map(sub =>
        sendEmail({
          to: sub.email,
          subject: `New from ${creatorName}: ${safeTitle}`,
          html: newPostNotificationEmail(creatorName, safeTitle, safePreview, creatorAddress, postId || ''),
        })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length

    return NextResponse.json({ success: true, sent })
  } catch {
    // Best-effort — never fail the publish flow
    return NextResponse.json({ success: true, sent: 0, reason: 'internal_error' })
  }
}
