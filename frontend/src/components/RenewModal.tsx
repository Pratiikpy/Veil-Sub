'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, Shield } from 'lucide-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { generatePassId, formatCredits } from '@/lib/utils'
import { SUBSCRIPTION_DURATION_BLOCKS, PLATFORM_FEE_PCT } from '@/lib/config'
import TransactionStatus from './TransactionStatus'
import BalanceConverter from './BalanceConverter'
import type { AccessPass, SubscriptionTier, TxStatus } from '@/types'
import { TIERS } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  pass: AccessPass
  basePrice: number // microcredits
}

export default function RenewModal({
  isOpen,
  onClose,
  pass,
  basePrice,
}: Props) {
  const { renew, getCreditsRecords, connected } = useVeilSub()
  const { blockHeight } = useBlockHeight()
  const { startPolling, stopPolling } = useTransactionPoller()
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    TIERS.find((t) => t.id === pass.tier) || TIERS[0]
  )
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [insufficientBalance, setInsufficientBalance] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, txStatus])

  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const totalPrice = basePrice * selectedTier.priceMultiplier
  const creatorCut = totalPrice - Math.floor(totalPrice / 20)
  const platformCut = Math.floor(totalPrice / 20)

  const isExpired = blockHeight !== null && pass.expiresAt <= blockHeight
  const blocksRemaining = blockHeight !== null ? Math.max(0, pass.expiresAt - blockHeight) : null
  const daysRemaining = blocksRemaining !== null ? Math.round((blocksRemaining * 3) / 86400) : null

  const handleRenew = async () => {
    if (!connected) {
      setError('Please connect your wallet first.')
      return
    }
    if (blockHeight === null) {
      setError('Could not fetch current block height. Please try again.')
      return
    }

    setError(null)
    setTxStatus('signing')

    try {
      const records = await getCreditsRecords()
      if (records.length === 0) {
        setInsufficientBalance(true)
        setError('No private ALEO credits found.')
        setTxStatus('idle')
        return
      }

      const newPassId = generatePassId()
      const newExpiresAt = blockHeight + SUBSCRIPTION_DURATION_BLOCKS

      setTxStatus('proving')
      const id = await renew(
        pass.rawPlaintext,
        records[0],
        selectedTier.id,
        totalPrice,
        newPassId,
        newExpiresAt
      )

      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')
        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            setTxStatus('confirmed')
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            setError('Transaction failed on-chain.')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Transaction was rejected by wallet.')
      }
    } catch (err) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Renewal failed')
    }
  }

  const handleClose = () => {
    if (txStatus === 'signing' || txStatus === 'proving') return
    stopPolling()
    setTxStatus('idle')
    setTxId(null)
    setError(null)
    setInsufficientBalance(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Renew subscription"
            className="w-full max-w-md rounded-2xl bg-[#13111c] border border-white/10 p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-semibold text-white">
                  Renew Subscription
                </h3>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close renewal dialog"
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {txStatus === 'idle' ? (
              <>
                {/* Current Status */}
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-4">
                  <p className="text-xs text-slate-500 mb-1">Current pass</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">
                      {TIERS.find((t) => t.id === pass.tier)?.name || `Tier ${pass.tier}`}
                    </span>
                    {isExpired ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                        Expired
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        ~{daysRemaining} days left
                      </span>
                    )}
                  </div>
                </div>

                {/* Tier Selector */}
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-2">Renew as:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {TIERS.map((tier) => (
                      <button
                        key={tier.id}
                        onClick={() => setSelectedTier(tier)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                          selectedTier.id === tier.id
                            ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                            : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {tier.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-violet-300 font-medium">
                      {selectedTier.name}
                    </span>
                    <span className="text-white font-bold">
                      {formatCredits(totalPrice)} ALEO
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Creator ({100 - PLATFORM_FEE_PCT}%)</span>
                      <span>{formatCredits(creatorCut)} ALEO</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform fee ({PLATFORM_FEE_PCT}%)</span>
                      <span>{formatCredits(platformCut)} ALEO</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 text-xs text-slate-400">
                    Access for ~30 days ({SUBSCRIPTION_DURATION_BLOCKS.toLocaleString()} blocks)
                  </div>
                </div>

                {/* Privacy Notice */}
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <p className="text-xs text-green-400">
                      Your identity stays private. Both payments use private transfers.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {insufficientBalance && (
                  <div className="mb-4">
                    <BalanceConverter requiredAmount={totalPrice} currentBalance={0} />
                  </div>
                )}

                <button
                  onClick={handleRenew}
                  disabled={txStatus !== 'idle'}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Renew Privately
                </button>
              </>
            ) : (
              <div className="py-2">
                <TransactionStatus status={txStatus} txId={txId} />
                {txStatus === 'confirmed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center"
                  >
                    <p className="text-green-400 font-medium mb-1">Renewed!</p>
                    <p className="text-xs text-slate-400">
                      Your new AccessPass is in your wallet.
                    </p>
                    <button
                      onClick={handleClose}
                      className="mt-4 px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors"
                    >
                      Done
                    </button>
                  </motion.div>
                )}
                {txStatus === 'failed' && (
                  <div className="mt-4 text-center">
                    {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                    <button
                      onClick={() => { setTxStatus('idle'); setError(null) }}
                      className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
