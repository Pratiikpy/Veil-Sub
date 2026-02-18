'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, ArrowRight, ExternalLink, Loader2, Check } from 'lucide-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'

type ConvertStatus = 'idle' | 'converting' | 'waiting' | 'done' | 'failed'

interface Props {
  requiredAmount: number
  onConverted?: () => void
}

export default function BalanceConverter({
  requiredAmount,
  onConverted,
}: Props) {
  const { convertPublicToPrivate, connected } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const [status, setStatus] = useState<ConvertStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Cleanup poller on unmount (e.g. if modal closes during conversion)
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const requiredDisplay = (requiredAmount / 1_000_000).toFixed(2)
  // Add 0.5 ALEO buffer to cover fees and ensure the record is large enough
  const convertAmount = requiredAmount + 500_000

  const handleConvert = async () => {
    if (!connected || status === 'converting' || status === 'waiting') return
    setStatus('converting')
    setError(null)

    try {
      const txId = await convertPublicToPrivate(convertAmount)
      if (!txId) {
        setStatus('failed')
        setError('Conversion rejected by wallet.')
        return
      }

      setStatus('waiting')
      startPolling(txId, (result) => {
        if (result.status === 'confirmed') {
          setStatus('done')
          // Wait for record sync before notifying parent
          setTimeout(() => {
            onConverted?.()
          }, 3000)
        } else if (result.status === 'failed') {
          setStatus('failed')
          setError('Conversion transaction failed on-chain.')
        }
      })
    } catch (err) {
      setStatus('failed')
      setError(err instanceof Error ? err.message : 'Conversion failed')
    }
  }

  return (
    <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-yellow-300 font-medium text-sm mb-1">
            Insufficient Private Balance
          </h4>
          <p className="text-xs text-slate-400">
            You need at least{' '}
            <strong className="text-white">{requiredDisplay} ALEO</strong> in
            a single private credit record to complete this transaction.
          </p>
        </div>
      </div>

      {/* Auto-Convert Button */}
      {status === 'idle' || status === 'failed' ? (
        <div className="space-y-2">
          <button
            onClick={handleConvert}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Convert {(convertAmount / 1_000_000).toFixed(2)} ALEO to Private
          </button>
          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}
          <p className="text-[11px] text-slate-500 text-center">
            Converts public credits to a private record via credits.aleo/transfer_public_to_private
          </p>
        </div>
      ) : status === 'converting' ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 animate-pulse">
          <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
          <span className="text-sm text-violet-300">Approve conversion in wallet...</span>
        </div>
      ) : status === 'waiting' ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 animate-pulse">
          <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
          <div>
            <p className="text-sm text-violet-300">Converting public → private...</p>
            <p className="text-[11px] text-slate-500 mt-0.5">This takes ~30-60 seconds. Will auto-continue.</p>
          </div>
        </div>
      ) : status === 'done' ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <Check className="w-4 h-4 text-green-400" />
          <div>
            <p className="text-sm text-green-300">Conversion confirmed!</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Syncing records... will retry automatically.</p>
          </div>
        </div>
      ) : null}

      {/* Faucet link (always visible) */}
      <a
        href="https://faucet.aleo.org"
        target="_blank"
        rel="noopener noreferrer"
        className="block p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-white font-medium">
            Get Testnet Credits
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <p className="text-xs text-slate-400">
          No public balance? Request free ALEO from the testnet faucet.
        </p>
      </a>

      <div className="p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/10">
        <p className="text-xs text-slate-400">
          <strong className="text-violet-300">Why private credits?</strong>{' '}
          VeilSub uses transfer_private to keep your subscription anonymous.
          Public transfers would expose your identity on-chain.
        </p>
      </div>
    </div>
  )
}
