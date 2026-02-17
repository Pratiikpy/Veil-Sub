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
// Shield Wallet returns temporary shield_* IDs that don't exist on the explorer.
// We try querying the Provable API for the transaction; if the wallet eventually
// maps the temp ID to a real one, the API will resolve it.
async function resolveRealTxId(tempId: string): Promise<string | null> {
  if (!tempId.startsWith('shield_')) return tempId // already a real ID
  try {
    // Try the Provable transaction endpoint — some wallets map temp IDs server-side
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
      let acceptedSince = 0 // track how many polls returned "accepted"
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

          // Shield Wallet returns "accepted" for mempool transactions.
          // After enough time with "accepted", treat as confirmed for UI purposes.
          // (The transaction is unlikely to be reversed once accepted.)
          if (result.status === 'pending') {
            // Check raw status from the wallet to detect "accepted"
            const rawResult = await transactionStatus?.(txId)
            const rawS = (typeof rawResult === 'string' ? rawResult : (rawResult as any)?.status || '').toLowerCase()
            if (rawS.includes('accept')) {
              acceptedSince++
              // After 10 polls (~30s) with "accepted", report as confirmed
              if (acceptedSince >= 10) {
                // Try to resolve real at1... tx ID from the network
                const realId = await resolveRealTxId(txId)
                onStatus({ status: 'confirmed', strategy: 'wallet', resolvedTxId: realId || undefined })
                return
              }
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
