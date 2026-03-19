'use client'

import { useState, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Flag, Shield, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'

interface Props {
  isOpen: boolean
  onClose: () => void
  contentId: string
  contentTitle: string
  accessPassPlaintext: string
}

/**
 * A contentId of 'general' means the modal was opened from the creator page level
 * rather than from a specific post. On-chain dispute requires a real content ID
 * that exists in the content_meta mapping, so we must block submission.
 */
function isValidContentId(contentId: string): boolean {
  return !!contentId && contentId !== 'general'
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
  const {
    txStatus, setTxStatus, txId, setTxId,
    error, setError, submittingRef, handleClose,
  } = useTransactionFlow({ isOpen, onClose, connected, stopPolling })
  const focusTrapRef = useFocusTrap(isOpen, handleClose)
  const validContent = isValidContentId(contentId)

  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const reasonGroupRef = useRef<HTMLDivElement>(null)
  useRovingTabIndex(reasonGroupRef)

  const handleDispute = async () => {
    if (!validContent) {
      setError('Cannot dispute without a specific content ID. Please select a specific post to dispute.')
      return
    }
    if (!selectedReason) {
      setError('Please select a reason for the dispute.')
      return
    }
    if (!connected || submittingRef.current) return
    submittingRef.current = true
    setTxStatus('signing')
    setError(null)

    try {
      const result = await disputeContent(accessPassPlaintext, contentId)
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
    } catch (err: unknown) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Dispute couldn\u2019t be submitted. Make sure your AccessPass is still active.')
      toast.error('Dispute couldn\u2019t be submitted')
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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
        <m.div
          ref={focusTrapRef}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          role="dialog"
          aria-modal="true"
          aria-label="Dispute content"
          className="relative w-full max-w-md rounded-xl bg-surface-1 border border-border p-6 shadow-2xl"
        >
          <button
            onClick={handleClose}
            disabled={txStatus === 'signing' || txStatus === 'broadcasting'}
            aria-label="Close dispute modal"
            title={txStatus === 'signing' || txStatus === 'broadcasting' ? 'Transaction in progress - please wait' : 'Close dialog'}
            className="absolute top-5 right-5 text-white/60 hover:text-white active:scale-[0.9] transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none rounded-lg p-1"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-red-500/[0.08] border border-red-500/[0.12] flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-400" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Dispute Content</h3>
              <p className="text-xs text-white/60 truncate max-w-[280px]">{contentTitle}</p>
            </div>
          </div>

          {/* Sybil protection notice */}
          <div className="rounded-xl bg-surface-2 border border-border p-4 mb-6">
            <div className="flex gap-2">
              <Shield className="w-4 h-4 text-violet-400/60 mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-xs text-white/60 leading-relaxed">
                Sybil-protected via AccessPass ownership. The dispute_content transition verifies
                your subscription on-chain (1 dispute per content per subscriber_hash). Your wallet
                address is never published.
              </p>
            </div>
          </div>

          {/* Invalid content ID warning */}
          {!validContent && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 mb-6">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm text-amber-300 font-medium mb-1">Select a Specific Post</p>
                  <p className="text-xs text-white/60 leading-relaxed">
                    On-chain disputes must target a specific piece of content. Go to this creator&apos;s
                    content feed and use the dispute button on the individual post you want to flag.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reason selection */}
          <div className="mb-6">
            <label id="dispute-reason-label" className="block text-xs text-white/70 font-medium uppercase tracking-wider mb-4">
              Reason for Dispute
            </label>
            <div ref={reasonGroupRef} className="space-y-2" role="radiogroup" aria-labelledby="dispute-reason-label">
              {DISPUTE_REASONS.map((reason, index) => (
                <button
                  key={reason.id}
                  role="radio"
                  aria-checked={selectedReason === reason.id}
                  tabIndex={selectedReason === reason.id || (selectedReason === null && index === 0) ? 0 : -1}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none ${
                    selectedReason === reason.id
                      ? 'bg-violet-500/[0.08] border-violet-500/[0.2] text-white'
                      : 'bg-white/[0.05] border-border text-white/60 hover:border-violet-500/20 hover:text-white/70'
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
              <TransactionStatus status={txStatus} txId={txId} errorMessage={error} />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 mb-4" role="alert">{error}</p>
          )}

          {/* Success State */}
          {txStatus === 'confirmed' && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 mb-4">
              <p className="text-sm text-emerald-300 font-medium mb-2">Dispute Submitted</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Your dispute has been recorded on-chain. The creator and platform will review your concern.
                Your subscriber identity remains private via hash commitment.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            {txStatus === 'confirmed' ? (
              <Button variant="accent" onClick={handleClose} className="w-full">
                Dispute Submitted
              </Button>
            ) : txStatus === 'failed' ? (
              <>
                <Button variant="secondary" onClick={handleClose} className="flex-1">
                  Close
                </Button>
                <Button
                  onClick={handleDispute}
                  className="flex-1 bg-red-500/80 text-white hover:bg-red-500/90 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={handleClose} className="flex-1">
                  Cancel Dispute
                </Button>
                <Button
                  onClick={handleDispute}
                  disabled={!validContent || !selectedReason || txStatus === 'signing' || txStatus === 'broadcasting'}
                  title={
                    !validContent ? 'Select a specific post to dispute from the content feed' :
                    !selectedReason ? 'Select a reason for the dispute' :
                    txStatus === 'signing' ? 'Waiting for wallet signature...' :
                    txStatus === 'broadcasting' ? 'Submitting dispute...' :
                    'Submit dispute for this content'
                  }
                  className="flex-1 bg-red-500/80 text-white hover:bg-red-500/90 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  {!validContent ? 'Select a Post First' : txStatus === 'signing' ? 'Signing...' : txStatus === 'broadcasting' ? 'Submitting...' : 'Submit Dispute'}
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
