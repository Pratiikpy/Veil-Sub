'use client'

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, ArrowLeftRight, Shield, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'

interface Props {
  isOpen: boolean
  onClose: () => void
  accessPassPlaintext: string
  creatorAddress: string
}

export default function TransferPassModal({
  isOpen,
  onClose,
  accessPassPlaintext,
  creatorAddress,
}: Props) {
  const { connected, transferPass: executeTransfer } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const {
    txStatus, setTxStatus, txId, setTxId,
    error, setError, submittingRef, handleClose,
  } = useTransactionFlow({ isOpen, onClose, connected, stopPolling })
  const focusTrapRef = useFocusTrap(isOpen, handleClose)

  const [recipientAddress, setRecipientAddress] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const isValidAddress = recipientAddress.startsWith('aleo1') && recipientAddress.length === 63
  const canTransfer = isValidAddress && confirmed && txStatus !== 'signing' && txStatus !== 'broadcasting'

  const handleTransfer = async () => {
    if (!connected || submittingRef.current || !isValidAddress) return
    submittingRef.current = true
    setTxStatus('signing')
    setError(null)

    try {
      const result = await executeTransfer(accessPassPlaintext, recipientAddress)

      if (result) {
        setTxId(result)
        setTxStatus('broadcasting')
        toast.success('Subscription transfer submitted!')
        startPolling(result, (pollResult) => {
          if (pollResult.status === 'confirmed') {
            setTxStatus('confirmed')
            toast.success('Pass transferred successfully!')
            stopPolling()
          } else if (pollResult.status === 'failed') {
            setTxStatus('failed')
            stopPolling()
          }
        })
      }
    } catch (err: unknown) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Transfer failed')
      toast.error('Transfer failed')
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
        className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <m.div
          ref={focusTrapRef}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          role="dialog"
          aria-modal="true"
          aria-label="Transfer subscription pass"
          className="relative w-full max-w-md rounded-xl bg-surface-1 border border-border p-8 shadow-2xl"
        >
          {/* Close */}
          <button
            onClick={handleClose}
            aria-label="Close transfer modal"
            className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/[0.08] border border-violet-500/[0.12] flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-violet-400" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Transfer Subscription</h3>
              <p className="text-xs text-white/60">Transfer your AccessPass to another wallet</p>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="rounded-xl bg-surface-2 border border-border p-4 mb-6">
            <div className="flex gap-2">
              <Shield className="w-4 h-4 text-violet-400/60 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-violet-300/80 font-medium mb-1">BSP Transfer Privacy</p>
                <p className="text-xs text-white/60 leading-relaxed">
                  Your subscription pass is transferred securely. The recipient receives a new pass with
                  cryptographic privacy protecting both identities.
                </p>
              </div>
            </div>
          </div>

          {/* Recipient input */}
          <div className="mb-6">
            <label htmlFor="transfer-recipient" className="block text-xs text-white/70 font-medium uppercase tracking-wider mb-2">
              Recipient Address
            </label>
            <input
              id="transfer-recipient"
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="aleo1..."
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-base font-mono"
            />
            {recipientAddress && !isValidAddress && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1" role="alert" aria-live="polite">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                Enter a valid Aleo address
              </p>
            )}
          </div>

          {/* Warning + Confirmation */}
          <div className="rounded-xl bg-red-500/10 border border-red-500/15 p-4 mb-6">
            <p className="text-xs text-red-300 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Irreversible on-chain operation. Your AccessPass record will be consumed; the recipient receives a new one.
            </p>
            <label className="flex items-start gap-4 cursor-pointer group">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-red-500/30 bg-red-500/10 text-red-400 focus:ring-red-500/30 focus:ring-offset-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-red-400/50"
              />
              <span className="text-xs text-red-200/80 leading-relaxed group-hover:text-red-200 transition-colors">
                I understand this transfer is irreversible and my AccessPass will be permanently moved to the recipient
              </span>
            </label>
          </div>

          {/* Status */}
          {txStatus !== 'idle' && (
            <div className="mb-4">
              <TransactionStatus status={txStatus} txId={txId} errorMessage={error} />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 mb-4" role="alert">{error}</p>
          )}

          {/* Success State */}
          {txStatus === 'confirmed' && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 mb-4" role="status" aria-live="polite">
              <p className="text-sm text-emerald-300 font-medium mb-2">Transfer Complete</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Your AccessPass has been transferred to <span className="font-mono text-violet-300">{recipientAddress.slice(0, 12)}...{recipientAddress.slice(-6)}</span>.
                The recipient now owns this subscription.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            {txStatus === 'confirmed' ? (
              <Button variant="accent" onClick={handleClose} className="w-full">
                Done
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  onClick={handleTransfer}
                  disabled={!canTransfer}
                  title={
                    !isValidAddress ? 'Enter a valid Aleo address starting with aleo1' :
                    !confirmed ? 'Confirm that you understand this is irreversible' :
                    txStatus === 'signing' ? 'Waiting for wallet signature...' :
                    txStatus === 'broadcasting' ? 'Broadcasting transaction...' :
                    'Transfer your subscription to this address'
                  }
                  className="flex-1"
                >
                  {txStatus === 'signing' ? 'Signing...' : txStatus === 'broadcasting' ? 'Broadcasting...' : 'Transfer Pass'}
                </Button>
              </>
            )}
          </div>
        </m.div>
      </m.div>
      )}
    </AnimatePresence>
  )
}
