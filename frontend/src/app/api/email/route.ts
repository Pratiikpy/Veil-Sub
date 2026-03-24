import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { resolveTemplate, type EmailTemplateType, type EmailTemplateData } from '@/lib/emailTemplates'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

const VALID_TYPES: EmailTemplateType[] = ['new_subscriber', 'content_published', 'expiring', 'tip']

// Simple internal auth: require a secret header to prevent external abuse.
// In production, replace with a proper service-to-service auth token.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.EMAIL_INTERNAL_SECRET
  if (!secret) {
    // DENY when not configured — prevents open relay in production
    return false
  }
  return req.headers.get('x-internal-secret') === secret
}

/**
 * POST /api/email
 *
 * Send a transactional email notification.
 *
 * Body: {
 *   type: 'new_subscriber' | 'content_published' | 'expiring' | 'tip',
 *   recipientEmail: string,
 *   data: { creatorName?, postTitle?, daysLeft?, amount? }
 * }
 */
export async function POST(req: NextRequest) {
  // Rate limit: max 10 emails per minute per IP
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`email:${ip}`, 10, 60_000)
  if (!allowed) {
    return getRateLimitResponse()
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { type?: string; recipientEmail?: string; data?: EmailTemplateData }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { type, recipientEmail, data } = body

  // Validate type
  if (!type || !VALID_TYPES.includes(type as EmailTemplateType)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 },
    )
  }

  // Validate email
  if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
    return NextResponse.json({ error: 'Invalid recipientEmail' }, { status: 400 })
  }

  // Resolve template
  const { subject, html } = resolveTemplate(type as EmailTemplateType, data ?? {})

  // Send
  const result = await sendEmail({ to: recipientEmail, subject, html })

  if (!result.success) {
    const status = result.reason === 'not_configured' ? 503 : 500
    return NextResponse.json(
      { error: result.reason ?? 'Failed to send email' },
      { status },
    )
  }

  return NextResponse.json({ success: true, id: result.id })
}
