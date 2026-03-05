'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeftRight, Shield, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'
import type { TxStatus } from '@/types'

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
  const [recipientAddress, setRecipientAddress] = useState('')
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const isValidAddress = recipientAddress.startsWith('aleo1') && recipientAddress.length > 50

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
            stopPolling()
          } else if (pollResult.status === 'failed') {
            setTxStatus('failed')
            stopPolling()
          }
        })
      }
    } catch (err: any) {
      setTxStatus('failed')
      setError(err?.message || 'Transfer failed')
      toast.error('Transfer failed')
    } finally {
      submittingRef.current = false
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          role="dialog"
          aria-modal="true"
          aria-label="Transfer subscription pass"
          className="relative w-full max-w-md rounded-3xl bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/[0.08] p-8 shadow-2xl"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-[#525252] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/[0.08] border border-violet-500/[0.12] flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Transfer Subscription</h3>
              <p className="text-xs text-[#71717a]">Send your AccessPass to another address</p>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="rounded-2xl bg-violet-500/[0.04] border border-violet-500/[0.1] p-4 mb-6">
            <div className="flex gap-2">
              <Shield className="w-4 h-4 text-violet-400/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-violet-300/80 font-medium mb-1">Privacy Preserved</p>
                <p className="text-xs text-[#71717a] leading-relaxed">
                  Your current pass is consumed and a new one is minted for the recipient.
                  The transfer is on-chain but the recipient&apos;s subscription details remain private.
                </p>
              </div>
            </div>
          </div>

          {/* Recipient input */}
          <div className="mb-6">
            <label className="block text-xs text-[#a1a1aa] font-medium uppercase tracking-wider mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="aleo1..."
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/[0.08] text-white text-sm font-mono placeholder-[#525252] focus:outline-none focus:border-violet-500/[0.3] focus:shadow-[0_0_20px_rgba(139,92,246,0.08)] transition-all duration-300"
            />
            {recipientAddress && !isValidAddress && (
              <p className="text-xs text-red-400/60 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Enter a valid Aleo address
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="rounded-xl bg-red-500/[0.04] border border-red-500/[0.1] p-3 mb-6">
            <p className="text-xs text-red-300/60 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              This action is irreversible. Your access will be revoked after transfer.
            </p>
          </div>

          {/* Status */}
          {txStatus !== 'idle' && (
            <div className="mb-4">
              <TransactionStatus status={txStatus} txId={txId} />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 mb-4">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
