'use client'

import { useCallback, useRef } from 'react'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
// All API calls routed through Next.js rewrite proxy to avoid leaking user interest to third-party APIs

type PollingStrategy = 'wallet' | 'provable' | 'explorer' | 'fallback'
type PollStatus = 'pending' | 'confirmed' | 'failed' | 'unknown'

interface PollResult {
  status: PollStatus
  strategy: PollingStrategy
}

export function useTransactionPoller() {
  const { transactionStatus } = useWallet()
  // Track the latest abort fn so stopPolling can cancel whatever is active
  const latestAbortRef = useRef<(() => void) | null>(null)

  const pollWallet = useCallback(
    async (txId: string): Promise<PollResult> => {
      if (!transactionStatus) throw new Error('No wallet transactionStatus')
      const status = await transactionStatus(txId)
      const s = (typeof status === 'string' ? status : '').toLowerCase()
      if (s.includes('finalize') || s.includes('confirm') || s.includes('accept')) {
        return { status: 'confirmed', strategy: 'wallet' }
      }
      if (s.includes('fail') || s.includes('reject')) {
        return { status: 'failed', strategy: 'wallet' }
      }
      return { status: 'pending', strategy: 'wallet' }
    },
    [transactionStatus]
  )

  const pollProvable = useCallback(async (txId: string): Promise<PollResult> => {
    const res = await fetch(`/api/aleo/transaction/${txId}`)
    if (!res.ok) throw new Error('Provable API error')
    const text = await res.text()
    if (text && text !== 'null') {
      return { status: 'confirmed', strategy: 'provable' }
    }
    return { status: 'pending', strategy: 'provable' }
  }, [])

  const pollExplorer = useCallback(async (txId: string): Promise<PollResult> => {
    // Use Aleoscan as an independent verification source
    const res = await fetch(`/api/aleoscan/transaction/${txId}`)
    if (!res.ok) throw new Error('Aleoscan proxy error')
    const text = await res.text()
    if (text && text !== 'null' && !text.includes('"error"')) {
      return { status: 'confirmed', strategy: 'explorer' }
    }
    return { status: 'pending', strategy: 'explorer' }
  }, [])

  const pollOnce = useCallback(
    async (txId: string): Promise<PollResult> => {
      const strategies = [pollWallet, pollProvable, pollExplorer]
      let lastPending: PollResult | null = null

      for (const strategy of strategies) {
        try {
          const result = await strategy(txId)
          if (result.status === 'confirmed' || result.status === 'failed') return result
          lastPending = result
        } catch {
          continue
        }
      }

      // If all strategies returned pending, return that
      if (lastPending) return lastPending

      // Fallback: after 5 minutes, report as pending (let maxAttempts handle timeout)
      return { status: 'pending', strategy: 'fallback' }
    },
    [pollWallet, pollProvable, pollExplorer]
  )

  const startPolling = useCallback(
    (
      txId: string,
      onStatus: (result: PollResult) => void,
      intervalMs = 3000,
      maxAttempts = 120
    ) => {
      // Per-invocation abort — no shared ref interference
      const aborted = { current: false }
      let attempts = 0
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      const abort = () => {
        aborted.current = true
        if (timeoutId) clearTimeout(timeoutId)
      }

      // Cancel any previous polling session
      if (latestAbortRef.current) latestAbortRef.current()
      latestAbortRef.current = abort

      const poll = async () => {
        if (aborted.current) return

        if (attempts >= maxAttempts) {
          onStatus({ status: 'failed', strategy: 'fallback' })
          return
        }

        attempts++
        try {
          const result = await pollOnce(txId)
          if (aborted.current) return
          onStatus(result)

          if (result.status === 'confirmed' || result.status === 'failed') {
            return
          }
        } catch {
          // pollOnce threw unexpectedly — continue polling
          if (aborted.current) return
        }

        timeoutId = setTimeout(poll, intervalMs)
      }

      // Start first poll after a small delay
      timeoutId = setTimeout(poll, 1000)

      // Return abort function for callers that want direct control
      return abort
    },
    [pollOnce]
  )

  const stopPolling = useCallback(() => {
    if (latestAbortRef.current) {
      latestAbortRef.current()
      latestAbortRef.current = null
    }
  }, [])

  return { startPolling, stopPolling, pollOnce }
}
