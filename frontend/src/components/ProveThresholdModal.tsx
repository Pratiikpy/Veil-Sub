'use client'

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Award, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { getErrorMessage } from '@/lib/errorMessages'
import { FEES } from '@/lib/config'
import { formatCredits } from '@/lib/utils'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentSubscriberCount?: number
}

export default function ProveThresholdModal({ isOpen, onClose, currentSubscriberCount }: Props) {
  const { proveSubscriberThreshold, connected } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const {
    txStatus, setTxStatus, txId, setTxId,
    error, setError, statusMessage,
    submittingRef, handleClose, resetFlow,
  } = useTransactionFlow({ isOpen, onClose, connected, stopPolling })
  const focusTrapRef = useFocusTrap(isOpen, handleClose)

  const [threshold, setThreshold] = useState('')
  const [provenThreshold, setProvenThreshold] = useState<number | null>(null)

  const handleProve = async () => {
    if (submittingRef.current) return
    if (!connected) {
      setError('Connect wallet to generate a reputation proof.')
      return
    }
    const thresholdNum = parseInt(threshold, 10)
    if (!Number.isFinite(thresholdNum) || thresholdNum <= 0) {
      setError('Threshold must be a positive number.')
      return
    }

    submittingRef.current = true
    setError(null)
    setTxStatus('signing')
    toast.loading('Generating reputation proof...', { id: 'prove-threshold', duration: 60000 })

    try {
      setTxStatus('proving')
      toast.dismiss('prove-threshold')
      const id = await proveSubscriberThreshold(thresholdNum)

      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')
        setProvenThreshold(thresholdNum)
        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            if (result.resolvedTxId) setTxId(result.resolvedTxId)
            setTxStatus('confirmed')
            toast.success('Reputation proof verified on-chain!')
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            setError('Proof couldn\u2019t be verified. Your subscriber count may be below the threshold.')
            toast.error('Proof couldn\u2019t be verified')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Wallet didn\u2019t approve the transaction. Try again when ready.')
      }
    } catch (err) {
      toast.dismiss('prove-threshold')
      setTxStatus('failed')
      setError(getErrorMessage(err instanceof Error ? err.message : 'Proof generation failed'))
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={handleClose}
        >
          <m.div
            ref={focusTrapRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Prove subscriber threshold"
            className="w-full max-w-md rounded-xl bg-surface-1 border border-border shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-violet-400" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-white">Prove Subscriber Threshold</h3>
              </div>
              <button
                onClick={handleClose}
                disabled={txStatus !== 'idle' && txStatus !== 'confirmed' && txStatus !== 'failed'}
                aria-label="Close reputation proof dialog"
                title={txStatus !== 'idle' && txStatus !== 'confirmed' && txStatus !== 'failed' ? 'Transaction in progress - please wait' : 'Close dialog'}
                className="p-1 rounded-lg hover:bg-white/[0.05] text-white/70 hover:text-white active:scale-[0.9] transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {txStatus === 'idle' ? (
              <>
                {/* Explanation */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                  <div className="flex gap-2">
                    <Shield className="w-4 h-4 text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="text-[11px] text-green-400/80 space-y-1">
                      <p className="font-medium text-green-400">Zero-Knowledge Reputation Proof</p>
                      <p>
                        Generates a cryptographic proof that you have at least the specified
                        number of subscribers. No on-chain changes—just verification.
                      </p>
                      <p>
                        Third parties see only that the proof succeeded—your actual
                        subscriber count stays private.
                      </p>
                    </div>
                  </div>
                </div>

                {currentSubscriberCount !== undefined && currentSubscriberCount > 0 && (
                  <div className="p-4 rounded-xl bg-violet-500/[0.06] border border-violet-500/15 mb-4">
                    <p className="text-[11px] text-violet-300">
                      Your current subscriber count is visible to you: <span className="font-bold">{currentSubscriberCount}</span>.
                      Choose a threshold at or below this number for the proof to succeed.
                    </p>
                  </div>
                )}

                {/* Threshold Input */}
                <div className="mb-4">
                  <label htmlFor="threshold-input" className="block text-xs text-white/60 font-medium uppercase tracking-wider mb-2">
                    Minimum Subscriber Threshold <span className="text-red-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="threshold-input"
                    type="number"
                    inputMode="numeric"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="e.g. 10"
                    min="1"
                    max="100000"
                    step="1"
                    required
                    aria-required="true"
                    className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-base"
                  />
                  <p className="text-[10px] text-white/60 mt-1">
                    The proof will confirm you have at least this many subscribers.
                  </p>
                </div>

                {/* Fee Info */}
                <div className="p-2.5 rounded-xl bg-surface-2 border border-border mb-4">
                  <p className="text-[11px] text-white/60">
                    Est. network fee: ~{formatCredits(FEES.PROVE_THRESHOLD)} ALEO. Read-only operation—no on-chain state changes.
                  </p>
                </div>

                {error && (
                  <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/15 mb-4">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                <Button variant="accent" onClick={handleProve} disabled={txStatus !== 'idle'} className="w-full focus-visible:ring-2 focus-visible:ring-violet-400/50">
                  Generate Proof
                </Button>
              </>
            ) : (
              <div className="py-2">
                {statusMessage && (
                  <div className="mb-4 p-4 rounded-xl bg-surface-2 border border-border">
                    <p className="text-xs text-white/70 animate-pulse">{statusMessage}</p>
                  </div>
                )}
                <TransactionStatus status={txStatus} txId={txId} errorMessage={error} />
                {txStatus === 'confirmed' && (
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center"
                  >
                    <p className="text-green-400 font-medium mb-1">Reputation Proof Confirmed</p>
                    <p className="text-xs text-white/60">
                      On-chain proof confirmed: you have at least <span className="text-white font-bold">{provenThreshold}</span> subscribers.
                      The exact count remains private.
                    </p>
                    <button
                      onClick={handleClose}
                      aria-label="Close proof confirmation dialog"
                      className="mt-4 px-8 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-violet-400/50"
                    >
                      Proof Confirmed
                    </button>
                  </m.div>
                )}
                {txStatus === 'failed' && (
                  <div className="mt-4 text-center">
                    {error && <p role="alert" className="text-xs text-red-400 mb-4">{error}</p>}
                    <button
                      onClick={() => resetFlow()}
                      className="px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                    >
                      Retry Proof
                    </button>
                  </div>
                )}
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
