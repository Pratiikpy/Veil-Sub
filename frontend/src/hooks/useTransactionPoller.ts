'use client'

import { useCallback, useRef } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'

type PollingStrategy = 'wallet' | 'fallback'
type PollStatus = 'pending' | 'confirmed' | 'failed' | 'timeout' | 'unknown'

interface PollResult {
  status: PollStatus
  strategy: PollingStrategy
  resolvedTxId?: string
}

// Best-effort attempt to find the real at1... transaction ID.
// Shield Wallet returns shield_* IDs, Leo Wallet returns UUIDs — neither
// is a real explorer ID. Try the Provable API as a best-effort resolution.
async function resolveRealTxId(tempId: string): Promise<string | null> {
  if (tempId.startsWith('at1')) return tempId // already a real ID
  // UUIDs (Leo Wallet) and shield_* IDs won't resolve on the Provable API — skip fetch
  if (tempId.includes('-') || tempId.startsWith('shield_')) return null
  try {
    const res = await fetch(`/api/aleo/transaction/${tempId}`)
    if (res.ok) {
      const data = await res.json()
      const id = data?.id || data?.transaction?.id
      if (id && typeof id === 'string' && id.startsWith('at1')) return id
    }
  } catch { /* best effort */ }
  return null
}

export function useTransactionPoller() {
  const { transactionStatus } = useWallet()
  const latestAbortRef = useRef<(() => void) | null>(null)

  const pollWallet = useCallback(
    async (txId: string): Promise<PollResult> => {
      if (!transactionStatus) throw new Error('No wallet transactionStatus')
      const result = await transactionStatus(txId)
      const s = (typeof result === 'string' ? result : result?.status || '').toLowerCase()
      if (s.includes('finalize') || s.includes('confirm') || s.includes('complete')) {
        return { status: 'confirmed', strategy: 'wallet' }
      }
      if (s.includes('fail') || s.includes('reject')) {
        return { status: 'failed', strategy: 'wallet' }
      }
      return { status: 'pending', strategy: 'wallet' }
    },
    [transactionStatus]
  )

  const startPolling = useCallback(
    (
      txId: string,
      onStatus: (result: PollResult) => void,
      intervalMs = 3000,
      maxAttempts = 120
    ) => {
      const aborted = { current: false }
      let attempts = 0
      let nonFailureSince = 0 // polls without any failure signal
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      const abort = () => {
        aborted.current = true
        if (timeoutId) clearTimeout(timeoutId)
      }

      if (latestAbortRef.current) latestAbortRef.current()
      latestAbortRef.current = abort

      const poll = async () => {
        if (aborted.current) return

        if (attempts >= maxAttempts) {
          // After 120 polls (~6 minutes) with no definitive result, report timeout.
          // Do NOT auto-confirm — the user should check their wallet or refresh.
          onStatus({ status: 'timeout', strategy: 'fallback' })
          return
        }

        attempts++
        try {
          const result = await pollWallet(txId)
          if (aborted.current) return

          if (result.status === 'confirmed' || result.status === 'failed') {
            onStatus(result)
            return
          }

          // Track non-failure polls for diagnostic purposes but do NOT auto-confirm.
          // Wallet adapters (Shield, Leo) have quirks — they may report "accepted" or
          // "pending" indefinitely without ever saying "confirmed". The timeout at
          // maxAttempts handles this case safely without lying about confirmation.
          if (result.status === 'pending') {
            const rawResult = await transactionStatus?.(txId)
            if (aborted.current) return // Check after async operation
            const rawS = (typeof rawResult === 'string' ? rawResult : (rawResult as { status?: string } | null)?.status || '').toLowerCase()

            if (!rawS.includes('fail') && !rawS.includes('reject')) {
              nonFailureSince++
            } else {
              nonFailureSince = 0
            }
          }

          onStatus(result)
        } catch {
          if (aborted.current) return
        }

        timeoutId = setTimeout(poll, intervalMs)
      }

      timeoutId = setTimeout(poll, 1000)
      return abort
    },
    [pollWallet, transactionStatus]
  )

  const stopPolling = useCallback(() => {
    if (latestAbortRef.current) {
      latestAbortRef.current()
      latestAbortRef.current = null
    }
  }, [])

  return { startPolling, stopPolling }
}
