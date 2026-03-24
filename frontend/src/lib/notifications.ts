export type NotificationType =
  | 'new_subscriber'
  | 'new_tip'
  | 'content_published'
  | 'subscription_expiring'
  | 'gift_received'
  | 'dispute_filed'
  | 'welcome_message'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  createdAt: string
  read: boolean
  data?: Record<string, string>
}

/** Human-readable titles for each notification type */
export const NOTIFICATION_TITLES: Record<NotificationType, string> = {
  new_subscriber: 'New Subscriber',
  new_tip: 'Tip Received',
  content_published: 'Content Published',
  subscription_expiring: 'Subscription Expiring',
  gift_received: 'Gift Received',
  dispute_filed: 'Dispute Filed',
  welcome_message: 'Welcome Message',
}

/** Icon identifiers for each notification type (mapped to Lucide icons in UI) */
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  new_subscriber: 'user-plus',
  new_tip: 'coins',
  content_published: 'file-text',
  subscription_expiring: 'clock',
  gift_received: 'gift',
  dispute_filed: 'alert-triangle',
  welcome_message: 'mail',
}
