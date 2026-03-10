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
      if (records.length === 0) throw new Error('No private credits available. Convert public credits first.')
      const paymentRecord = typeof records[0] === 'string' ? records[0] : (records[0] as Record<string, string>).plaintext
      // Generate a collision-resistant gift ID using crypto API + timestamp + random suffix
      const randomBytes = new Uint8Array(8)
      crypto.getRandomValues(randomBytes)
      const giftId = `${Date.now()}-${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`
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
                  <Gift className="h-5 w-5 text-pink-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Gift Subscription</h3>
              </div>
              <button onClick={handleClose} aria-label="Close gift modal" className="rounded-lg p-1 text-muted hover:bg-white/[0.1] hover:text-white active:scale-[0.9] transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            {status === 'success' ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-surface-2 border border-border p-4 text-center">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-green-400" />
                  <p className="text-sm font-medium text-green-400">Gift sent!</p>
                  <p className="mt-1 text-xs text-subtle">Recipient will receive a GiftToken to redeem</p>
                  {txId && <p className="mt-1 text-xs text-subtle break-all">Tx: {txId.slice(0, 20)}...</p>}
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
                    <span className="text-muted">Tier</span>
                    <span className="text-white font-medium">{tierName} (#{tierId})</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-muted">Cost</span>
                    <span className="text-white font-medium">{priceAleo} ALEO</span>
                  </div>
                </div>

                {/* Recipient address */}
                <div>
                  <label htmlFor="gift-recipient" className="mb-2 block text-xs font-medium text-muted">Recipient Address</label>
                  <input
                    id="gift-recipient"
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="aleo1..."
                    className="w-full rounded-lg bg-white/[0.05] border border-border px-4 py-2.5 text-white placeholder-subtle focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-base font-mono"
                  />
                </div>

                {/* Privacy note */}
                <div className="rounded-xl bg-surface-2 border border-border p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
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
                    className="w-full"
                  >
                    <Send className="h-4 w-4" />
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
