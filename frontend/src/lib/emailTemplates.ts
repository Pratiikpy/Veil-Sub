/**
 * Email templates for VeilSub notifications.
 * Simple inline-styled HTML — no heavy email framework.
 * Dark theme (#050507 bg), violet accent (#8B5CF6), white text.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://veil-sub.vercel.app'

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VeilSub Notification</title>
</head>
<body style="margin:0;padding:0;background-color:#050507;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#050507;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;font-style:italic;">VeilSub</span>
              <span style="font-size:12px;color:#8B5CF6;margin-left:8px;vertical-align:super;">private</span>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="background-color:#12121A;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:0;line-height:1.6;">
                You received this email because you have notifications enabled on VeilSub.<br>
                <a href="${APP_URL}" style="color:#8B5CF6;text-decoration:none;">veilsub.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background-color:#8B5CF6;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;margin-top:24px;">${text}</a>`
}

function metricBadge(value: string, label: string): string {
  return `<div style="display:inline-block;background-color:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);border-radius:10px;padding:12px 20px;margin-right:8px;text-align:center;">
    <div style="font-size:20px;font-weight:700;color:#ffffff;">${value}</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;">${label}</div>
  </div>`
}

// ── Template: New Subscriber ──────────────────────────────────────

export function newSubscriberEmail(creatorName: string): string {
  return layout(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;background-color:rgba(16,185,129,0.15);border-radius:12px;line-height:48px;font-size:24px;">+</div>
    </div>
    <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;text-align:center;letter-spacing:-0.02em;">New Subscriber!</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin:0 0 24px;text-align:center;">
      Someone just subscribed to <strong style="color:#ffffff;">${escapeHtml(creatorName)}</strong> on VeilSub. Their identity is private — only you know you have a new supporter.
    </p>
    <div style="background-color:rgba(255,255,255,0.03);border-radius:10px;padding:16px;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;text-align:center;">
        Subscriber identity is protected by zero-knowledge proofs. No address or payment details are visible.
      </p>
    </div>
    <div style="text-align:center;">
      ${ctaButton('View Dashboard', `${APP_URL}/dashboard`)}
    </div>
  `)
}

// ── Template: Content Published ───────────────────────────────────

export function contentPublishedEmail(creatorName: string, postTitle: string): string {
  return layout(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;background-color:rgba(139,92,246,0.15);border-radius:12px;line-height:48px;font-size:24px;">&#9998;</div>
    </div>
    <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;text-align:center;letter-spacing:-0.02em;">New Post Published</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin:0 0 16px;text-align:center;">
      <strong style="color:#ffffff;">${escapeHtml(creatorName)}</strong> just published new content:
    </p>
    <div style="background-color:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.15);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <h2 style="color:#ffffff;font-size:18px;font-weight:600;margin:0;letter-spacing:-0.01em;">${escapeHtml(postTitle)}</h2>
    </div>
    <div style="text-align:center;">
      ${ctaButton('Read Now', `${APP_URL}/feed`)}
    </div>
  `)
}

// ── Template: Subscription Expiring ───────────────────────────────

export function subscriptionExpiringEmail(creatorName: string, daysLeft: number): string {
  const urgencyColor = daysLeft <= 1 ? '#F43F5E' : daysLeft <= 3 ? '#F59E0B' : '#8B5CF6'

  return layout(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;background-color:rgba(245,158,11,0.15);border-radius:12px;line-height:48px;font-size:24px;">&#9200;</div>
    </div>
    <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;text-align:center;letter-spacing:-0.02em;">Subscription Expiring Soon</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin:0 0 24px;text-align:center;">
      Your subscription to <strong style="color:#ffffff;">${escapeHtml(creatorName)}</strong> expires in:
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background-color:rgba(255,255,255,0.03);border:2px solid ${urgencyColor};border-radius:14px;padding:16px 32px;">
        <span style="font-size:36px;font-weight:800;color:${urgencyColor};">${daysLeft}</span>
        <span style="font-size:14px;color:rgba(255,255,255,0.5);margin-left:8px;">${daysLeft === 1 ? 'day' : 'days'}</span>
      </div>
    </div>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;margin:0 0 24px;text-align:center;">
      Renew now to keep your access. You can use standard or blind renewal for maximum privacy.
    </p>
    <div style="text-align:center;">
      ${ctaButton('Renew Subscription', `${APP_URL}/explore`)}
    </div>
  `)
}

// ── Template: Tip Received ────────────────────────────────────────

export function tipReceivedEmail(creatorName: string, amount: string): string {
  return layout(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;background-color:rgba(245,158,11,0.15);border-radius:12px;line-height:48px;font-size:24px;">&#10024;</div>
    </div>
    <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;text-align:center;letter-spacing:-0.02em;">You Received a Tip!</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin:0 0 24px;text-align:center;">
      Someone just tipped <strong style="color:#ffffff;">${escapeHtml(creatorName)}</strong>:
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      ${metricBadge(escapeHtml(amount), 'ALEO')}
    </div>
    <div style="background-color:rgba(255,255,255,0.03);border-radius:10px;padding:16px;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;text-align:center;">
        Tips are sent privately via commit-reveal. The sender's identity is never disclosed.
      </p>
    </div>
    <div style="text-align:center;">
      ${ctaButton('View Revenue', `${APP_URL}/analytics`)}
    </div>
  `)
}

// ── Utility ───────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export type EmailTemplateType = 'new_subscriber' | 'content_published' | 'expiring' | 'tip'

export interface EmailTemplateData {
  creatorName?: string
  postTitle?: string
  daysLeft?: number
  amount?: string
}

/** Resolve a template type + data into a subject + html pair */
export function resolveTemplate(
  type: EmailTemplateType,
  data: EmailTemplateData,
): { subject: string; html: string } {
  const name = data.creatorName ?? 'a creator'

  switch (type) {
    case 'new_subscriber':
      return {
        subject: `New subscriber on VeilSub!`,
        html: newSubscriberEmail(name),
      }
    case 'content_published':
      return {
        subject: `New post from ${name}: ${data.postTitle ?? 'Untitled'}`,
        html: contentPublishedEmail(name, data.postTitle ?? 'Untitled'),
      }
    case 'expiring':
      return {
        subject: `Your subscription to ${name} expires in ${data.daysLeft ?? '?'} days`,
        html: subscriptionExpiringEmail(name, data.daysLeft ?? 7),
      }
    case 'tip':
      return {
        subject: `You received a tip on VeilSub!`,
        html: tipReceivedEmail(name, data.amount ?? '0'),
      }
    default:
      return { subject: 'VeilSub Notification', html: layout('<p style="color:#ffffff;">You have a new notification.</p>') }
  }
}
