'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Check, CheckCheck, UserPlus, Coins, FileText, Clock, Gift, AlertTriangle, X } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { AnimatePresence, m } from 'framer-motion'
import type { Notification, NotificationType } from '@/lib/notifications'

const ICON_MAP: Record<NotificationType, typeof Bell> = {
  new_subscriber: UserPlus,
  new_tip: Coins,
  content_published: FileText,
  subscription_expiring: Clock,
  gift_received: Gift,
  dispute_filed: AlertTriangle,
}

const ICON_COLOR_MAP: Record<NotificationType, string> = {
  new_subscriber: 'text-emerald-400',
  new_tip: 'text-amber-400',
  content_published: 'text-violet-400',
  subscription_expiring: 'text-orange-400',
  gift_received: 'text-pink-400',
  dispute_filed: 'text-red-400',
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function NotificationItem({
  notification,
  onRead,
  onDismiss,
}: {
  notification: Notification
  onRead: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const Icon = ICON_MAP[notification.type] ?? Bell
  const iconColor = ICON_COLOR_MAP[notification.type] ?? 'text-white/60'

  return (
    <m.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={`group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03] ${
        notification.read ? 'opacity-60' : ''
      }`}
    >
      <div className={`mt-0.5 p-1.5 rounded-lg bg-white/[0.06] ${iconColor}`}>
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {notification.title}
        </p>
        <p className="text-xs text-white/60 line-clamp-2 leading-relaxed mt-0.5">
          {notification.message}
        </p>
        <p className="text-[10px] text-white/40 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRead(notification.id)
            }}
            title="Mark as read"
            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            <Check className="w-3 h-3" aria-hidden="true" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss(notification.id)
          }}
          title="Dismiss"
          className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
    </m.div>
  )
}

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        className="relative p-2 rounded-lg hover:bg-white/[0.06] text-white/60 hover:text-white/80 transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-black">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] rounded-2xl bg-surface-1 border border-border shadow-2xl shadow-black/40 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto max-h-[400px] divide-y divide-border/50">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 text-white/20 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-sm text-white/40">No notifications yet</p>
                  <p className="text-xs text-white/30 mt-1">
                    Activity from subscribers and tips will appear here
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={markAsRead}
                      onDismiss={dismiss}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
