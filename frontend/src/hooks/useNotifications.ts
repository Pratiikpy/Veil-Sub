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
  const abortControllerRef = useRef<AbortController | null>(null)

  const walletAddress = address ?? null

  // Fetch notifications from API with abort support
  const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
    if (!walletAddress) return
    try {
      setLoading(true)
      const res = await fetch(
        `/api/notifications?wallet=${encodeURIComponent(walletAddress)}&limit=${MAX_NOTIFICATIONS}`,
        signal ? { signal } : undefined
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
    } catch (err) {
      // Ignore abort errors, keep existing notifications on network error
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  // Poll for notifications with abort controller
  useEffect(() => {
    if (!connected || !walletAddress) {
      // Cancel any in-flight request when disconnecting
      abortControllerRef.current?.abort()
      setNotifications([])
      prevCountRef.current = 0
      lastFetchRef.current = null
      return
    }

    // Create abort controller for this effect's fetch
    const controller = new AbortController()
    abortControllerRef.current = controller

    fetchNotifications(controller.signal)
    const interval = setInterval(() => {
      // Cancel previous fetch before starting new one
      abortControllerRef.current?.abort()
      const newController = new AbortController()
      abortControllerRef.current = newController
      fetchNotifications(newController.signal)
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      controller.abort() // Cancel on cleanup
    }
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

  const dismiss = useCallback(async (notificationId: string) => {
    if (!walletAddress) return
    // Optimistic update
    const previousNotifications = notifications
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))

    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          notificationId,
        }),
      })
    } catch {
      // Revert on failure
      setNotifications(previousNotifications)
    }
  }, [walletAddress, notifications])

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
