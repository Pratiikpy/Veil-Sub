'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flag, Shield, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'
import type { TxStatus } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  contentId: string
  contentTitle: string
  accessPassPlaintext: string
}

const DISPUTE_REASONS = [
  { id: 'misleading', label: 'Misleading content description' },
  { id: 'incomplete', label: 'Content is incomplete or broken' },
  { id: 'wrong_tier', label: 'Does not match tier expectations' },
  { id: 'duplicate', label: 'Duplicate of free content' },
  { id: 'other', label: 'Other issue' },
]

export default function DisputeContentModal({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  accessPassPlaintext,
}: Props) {
  const { disputeContent, connected } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const handleDispute = async () => {
    if (!connected || submittingRef.current || !selectedReason) return
    submittingRef.current = true
    setTxStatus('signing')
    setError(null)

    try {
      const result = await disputeContent(contentId)
      if (result) {
        setTxId(result)
        setTxStatus('broadcasting')
        toast.success('Dispute submitted on-chain')
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
      setError(err?.message || 'Dispute failed')
      toast.error('Dispute failed')
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
          className="relative w-full max-w-md rounded-3xl bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/[0.08] p-8 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-[#525252] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-red-500/[0.08] border border-red-500/[0.12] flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Dispute Content</h3>
              <p className="text-xs text-[#71717a] truncate max-w-[280px]">{contentTitle}</p>
            </div>
          </div>

          {/* Sybil protection notice */}
          <div className="rounded-2xl bg-violet-500/[0.04] border border-violet-500/[0.1] p-4 mb-6">
            <div className="flex gap-2">
              <Shield className="w-4 h-4 text-violet-400/60 mt-0.5 shrink-0" />
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Disputes are Sybil-protected: only verified subscribers can dispute,
                limited to 1 dispute per content per address. Your AccessPass proves eligibility
                without revealing your identity.
              </p>
            </div>
          </div>

          {/* Reason selection */}
          <div className="mb-6">
            <label className="block text-xs text-[#a1a1aa] font-medium uppercase tracking-wider mb-3">
              Reason for Dispute
            </label>
            <div className="space-y-2">
              {DISPUTE_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 ${
                    selectedReason === reason.id
                      ? 'bg-violet-500/[0.08] border-violet-500/[0.2] text-white'
                      : 'bg-black/20 border-white/[0.06] text-[#71717a] hover:border-white/[0.12] hover:text-[#a1a1aa]'
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>
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
              onClick={handleDispute}
              disabled={!selectedReason || txStatus === 'signing' || txStatus === 'broadcasting'}
              className="flex-1 bg-red-500/80 text-white hover:bg-red-500/90 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            >
              {txStatus === 'signing' ? 'Signing...' : txStatus === 'broadcasting' ? 'Submitting...' : 'Submit Dispute'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
