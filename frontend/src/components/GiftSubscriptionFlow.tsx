'use client'

import { useState, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Gift, X, Send, Sparkles, AlertCircle, Shield, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { MICROCREDITS_PER_CREDIT, SUBSCRIPTION_DURATION_BLOCKS } from '@/lib/config'
import { formatUsd, generatePassId } from '@/lib/utils'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'
import { getErrorMessage } from '@/lib/errorMessages'
import { isValidAleoAddress } from '@/lib/utils'

interface GiftSubscriptionFlowProps {
  isOpen: boolean
  onClose: () => void
  creatorAddress: string
  tierPrice: number // microcredits
  tierId: number
  tierName: string
  onSuccess?: () => void
}

export default function GiftSubscriptionFlow({
  isOpen, onClose, creatorAddress, tierPrice, tierId, tierName, onSuccess,
}: GiftSubscriptionFlowProps) {
  const { giftSubscription, getCreditsRecords, connected } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const { blockHeight, error: blockHeightError } = useBlockHeight()
  const {
    txStatus, setTxStatus, txId, setTxId,
    error, setError, handleClose: baseHandleClose, submittingRef,
  } = useTransactionFlow({ isOpen, onClose, connected, stopPolling })
  const focusTrapRef = useFocusTrap(isOpen, baseHandleClose)

  const [recipientAddress, setRecipientAddress] = useState('')

  const priceAleo = (tierPrice / MICROCREDITS_PER_CREDIT).toFixed(2)

  // Map the hook's TxStatus to the simpler local status for this component
  const status = txStatus === 'idle' ? 'idle' as const
    : txStatus === 'confirmed' ? 'success' as const
    : txStatus === 'failed' ? 'error' as const
    : 'submitting' as const

  const handleGift = useCallback(async () => {
    if (submittingRef.current) return // Prevent double-submission
    if (!connected || !isValidAleoAddress(recipientAddress)) return
    if (blockHeight === null) {
      setError(blockHeightError?.message ?? 'Could not sync with Aleo network. Check your connection and try again.')
      return
    }
    submittingRef.current = true
    setTxStatus('signing')
    setError(null)
    try {
      const records = await getCreditsRecords()
      if (!records || records.length === 0) throw new Error('Insufficient private credits. Use the credits converter to convert public ALEO.')
      const firstRecord = records[0]
      const paymentRecord = typeof firstRecord === 'string'
        ? firstRecord
        : (firstRecord && typeof firstRecord === 'object' && 'plaintext' in firstRecord)
          ? (firstRecord as { plaintext: string }).plaintext
          : null
      if (!paymentRecord) throw new Error('Invalid record format. Please reconnect wallet.')
      // Generate a collision-resistant gift ID using 128-bit randomness constrained to field size
      const giftId = generatePassId()
      // Calculate expiry based on current block height + subscription duration
      const expiresAt = blockHeight + SUBSCRIPTION_DURATION_BLOCKS
      const result = await giftSubscription(
        paymentRecord,
        creatorAddress,
        recipientAddress,
        tierId,
        tierPrice,
        giftId,
        expiresAt
      )
      if (result) {
        setTxId(result)
        setTxStatus('broadcasting')
        startPolling(result, (pollResult) => {
          if (pollResult.status === 'confirmed') {
            if (pollResult.resolvedTxId) setTxId(pollResult.resolvedTxId)
            setTxStatus('confirmed')
            onSuccess?.()
            toast.success('Gift sent! The recipient can redeem it anytime.')
          } else if (pollResult.status === 'failed') {
            setTxStatus('failed')
            setError('Gift couldn\u2019t be sent. Make sure you have enough public credits (~0.3 ALEO) for network fees and private credits for the tier price.')
            toast.error('Gift couldn\u2019t be sent')
          } else if (pollResult.status === 'timeout') {
            setTxStatus('failed')
            setError('Transaction is still processing. Check your wallet or refresh the page to see if it completed.')
            toast.warning('Transaction taking longer than expected')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Wallet didn\u2019t approve the transaction. Try again when ready.')
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Gift failed'
      setError(getErrorMessage(rawMsg))
      setTxStatus('failed')
    } finally {
      submittingRef.current = false
    }
  }, [connected, recipientAddress, creatorAddress, tierId, tierPrice, blockHeight, blockHeightError, giftSubscription, getCreditsRecords, setTxStatus, setError, setTxId, startPolling, submittingRef])

  const handleClose = () => {
    setRecipientAddress('')
    baseHandleClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
          <m.div
            ref={focusTrapRef}
            className="relative w-full max-w-md rounded-xl bg-surface-1 border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Gift a subscription"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-pink-500/20 p-2">
                  <Gift className="h-5 w-5 text-pink-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-white">Gift Subscription</h3>
              </div>
              <button
                onClick={handleClose}
                disabled={status === 'submitting'}
                aria-label="Close gift modal"
                className={`rounded-lg p-1 transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none ${
                  status === 'submitting'
                    ? 'text-white/30 cursor-not-allowed'
                    : 'text-white/70 hover:bg-white/[0.1] hover:text-white active:scale-[0.9]'
                }`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {status === 'success' ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-surface-2 border border-border p-4 text-center">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-green-400" aria-hidden="true" />
                  <p className="text-sm font-medium text-green-400">Gift sent!</p>
                  <p className="mt-1 text-xs text-white/60">Recipient will receive a GiftToken to redeem</p>
                  {txId && <p className="mt-1 text-xs text-white/60 break-all">Tx: {txId.slice(0, 20)}...</p>}
                </div>
                <div className="rounded-xl bg-surface-2 border border-border p-4">
                  <p className="text-xs text-white/50 mb-2">What's next?</p>
                  <Link
                    href={`/creator/${creatorAddress}`}
                    className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80 transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded"
                  >
                    View Creator's Content
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
                <button onClick={handleClose} className="w-full rounded-lg bg-white/[0.05] border border-border py-2.5 text-sm font-medium text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none">
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Gift details */}
                <div className="rounded-xl bg-surface-2 border border-border p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Tier</span>
                    <span className="text-white font-medium">{tierName} (#{tierId})</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-white/70">Cost</span>
                    <span className="text-white font-medium">{priceAleo} ALEO <span className="text-white/50 font-normal">({formatUsd(tierPrice)})</span></span>
                  </div>
                </div>

                {/* Recipient address */}
                <div>
                  <label htmlFor="gift-recipient" className="mb-2 block text-xs font-medium text-white/70">Recipient Address <span className="text-red-400" aria-hidden="true">*</span></label>
                  <div className="relative">
                    <input
                      id="gift-recipient"
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      maxLength={63}
                      minLength={63}
                      placeholder="aleo1..."
                      required
                      pattern="^aleo1[a-z0-9]{56}$"
                      className={`w-full rounded-lg bg-white/[0.05] border px-4 py-2.5 text-white placeholder-subtle focus:outline-none focus:ring-1 transition-all text-base font-mono pr-10 ${
                        recipientAddress.length === 0
                          ? 'border-border focus:border-white/30 focus:ring-white/20'
                          : recipientAddress.startsWith('aleo1') && recipientAddress.length === 63
                          ? 'border-green-500/50 focus:border-green-500/50 focus:ring-green-500/30'
                          : 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30'
                      }`}
                      aria-required="true"
                      aria-invalid={recipientAddress.length > 0 && !(recipientAddress.startsWith('aleo1') && recipientAddress.length === 63) ? true : undefined}
                      aria-describedby={recipientAddress.length > 0 && !(recipientAddress.startsWith('aleo1') && recipientAddress.length === 63) ? 'address-validation' : undefined}
                    />
                    {recipientAddress.length > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {recipientAddress.startsWith('aleo1') && recipientAddress.length === 63 ? (
                          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {recipientAddress.length > 0 && !(recipientAddress.startsWith('aleo1') && recipientAddress.length === 63) && (
                    <p id="address-validation" className="mt-1.5 text-xs text-red-400">
                      {!recipientAddress.startsWith('aleo1')
                        ? 'Address must start with "aleo1"'
                        : `Address must be 63 characters (currently ${recipientAddress.length})`}
                    </p>
                  )}
                </div>

                {/* Privacy note */}
                <div className="rounded-xl bg-surface-2 border border-border p-4">
                  <div className="flex items-start gap-2">
                    <Shield className="mt-1 h-4 w-4 flex-shrink-0 text-green-400" aria-hidden="true" />
                    <p className="text-xs text-green-400/80">
                      Gift is private—only the recipient can see and redeem the GiftToken. Your identity is hashed.
                    </p>
                  </div>
                </div>

                {/* Transaction progress */}
                {status === 'submitting' && (
                  <TransactionStatus status={txStatus} txId={txId} errorMessage={error} />
                )}

                {/* Error state with retry */}
                {status === 'error' && error && (
                  <>
                    <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/15 p-4" role="alert">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" aria-hidden="true" />
                      <p className="text-xs text-red-400">{error}</p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={handleClose}
                        className="flex-1 rounded-lg bg-white/[0.05] border border-border py-2.5 text-sm font-medium text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                      >
                        Cancel
                      </button>
                      <Button
                        onClick={() => {
                          setTxStatus('idle')
                          setError(null)
                        }}
                        className="flex-1"
                      >
                        Try Again
                      </Button>
                    </div>
                  </>
                )}

                {/* Submit - show only when idle (not submitting, not error, not success) */}
                {status === 'idle' && (
                  <Button
                    variant="accent"
                    onClick={handleGift}
                    disabled={!recipientAddress.startsWith('aleo1') || recipientAddress.length !== 63 || !connected}
                    title={
                      !connected ? 'Connect wallet first'
                        : !recipientAddress ? 'Enter recipient address'
                        : !recipientAddress.startsWith('aleo1') ? 'Address must start with aleo1'
                        : recipientAddress.length !== 63 ? 'Address must be 63 characters'
                        : undefined
                    }
                    className="w-full"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Send Private Gift
                  </Button>
                )}
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
