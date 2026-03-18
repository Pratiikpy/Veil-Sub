import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export interface SendEmailResult {
  success: boolean
  id?: string
  reason?: string
}

/**
 * Send a transactional email via Resend.
 * Gracefully degrades when RESEND_API_KEY is not configured (logs and returns).
 * Uses onboarding@resend.dev as sender until a custom domain is verified.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!resend) {
    console.log('[email] Resend not configured, skipping email:', params.subject)
    return { success: false, reason: 'not_configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_ADDRESS || 'VeilSub <onboarding@resend.dev>',
      to: params.to,
      subject: params.subject,
      html: params.html,
    })

    if (error) {
      console.error('[email] Resend error:', error.message)
      return { success: false, reason: error.message }
    }

    return { success: true, id: data?.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'send_failed'
    console.error('[email] Send failed:', msg)
    return { success: false, reason: msg }
  }
}
