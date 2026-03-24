'use client'

import { useEffect } from 'react'
import { Bell, CheckCircle2, Gift, AlertTriangle, FileText, Users, Coins, Mail } from 'lucide-react'
import PageTransition from '@/components/PageTransition'
import { useNotifications } from '@/hooks/useNotifications'
import type { NotificationType } from '@/lib/notifications'

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diff = now - then
  if (diff < 0) return 'just now'
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const ICON_MAP: Record<NotificationType, typeof Bell> = {
  new_subscriber: Users,
  new_tip: Coins,
  content_published: FileText,
  subscription_expiring: AlertTriangle,
  gift_received: Gift,
  dispute_filed: AlertTriangle,
  welcome_message: Mail,
}

export default function NotificationsPage() {
  const { notifications, loading, markAllAsRead } = useNotifications()

  // Mark all as read when page is viewed (single batch request)
  useEffect(() => {
    const hasUnread = notifications.some((n) => !n.read)
    if (hasUnread && !loading) {
      markAllAsRead()
    }
  }, [notifications, loading, markAllAsRead])

  return (
    <PageTransition>
      <main className="min-h-screen bg-background py-12 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Notifications
            </h1>
            <p className="text-white/60 text-sm">
              Stay updated on your subscriptions and creator activity.
            </p>
          </div>

          {loading && notifications.length === 0 && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-surface-1 border border-border animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.06]" />
                    <div className="flex-1">
                      <div className="h-4 w-40 rounded bg-white/[0.06] mb-1.5" />
                      <div className="h-3 w-60 rounded bg-white/[0.04]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="text-center py-16 rounded-2xl bg-surface-1 border border-border">
              <Bell className="w-12 h-12 text-white/20 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-lg font-medium text-white mb-2">No notifications yet</h2>
              <p className="text-sm text-white/50 max-w-md mx-auto">
                You&apos;ll see alerts for new content, expiring subscriptions, and tips here.
              </p>
            </div>
          )}

          {notifications.length > 0 && (
            <div className="space-y-2">
              {notifications.map((n) => {
                const Icon = ICON_MAP[n.type] || Bell
                return (
                  <div
                    key={n.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      n.read
                        ? 'bg-surface-1/40 border-border/50'
                        : 'bg-white/[0.02] border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white/[0.04] border border-border shrink-0">
                        <Icon className="w-4 h-4 text-white/60" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-xs text-white/40 mt-1.5">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-white/70 shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </PageTransition>
  )
}
