'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, X, Clock, AlertCircle, Shield, CheckCircle } from 'lucide-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { ESCROW_WINDOW_BLOCKS, MICROCREDITS_PER_CREDIT } from '@/lib/config'

interface RefundRequestModalProps {
  isOpen: boolean
  onClose: () => void
  escrowRecord: string // RefundEscrow plaintext
  accessPassRecord: string // AccessPass plaintext
  amount: number // microcredits
  escrowExpiry: number // block height
  currentBlockHeight: number
}

export default function RefundRequestModal({
  isOpen, onClose, escrowRecord, accessPassRecord, amount, escrowExpiry, currentBlockHeight,
}: RefundRequestModalProps) {
  const { claimRefund, connected } = useVeilSub()
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [txId, setTxId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const blocksRemaining = Math.max(0, escrowExpiry - currentBlockHeight)
  const isExpired = blocksRemaining === 0
  const timeRemainingMins = Math.ceil((blocksRemaining * 3) / 60)
  const amountAleo = (amount / MICROCREDITS_PER_CREDIT).toFixed(2)

  const handleRefund = useCallback(async () => {
    if (!connected || isExpired) return
    setStatus('submitting')
    setError('')
    try {
      const result = await claimRefund(escrowRecord, accessPassRecord)
      setTxId(result)
      setStatus('success')
    } catch (err: any) {
      setError(err?.message || 'Refund claim failed')
      setStatus('error')
    }
  }, [connected, isExpired, escrowRecord, accessPassRecord, claimRefund])

  const handleClose = () => {
    setStatus('idle')
    setError('')
    setTxId(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Request refund"
            className="relative w-full max-w-md rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] shadow-2xl p-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-500/20 p-2">
                  <RotateCcw className="h-5 w-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Claim Refund</h3>
              </div>
              <button onClick={handleClose} className="rounded-lg p-1 text-[#a1a1aa] hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {status === 'success' ? (
              <div className="space-y-4">
                <div className="rounded-[8px] bg-[#18181b] border border-white/[0.08] p-4 text-center">
                  <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-400" />
                  <p className="text-sm font-medium text-green-400">Refund claimed!</p>
                  <p className="mt-1 text-xs text-[#a1a1aa]">{amountAleo} ALEO returned to your wallet</p>
                  {txId && <p className="mt-1 text-xs text-[#71717a] break-all">Tx: {txId.slice(0, 20)}...</p>}
                </div>
                <button onClick={handleClose} className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] py-2.5 text-sm font-medium text-[#fafafa] hover:bg-white/[0.08]">
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Countdown */}
                <div className={`rounded-xl border p-4 ${isExpired ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className={`h-4 w-4 ${isExpired ? 'text-red-400' : 'text-amber-400'}`} />
                    <span className={`text-xs font-medium ${isExpired ? 'text-red-400' : 'text-amber-400'}`}>
                      {isExpired ? 'Refund Window Expired' : `${timeRemainingMins} min remaining (~${blocksRemaining} blocks)`}
                    </span>
                  </div>
                  {!isExpired && (
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                        style={{ width: `${Math.min(100, (blocksRemaining / ESCROW_WINDOW_BLOCKS) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Refund amount */}
                <div className="rounded-[8px] bg-[#18181b] border border-white/[0.08] p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#a1a1aa]">Refund Amount</span>
                    <span className="text-white font-semibold">{amountAleo} ALEO</span>
                  </div>
                </div>

                {/* Privacy note */}
                <div className="rounded-[8px] bg-[#18181b] border border-white/[0.08] p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                    <p className="text-xs text-green-400/80">
                      Refund is fully private — credits returned via transfer_private. AccessPass is consumed.
                    </p>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-[8px] bg-red-500/10 border border-red-500/15 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleRefund}
                  disabled={status === 'submitting' || isExpired || !connected}
                  className="w-full rounded-lg bg-white py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {status === 'submitting' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Claiming refund...
                    </span>
                  ) : isExpired ? (
                    'Refund Window Expired'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Claim {amountAleo} ALEO Refund
                    </span>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
