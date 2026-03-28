'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { computeWalletHash } from '@/lib/utils'

const POLL_INTERVAL_MS = 30_000 // 30 seconds

/**
 * Hook to track unread message count for the connected wallet.
 * Polls /api/messages?unread=true every 30 seconds.
 */
export function useUnreadMessages() {
  const { address, connected } = useWallet()
  const [unreadCount, setUnreadCount] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const walletAddress = address ?? null

  const fetchUnreadCount = useCallback(async (signal?: AbortSignal) => {
    if (!walletAddress) return
    try {
      const walletHash = await computeWalletHash(walletAddress)
      const timestamp = Date.now()
      const res = await fetch(
        `/api/messages?unread=true&walletHash=${encodeURIComponent(walletHash)}&walletAddress=${encodeURIComponent(walletAddress)}&timestamp=${timestamp}`,
        signal ? { signal } : undefined
      )
      if (!res.ok) return
      const data = await res.json()
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      // Silently fail on network errors
    }
  }, [walletAddress])

  // Poll for unread messages
  useEffect(() => {
    if (!connected || !walletAddress) {
      abortControllerRef.current?.abort()
      setUnreadCount(0)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    fetchUnreadCount(controller.signal)
    const interval = setInterval(() => {
      abortControllerRef.current?.abort()
      const newController = new AbortController()
      abortControllerRef.current = newController
      fetchUnreadCount(newController.signal)
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      abortControllerRef.current?.abort()
    }
  }, [connected, walletAddress, fetchUnreadCount])

  const refreshUnread = useCallback(() => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    fetchUnreadCount(controller.signal)
  }, [fetchUnreadCount])

  return { unreadCount, refreshUnread }
}
