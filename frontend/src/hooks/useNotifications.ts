'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import type { Notification } from '@/lib/notifications'

const MAX_NOTIFICATIONS = 20
const POLL_INTERVAL_MS = 30_000 // 30 seconds

/**
 * Play a subtle notification chime using Web Audio API.
 * No external audio files needed.
 */
function playNotificationChime(): void {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5
    oscillator.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08) // D6

    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)

    // Clean up after sound finishes
    oscillator.onended = () => {
      gain.disconnect()
      ctx.close()
    }
  } catch {
    // Audio not available — silently ignore
  }
}

export function useNotifications() {
  const { address, connected } = useWallet()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const lastFetchRef = useRef<string | null>(null)
  const prevCountRef = useRef(0)

  const walletAddress = address ?? null

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!walletAddress) return
    try {
      setLoading(true)
      const res = await fetch(
        `/api/notifications?wallet=${encodeURIComponent(walletAddress)}&limit=${MAX_NOTIFICATIONS}`
      )
      if (!res.ok) return
      const data = await res.json()
      const fetched: Notification[] = data.notifications ?? []

      setNotifications(fetched)

      // Play chime if new unread notifications arrived since last fetch
      const unreadCount = fetched.filter((n) => !n.read).length
      if (
        lastFetchRef.current === walletAddress &&
        unreadCount > prevCountRef.current
      ) {
        playNotificationChime()
      }
      prevCountRef.current = unreadCount
      lastFetchRef.current = walletAddress
    } catch {
      // Network error — keep existing notifications
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  // Poll for notifications
  useEffect(() => {
    if (!connected || !walletAddress) {
      setNotifications([])
      prevCountRef.current = 0
      lastFetchRef.current = null
      return
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [connected, walletAddress, fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!walletAddress) return
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet: walletAddress,
            notificationId,
          }),
        })
      } catch {
        // Revert on failure
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: false } : n
          )
        )
      }
    },
    [walletAddress]
  )

  const markAllAsRead = useCallback(async () => {
    if (!walletAddress) return
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          markAll: true,
        }),
      })
    } catch {
      // Revert on failure
      fetchNotifications()
    }
  }, [walletAddress, fetchNotifications])

  const dismiss = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh: fetchNotifications,
  }
}
