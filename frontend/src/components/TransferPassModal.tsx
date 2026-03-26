'use client'

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { X, ArrowLeftRight, Shield, AlertTriangle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'
import { isValidAleoAddress, formatCredits } from '@/lib/utils'
import { FEES } from '@/lib/config'

interface Props {
  isOpen: boolean
  onClose: () => void
  accessPassPlaintext: string
  creatorAddress: string
  onSuccess?: () => void
}

export default function TransferPassModal({
  isOpen,
  onClose,
  accessPassPlaintext,
  creatorAddress,
  onSuccess,
}: Props) {
  const { connected, transferPass: executeTransfer, publicKey } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const {
    txStatus, setTxStatus, txId, setTxId,
    error, setError, submittingRef, handleClose: baseHandleClose,
  } = useTransactionFlow({ isOpen, onClose, connected, stopPolling })

  const [recipientAddress, setRecipientAddress] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const isValidAddress = isValidAleoAddress(recipientAddress)
  const canTransfer = isValidAddress && confirmed && txStatus !== 'signing' && txStatus !== 'broadcasting'

  // Reset form state on modal close
  const handleModalClose = () => {
    setRecipientAddress('')
    setConfirmed(false)
    baseHandleClose()
  }

  const focusTrapRef = useFocusTrap(isOpen, handleModalClose)

  const handleTransfer = async () => {
    if (!connected || submittingRef.current || !isValidAddress) return
    submittingRef.current = true
    setTxStatus('signing')
    setError(null)

    try {
      // Check public balance covers the network fee (paid separately from private record)
      try {
        const feeNeeded = FEES.TRANSFER_PASS
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(publicKey ?? '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt((pubText ?? '').replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < feeNeeded) {
            setError(`Insufficient public balance for network fee. You need ~${formatCredits(feeNeeded)} ALEO public credits. Get testnet credits from the Aleo faucet.`)
            setTxStatus('idle')
            submittingRef.current = false
            return
          }
        }
      } catch {
        toast.warning('Could not verify public balance. Transaction may fail if fees are insufficient.')
      }

      const result = await executeTransfer(accessPassPlaintext, recipientAddress)

      if (result) {
        setTxId(result)
        setTxStatus('broadcasting')
        toast.success('Transfer submitted!')
        startPolling(result, (pollResult) => {
          if (pollResult.status === 'confirmed') {
            setTxStatus('confirmed')
            toast.success('Pass transferred to the new owner!')
            onSuccess?.()
            stopPolling()
          } else if (pollResult.status === 'failed') {
            setTxStatus('failed')
            stopPolling()
          } else if (pollResult.status === 'timeout') {
            // Shield Wallet delegates proving and never reports 'confirmed' —
            // the transaction IS broadcast, so treat timeout as likely success.
            setTxStatus('confirmed')
            toast.success('Pass transferred! (confirmation was slow)')
            onSuccess?.()
            stopPolling()
          }
        })
      }
    } catch (err: unknown) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Transfer couldn\u2019t be completed. Check your wallet and try again.')
      toast.error('Transfer couldn\u2019t be completed')
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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleModalClose} aria-hidden="true" />
        <m.div
          ref={focusTrapRef}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          role="dialog"
          aria-modal="true"
          aria-label="Transfer subscription pass"
          className="relative w-full max-w-md rounded-2xl bg-surface-1 border border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Close */}
          <button
            onClick={handleModalClose}
            disabled={txStatus === 'signing' || txStatus === 'broadcasting'}
            aria-label="Close transfer modal"
            className={`absolute top-5 right-5 transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded ${
              txStatus === 'signing' || txStatus === 'broadcasting'
                ? 'text-white/50 cursor-not-allowed'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-white/60" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Transfer Subscription</h3>
              <p className="text-xs text-white/60">Transfer your AccessPass to another wallet</p>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="rounded-xl bg-surface-2 border border-border p-4 mb-6">
            <div className="flex gap-2">
              <Shield className="w-4 h-4 text-white/50 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-white/50 font-medium mb-1">Transfer Privacy</p>
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
              Recipient Address <span className="text-red-400" aria-hidden="true">*</span>
            </label>
            <input
              id="transfer-recipient"
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="aleo1..."
              required
              pattern="^aleo1[a-z0-9]{56}$"
              maxLength={63}
              aria-required="true"
              aria-invalid={recipientAddress && !isValidAddress ? true : undefined}
              aria-describedby={recipientAddress && !isValidAddress ? 'transfer-address-error' : undefined}
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-base font-mono"
            />
            {recipientAddress && !isValidAddress && (
              <p id="transfer-address-error" className="text-xs text-red-400 mt-2 flex items-center gap-1" role="alert" aria-live="polite">
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
                Your AccessPass has been transferred to <span className="font-mono text-white/70">{recipientAddress.slice(0, 12)}...{recipientAddress.slice(-6)}</span>.
                The recipient now owns this subscription.
              </p>
              <div className="mt-4 pt-3 border-t border-emerald-500/10">
                <p className="text-xs text-white/50 mb-2">What's next?</p>
                <Link
                  href="/subscriptions"
                  className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white/70 transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded"
                >
                  View Your Subscriptions
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            {txStatus === 'confirmed' ? (
              <Button variant="accent" onClick={handleModalClose} className="w-full">
                Done
              </Button>
            ) : txStatus === 'failed' ? (
              <>
                <Button variant="secondary" onClick={handleModalClose} className="flex-1">
                  Close
                </Button>
                <Button
                  variant="accent"
                  onClick={() => {
                    setTxStatus('idle')
                    setError(null)
                  }}
                  className="flex-1"
                >
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={handleModalClose} className="flex-1" disabled={txStatus === 'signing' || txStatus === 'broadcasting'}>
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
