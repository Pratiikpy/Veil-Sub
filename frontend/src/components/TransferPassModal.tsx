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

  const isValidAddress = recipientAddress.startsWith('aleo1') && recipientAddress.length === 63

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
          className="relative w-full max-w-md rounded-sm bg-surface-1 border border-border p-6 shadow-2xl"
        >
          {/* Close */}
          <button
            onClick={handleClose}
            aria-label="Close transfer modal"
            className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/[0.08] border border-violet-500/[0.12] flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-violet-400" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Transfer Subscription</h3>
              <p className="text-xs text-white/60">Send your AccessPass to another address</p>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="rounded-xl bg-surface-2 border border-border p-4 mb-6">
            <div className="flex gap-2">
              <Shield className="w-4 h-4 text-violet-400/60 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-violet-300/80 font-medium mb-1">Privacy Preserved</p>
                <p className="text-xs text-white/60 leading-relaxed">
                  Your current pass is consumed and a new one is minted for the recipient.
                  The transfer is on-chain but the recipient&apos;s subscription details remain private.
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
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1" role="alert">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                Enter a valid Aleo address
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="rounded-xl bg-red-500/10 border border-red-500/15 p-3 mb-6">
            <p className="text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              This action is irreversible. Your access will be revoked after transfer.
            </p>
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

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleTransfer}
              disabled={!isValidAddress || txStatus === 'signing' || txStatus === 'broadcasting'}
              className="flex-1"
            >
              {txStatus === 'signing' ? 'Signing...' : txStatus === 'broadcasting' ? 'Broadcasting...' : 'Transfer Pass'}
            </Button>
          </div>
        </m.div>
      </m.div>
      )}
    </AnimatePresence>
  )
}
