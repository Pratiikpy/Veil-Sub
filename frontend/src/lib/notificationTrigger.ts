/**
 * Helper to fire notifications after successful on-chain transactions.
 * Called from API routes or client-side after transaction confirmation.
 * Best-effort: never throws, never blocks the transaction flow.
 */

import { computeWalletHash } from '@/lib/utils'
import type { NotificationType } from './notifications'

interface NotificationPayload {
  wallet: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, string>
}

/**
 * Send a notification to a wallet address.
 * Uses the internal /api/notifications endpoint.
 * Best-effort: silently fails if the API is unreachable.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    const walletHash = await computeWalletHash(payload.wallet)
    const timestamp = Date.now()
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        walletAddress: payload.wallet,
        walletHash,
        timestamp,
      }),
    })
  } catch {
    // Best-effort — never block transaction flow
  }
}

/** Notify creator of a new subscriber */
export function notifyNewSubscriber(
  creatorAddress: string,
  tier: number,
  txId?: string
): void {
  sendNotification({
    wallet: creatorAddress,
    type: 'new_subscriber',
    title: 'New Subscriber!',
    message: `Someone subscribed to your tier ${tier} content. Your audience is growing!`,
    data: txId ? { txId } : undefined,
  })
}

/** Notify creator of a tip */
export function notifyNewTip(
  creatorAddress: string,
  amountCredits: string,
  txId?: string
): void {
  sendNotification({
    wallet: creatorAddress,
    type: 'new_tip',
    title: 'Tip Received!',
    message: `You received a tip of ${amountCredits} ALEO. Keep creating great content!`,
    data: txId ? { txId } : undefined,
  })
}

/** Notify creator of content published */
export function notifyContentPublished(
  creatorAddress: string,
  contentTitle: string
): void {
  sendNotification({
    wallet: creatorAddress,
    type: 'content_published',
    title: 'Content Published',
    message: `Your post "${contentTitle}" is now live and available to subscribers.`,
  })
}

/** Notify recipient of a gift subscription */
export function notifyGiftReceived(
  recipientAddress: string,
  tier: number
): void {
  sendNotification({
    wallet: recipientAddress,
    type: 'gift_received',
    title: 'Gift Subscription Received!',
    message: `Someone gifted you a tier ${tier} subscription. Redeem it in your dashboard!`,
  })
}

/** Notify creator of a dispute filed */
export function notifyDisputeFiled(
  creatorAddress: string,
  contentId: string
): void {
  sendNotification({
    wallet: creatorAddress,
    type: 'dispute_filed',
    title: 'Content Dispute Filed',
    message: 'A subscriber has filed a dispute against one of your posts. Review it in your dashboard.',
    data: { contentId },
  })
}
