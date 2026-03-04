'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, X, Send, Sparkles, AlertCircle, Shield } from 'lucide-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { MICROCREDITS_PER_CREDIT, SUBSCRIPTION_DURATION_BLOCKS } from '@/lib/config'

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
  const [recipientAddress, setRecipientAddress] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [txId, setTxId] = useState<string | null>(null)

  const priceAleo = (tierPrice / MICROCREDITS_PER_CREDIT).toFixed(2)

  const handleGift = useCallback(async () => {
    if (!connected || !recipientAddress.startsWith('aleo1')) return
    setStatus('submitting')
    setError('')
    try {
      const records = await getCreditsRecords()
      if (records.length === 0) throw new Error('No private credits available. Convert public credits first.')
      const paymentRecord = typeof records[0] === 'string' ? records[0] : (records[0] as any).plaintext
      const giftId = `${Date.now()}`
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
      setStatus('success')
    } catch (err: any) {
      setError(err?.message || 'Gift failed')
      setStatus('error')
    }
  }, [connected, recipientAddress, creatorAddress, tierId, tierPrice, giftSubscription, getCreditsRecords])

  const handleClose = () => {
    setStatus('idle')
    setError('')
    setRecipientAddress('')
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
            className="relative w-full max-w-md rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111113] shadow-2xl p-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-pink-500/20 p-2">
                  <Gift className="h-5 w-5 text-pink-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Gift Subscription</h3>
              </div>
              <button onClick={handleClose} className="rounded-lg p-1 text-[#a1a1aa] hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {status === 'success' ? (
              <div className="space-y-4">
                <div className="rounded-[8px] bg-[#18181b] border border-[rgba(255,255,255,0.06)] p-4 text-center">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-green-400" />
                  <p className="text-sm font-medium text-green-400">Gift sent!</p>
                  <p className="mt-1 text-xs text-[#71717a]">Recipient will receive a GiftToken to redeem</p>
                  {txId && <p className="mt-1 text-xs text-[#71717a] break-all">Tx: {txId.slice(0, 20)}...</p>}
                </div>
                <button onClick={handleClose} className="w-full rounded-lg bg-white/[0.05] border border-[rgba(255,255,255,0.06)] py-2.5 text-sm font-medium text-[#fafafa] hover:bg-white/[0.08]">
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Gift details */}
                <div className="rounded-[8px] bg-[#18181b] border border-[rgba(255,255,255,0.06)] p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#a1a1aa]">Tier</span>
                    <span className="text-white font-medium">{tierName} (#{tierId})</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-[#a1a1aa]">Cost</span>
                    <span className="text-white font-medium">{priceAleo} ALEO</span>
                  </div>
                </div>

                {/* Recipient address */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#a1a1aa]">Recipient Address</label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="aleo1..."
                    className="w-full rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.06)] px-4 py-2.5 text-sm text-white placeholder:text-[#71717a] focus:border-[rgba(255,255,255,0.12)] focus:outline-none focus:ring-2 focus:ring-[rgba(139,92,246,0.2)] transition-all font-mono text-xs"
                  />
                </div>

                {/* Privacy note */}
                <div className="rounded-[8px] bg-[#18181b] border border-[rgba(255,255,255,0.06)] p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                    <p className="text-xs text-green-400/80">
                      Gift is private — only the recipient can see and redeem the GiftToken. Your identity is hashed.
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
                  onClick={handleGift}
                  disabled={status === 'submitting' || !recipientAddress.startsWith('aleo1') || !connected}
                  className="w-full rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {status === 'submitting' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending gift...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send className="h-4 w-4" />
                      Send Gift
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
