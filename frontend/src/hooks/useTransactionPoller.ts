'use client'

import { useCallback, useRef } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'

type PollingStrategy = 'wallet' | 'fallback'
type PollStatus = 'pending' | 'confirmed' | 'failed' | 'unknown'

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
      console.log(`[TxPoller] wallet status for ${txId}: "${s}"`)

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
          onStatus({ status: 'pending', strategy: 'fallback' })
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

          // Both Shield Wallet and Leo Wallet have quirks:
          // - Shield: returns "accepted" but never "finalized"
          // - Leo: returns "pending" forever but internally shows "Completed"
          // After enough non-failure polls, treat as confirmed.
          if (result.status === 'pending') {
            const rawResult = await transactionStatus?.(txId)
            const rawS = (typeof rawResult === 'string' ? rawResult : (rawResult as any)?.status || '').toLowerCase()

            // Count any non-failure response (pending, accepted, etc.)
            if (!rawS.includes('fail') && !rawS.includes('reject')) {
              nonFailureSince++
            } else {
              nonFailureSince = 0
            }

            // "accepted" = in mempool → confirm after 10 polls (~30s)
            // "pending" with no failure → confirm after 20 polls (~60s)
            const threshold = rawS.includes('accept') ? 10 : 20
            if (nonFailureSince >= threshold) {
              const realId = await resolveRealTxId(txId)
              onStatus({ status: 'confirmed', strategy: 'wallet', resolvedTxId: realId || undefined })
              return
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
