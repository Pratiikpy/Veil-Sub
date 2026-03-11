'use client'

import { useState, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Gift, X, Send, Sparkles, AlertCircle, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { MICROCREDITS_PER_CREDIT } from '@/lib/config'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'
import { getErrorMessage } from '@/lib/errorMessages'

interface GiftSubscriptionFlowProps {
  isOpen: boolean
  onClose: () => void
  creatorAddress: string
  tierPrice: number // microcredits
  tierId: number
  tierName: string
}

export default function GiftSubscriptionFlow({
  isOpen, onClose, creatorAddress, tierPrice, tierId, tierName,
}: GiftSubscriptionFlowProps) {
  const { giftSubscription, getCreditsRecords, connected } = useVeilSub()
  const {
    txStatus, setTxStatus, txId, setTxId,
    error, setError, handleClose: baseHandleClose,
  } = useTransactionFlow({ isOpen, onClose })
  const focusTrapRef = useFocusTrap(isOpen, baseHandleClose)

  const [recipientAddress, setRecipientAddress] = useState('')

  const priceAleo = (tierPrice / MICROCREDITS_PER_CREDIT).toFixed(2)

  // Map the hook's TxStatus to the simpler local status for this component
  const status = txStatus === 'idle' ? 'idle' as const
    : txStatus === 'confirmed' ? 'success' as const
    : txStatus === 'failed' ? 'error' as const
    : 'submitting' as const

  const handleGift = useCallback(async () => {
    if (!connected || !recipientAddress.startsWith('aleo1') || recipientAddress.length !== 63) return
    setTxStatus('signing')
    setError(null)
    try {
      const records = await getCreditsRecords()
      if (!records || records.length === 0) throw new Error('No private credits available. Convert public credits first.')
      const firstRecord = records[0]
      const paymentRecord = typeof firstRecord === 'string'
        ? firstRecord
        : (firstRecord && typeof firstRecord === 'object' && 'plaintext' in firstRecord)
          ? (firstRecord as { plaintext: string }).plaintext
          : null
      if (!paymentRecord) throw new Error('Invalid record format. Please reconnect wallet.')
      // Generate a collision-resistant gift ID using crypto.randomUUID (RFC 4122 v4, 2^122 unique space)
      const giftId = crypto.randomUUID()
      const expiresAt = 0 // Will be computed in finalize based on block.height + duration
      const result = await giftSubscription(
        paymentRecord,
        creatorAddress,
        recipientAddress,
        tierId,
        tierPrice,
        giftId,
        expiresAt
      )
      setTxId(result)
      setTxStatus('confirmed')
      toast.success('Gift sent successfully!')
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Gift failed'
      setError(getErrorMessage(rawMsg))
      setTxStatus('failed')
    }
  }, [connected, recipientAddress, creatorAddress, tierId, tierPrice, giftSubscription, getCreditsRecords, setTxStatus, setError, setTxId])

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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <m.div
            ref={focusTrapRef}
            className="relative w-full max-w-md rounded-sm bg-surface-1 border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
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
              <button onClick={handleClose} aria-label="Close gift modal" className="rounded-lg p-1 text-white/70 hover:bg-white/[0.1] hover:text-white active:scale-[0.9] transition-all">
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
                <button onClick={handleClose} className="w-full rounded-lg bg-white/[0.05] border border-border py-2.5 text-sm font-medium text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all">
                  Close
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
                    <span className="text-white font-medium">{priceAleo} ALEO</span>
                  </div>
                </div>

                {/* Recipient address */}
                <div>
                  <label htmlFor="gift-recipient" className="mb-2 block text-xs font-medium text-white/70">Recipient Address</label>
                  <div className="relative">
                    <input
                      id="gift-recipient"
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="aleo1..."
                      className={`w-full rounded-lg bg-white/[0.05] border px-4 py-2.5 text-white placeholder-subtle focus:outline-none focus:ring-1 transition-all text-base font-mono pr-10 ${
                        recipientAddress.length === 0
                          ? 'border-border focus:border-violet-500/50 focus:ring-violet-500/30'
                          : recipientAddress.startsWith('aleo1') && recipientAddress.length === 63
                          ? 'border-green-500/50 focus:border-green-500/50 focus:ring-green-500/30'
                          : 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30'
                      }`}
                      aria-describedby="address-validation"
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
                <div className="rounded-xl bg-surface-2 border border-border p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" aria-hidden="true" />
                    <p className="text-xs text-green-400/80">
                      Gift is private—only the recipient can see and redeem the GiftToken. Your identity is hashed.
                    </p>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/15 p-3" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" aria-hidden="true" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {/* Transaction progress */}
                {status === 'submitting' && (
                  <TransactionStatus status={txStatus} txId={txId} errorMessage={error} />
                )}

                {/* Submit */}
                {status !== 'submitting' && (
                  <Button
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
                    Send Gift
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
