'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AlertTriangle, ArrowRight, ExternalLink, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { parseMicrocredits } from '@/lib/utils'

type ConvertStatus = 'idle' | 'converting' | 'waiting' | 'done' | 'failed'

interface Props {
  requiredAmount: number
  largestRecord?: number // microcredits of the largest existing private record
  onConverted?: () => void
}

export default function BalanceConverter({
  requiredAmount,
  largestRecord = 0,
  onConverted,
}: Props) {
  const { convertPublicToPrivate, getCreditsRecords, connected, publicKey } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const [status, setStatus] = useState<ConvertStatus>('idle')
  const convertingRef = useRef(false)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [publicBalance, setPublicBalance] = useState<number | null>(null)

  // Poll wallet for the new record before calling onConverted.
  // This prevents the chained action (subscribe/tip/renew) from failing
  // because the wallet hasn't indexed the new private record yet.
  const waitForRecordSync = useCallback(async (needed: number) => {
    const MAX_RETRIES = 5
    const INITIAL_DELAY = 3000
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const delay = INITIAL_DELAY + attempt * 2000 // 3s, 5s, 7s, 9s, 11s
      await new Promise(resolve => {
        retryTimerRef.current = setTimeout(resolve, delay)
      })
      try {
        const records = await getCreditsRecords()
        const largest = records.length > 0 ? parseMicrocredits(records[0]) : 0
        if (largest >= needed) {
          return true // Record synced and sufficient
        }
      } catch {
        // Wallet not ready yet, retry
      }
    }
    return false // Gave up after retries
  }, [getCreditsRecords])

  // Fetch public balance to check if conversion is possible
  useEffect(() => {
    if (!publicKey) return
    const controller = new AbortController()
    fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(publicKey)}`, { signal: controller.signal })
      .then(res => res.ok ? res.text() : null)
      .then(text => {
        if (!text) return
        const bal = parseInt(text.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
        if (!isNaN(bal)) setPublicBalance(bal)
      })
      .catch(() => {}) // non-critical (includes AbortError)
    return () => controller.abort()
  }, [publicKey])

  // Cleanup poller and retry timer on unmount (e.g. if modal closes during conversion)
  useEffect(() => {
    return () => {
      stopPolling()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [stopPolling])

  const requiredDisplay = Number.isFinite(requiredAmount) && requiredAmount > 0
    ? (requiredAmount / 1_000_000).toFixed(2)
    : '0.00'
  const largestDisplay = largestRecord > 0 ? (largestRecord / 1_000_000).toFixed(2) : '0'
  // Add 0.5 ALEO buffer to cover fees and ensure the record is large enough
  const convertAmount = requiredAmount + 500_000
  const publicBalanceInsufficient = publicBalance !== null && publicBalance < convertAmount

  const handleConvert = async () => {
    if (convertingRef.current) return
    convertingRef.current = true
    if (!connected || status === 'converting' || status === 'waiting') { convertingRef.current = false; return }
    setStatus('converting')
    setError(null)

    try {
      const txId = await convertPublicToPrivate(convertAmount)
      if (!txId) {
        setStatus('failed')
        setError('Wallet didn\u2019t approve the conversion. Try again when ready.')
        return
      }

      setStatus('waiting')
      startPolling(txId, async (result) => {
        if (result.status === 'confirmed') {
          setStatus('done')
          toast.info('Credits converted! Syncing wallet records...', { duration: 8000 })
          // Poll for the new record instead of using a fixed delay.
          // This ensures the chained action has a sufficient record available.
          const synced = await waitForRecordSync(requiredAmount)
          if (synced) {
            onConverted?.()
          } else {
            // Records didn't sync in time — still call onConverted so the
            // chained action can attempt (its own checkBalance will retry too)
            toast.warning('Wallet sync is slow. Retrying the action — this may take a moment.', { duration: 6000 })
            onConverted?.()
          }
        } else if (result.status === 'failed') {
          setStatus('failed')
          setError('Conversion couldn\u2019t be completed on-chain. Check your balance and try again.')
        } else if (result.status === 'timeout') {
          // Shield Wallet delegates proving and never reports 'confirmed' —
          // the transaction IS broadcast, so treat timeout as likely success.
          setStatus('done')
          toast.info('Conversion likely succeeded. Syncing wallet records...', { duration: 10000 })
          const synced = await waitForRecordSync(requiredAmount)
          if (synced) {
            onConverted?.()
          } else {
            toast.warning('Wallet sync is slow. Retrying the action — this may take a moment.', { duration: 6000 })
            onConverted?.()
          }
        }
      })
    } catch (err) {
      setStatus('failed')
      setError(err instanceof Error ? err.message : 'Conversion couldn\u2019t be completed')
    } finally {
      convertingRef.current = false
    }
  }

  return (
    <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 space-y-4">
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-1" aria-hidden="true" />
        <div>
          <h4 className="text-yellow-300 font-medium text-sm mb-1">
            Private Record Too Small
          </h4>
          <p className="text-xs text-white/70">
            {largestRecord > 0 ? (
              <>Your largest private record is <strong className="text-white">{largestDisplay} ALEO</strong>, but this costs <strong className="text-white">{requiredDisplay} ALEO</strong>. Aleo requires payment from a single record.</>
            ) : (
              <>You need <strong className="text-white">{requiredDisplay} ALEO</strong> in a single private record.</>
            )}
          </p>
          {publicBalance !== null && (
            <p className="text-xs text-white/60 mt-1">
              Public balance: {(publicBalance / 1_000_000).toFixed(2)} ALEO
              {publicBalanceInsufficient && <span className="text-red-400"> (not enough to convert)</span>}
            </p>
          )}
        </div>
      </div>

      {/* Auto-Convert Button */}
      {status === 'idle' || status === 'failed' ? (
        <div className="space-y-2">
          <button
            onClick={handleConvert}
            disabled={publicBalanceInsufficient}
            aria-label={`Convert ${(convertAmount / 1_000_000).toFixed(2)} ALEO credits from public to private`}
            className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 btn-shimmer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
            Convert {(convertAmount / 1_000_000).toFixed(2)} ALEO Public → Private
          </button>
          {publicBalanceInsufficient && (
            <p className="text-xs text-red-400 text-center">
              Need {(convertAmount / 1_000_000).toFixed(2)} ALEO public but you only have {publicBalance !== null ? (publicBalance / 1_000_000).toFixed(2) : '?'} ALEO. Get credits from the faucet first.
            </p>
          )}
          {error && (
            <p className="text-xs text-red-400 text-center" role="alert">{error}</p>
          )}
          <p className="text-[11px] text-white/60 text-center">
            Converts your public balance to a private record for anonymous payments
          </p>
        </div>
      ) : status === 'converting' ? (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/10 animate-pulse">
          <Loader2 className="w-4 h-4 text-white/60 animate-spin" aria-hidden="true" />
          <span className="text-sm text-white/70">Approve conversion in wallet...</span>
        </div>
      ) : status === 'waiting' ? (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/10 animate-pulse">
          <Loader2 className="w-4 h-4 text-white/60 animate-spin" aria-hidden="true" />
          <div>
            <p className="text-sm text-white/70">Converting public → private...</p>
            <p className="text-[11px] text-white/60 mt-1">This takes ~30-60 seconds. Will auto-continue.</p>
          </div>
        </div>
      ) : status === 'done' ? (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
          <div>
            <p className="text-sm text-green-300">Conversion confirmed!</p>
            <p className="text-[11px] text-white/60 mt-1">Syncing records... will retry automatically.</p>
          </div>
        </div>
      ) : null}

      {/* Faucet link (always visible) */}
      <a
        href="https://faucet.aleo.org"
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 rounded-lg bg-surface-1 border border-border hover:bg-white/[0.05] transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-white font-medium">
            Get Testnet Credits
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-white/60" aria-hidden="true" />
        </div>
        <p className="text-xs text-white/70">
          No public balance? Request free ALEO from the testnet faucet.
        </p>
      </a>

      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        <p className="text-xs text-white/70">
          <strong className="text-white/70">Why private credits?</strong>{' '}
          VeilSub uses private transfers to keep your subscription anonymous.
          Public transfers would expose your identity on-chain.
        </p>
      </div>
    </div>
  )
}
