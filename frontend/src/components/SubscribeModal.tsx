'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { generatePassId, formatCredits } from '@/lib/utils'
import { dedupeRecords } from '@/lib/recordSync'
import { SUBSCRIPTION_DURATION_BLOCKS, PLATFORM_FEE_PCT } from '@/lib/config'
import { logSubscriptionEvent } from '@/lib/logEvent'
import TransactionStatus from './TransactionStatus'
import BalanceConverter from './BalanceConverter'
import type { SubscriptionTier, TxStatus } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  tier: SubscriptionTier
  creatorAddress: string
  basePrice: number // microcredits
}

const parseMicrocredits = (plaintext: string): number => {
  const match = plaintext.match(/microcredits\s*:\s*([\d_]+)u64/)
  return match ? parseInt(match[1].replace(/_/g, ''), 10) : 0
}

export default function SubscribeModal({
  isOpen,
  onClose,
  tier,
  creatorAddress,
  basePrice,
}: Props) {
  const { subscribe, getCreditsRecords, connected } = useVeilSub()
  const { blockHeight } = useBlockHeight()
  const { startPolling, stopPolling } = useTransactionPoller()
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [insufficientBalance, setInsufficientBalance] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const txStatusRef = useRef(txStatus)
  txStatusRef.current = txStatus

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Stop polling on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  // Detect wallet disconnect during transaction
  useEffect(() => {
    if (!connected && (txStatus === 'signing' || txStatus === 'proving' || txStatus === 'broadcasting')) {
      setTxStatus('failed')
      setError('Wallet disconnected. Please reconnect and try again.')
      stopPolling()
      submittingRef.current = false
    }
  }, [connected, txStatus, stopPolling])

  const totalPrice = basePrice * tier.priceMultiplier
  const creatorCut = totalPrice - Math.floor(totalPrice / 20)
  const platformCut = Math.floor(totalPrice / 20)

  // Cycling status messages during proving/broadcasting
  useEffect(() => {
    if (txStatus !== 'proving' && txStatus !== 'broadcasting') {
      setStatusMessage(null)
      return
    }
    const messages = txStatus === 'proving'
      ? ['Generating zero-knowledge proof...', 'Wallet is computing the ZK circuit...', 'This may take 30-60 seconds...', 'Almost there — proof nearly complete...']
      : ['Broadcasting transaction to Aleo network...', 'Waiting for block confirmation...', 'Validators are verifying the proof...', 'Finalizing on-chain state...']
    let idx = 0
    setStatusMessage(messages[0])
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length
      setStatusMessage(messages[idx])
    }, 4000)
    return () => clearInterval(interval)
  }, [txStatus])

  const handleSubscribe = async () => {
    if (submittingRef.current) return
    if (!connected) {
      setError('Please connect your wallet first.')
      return
    }
    if (blockHeight === null) {
      setError('Could not fetch current block height. Please try again.')
      return
    }

    submittingRef.current = true
    setError(null)
    setStatusMessage(null)
    setTxStatus('signing')

    try {
      let rawRecords: string[]
      try {
        rawRecords = await getCreditsRecords()
      } catch {
        // Retry once after brief sync delay
        await new Promise(r => setTimeout(r, 2000))
        try {
          rawRecords = await getCreditsRecords()
        } catch (retryErr) {
          throw new Error(`Could not load wallet records: ${retryErr instanceof Error ? retryErr.message : 'Unknown error'}. Check browser console for details.`)
        }
      }
      if (rawRecords.length === 0) {
        await new Promise(r => setTimeout(r, 2000))
        try {
          rawRecords = await getCreditsRecords()
        } catch { rawRecords = [] }
      }
      const records = dedupeRecords(rawRecords)

      if (records.length < 1) {
        setInsufficientBalance(true)
        setError('No private credit records found. Convert public credits to private or get testnet credits.')
        setTxStatus('idle')
        submittingRef.current = false
        return
      }

      const totalAvailable = records.reduce((sum, r) => sum + parseMicrocredits(r), 0)
      const largestRecord = parseMicrocredits(records[0])
      if (totalAvailable < totalPrice) {
        setInsufficientBalance(true)
        setError(`Insufficient private balance. You have ${formatCredits(totalAvailable)} ALEO but need ${formatCredits(totalPrice)} ALEO.`)
        setTxStatus('idle')
        submittingRef.current = false
        return
      }
      if (largestRecord < totalPrice) {
        setInsufficientBalance(true)
        setError(`Your largest record has ${formatCredits(largestRecord)} ALEO but you need ${formatCredits(totalPrice)} in a single record. Convert public credits to private to create a larger record.`)
        setTxStatus('idle')
        submittingRef.current = false
        return
      }

      // v7: Single-record subscribe — contract handles both creator and platform payments
      const paymentRecord = records[0]

      const passId = generatePassId()
      const expiresAt = blockHeight + SUBSCRIPTION_DURATION_BLOCKS

      setStatusMessage(null)
      setTxStatus('proving')
      const id = await subscribe(
        paymentRecord,
        creatorAddress,
        tier.id,
        totalPrice,
        passId,
        expiresAt
      )

      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')
        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            if (result.resolvedTxId) setTxId(result.resolvedTxId)
            setTxStatus('confirmed')
            logSubscriptionEvent(creatorAddress, tier.id, totalPrice, result.resolvedTxId || id)
            toast.success('Subscribed!')
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            setError('Transaction failed on-chain.')
            toast.error('Subscription failed')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Transaction was rejected by wallet.')
      }
    } catch (err) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Transaction failed')
    } finally {
      submittingRef.current = false
    }
  }

  const handleClose = () => {
    // Allow close in ANY state — never trap the user in a hung modal
    stopPolling()
    setTxStatus('idle')
    setTxId(null)
    setError(null)
    setInsufficientBalance(false)
    setStatusMessage(null)
    submittingRef.current = false
    onClose()
  }

  // Escape key to close (uses refs to avoid stale closures)
  const handleCloseRef = useRef(handleClose)
  handleCloseRef.current = handleClose
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Subscribe to creator"
            className="w-full max-w-md rounded-2xl bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/[0.12] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-semibold text-white">
                  Private Subscription
                </h3>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close subscription dialog"
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {txStatus === 'idle' ? (
              <>
                {/* Tier Info */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-violet-300 font-medium">
                      {tier.name}
                    </span>
                    <span className="text-white font-bold">
                      {formatCredits(totalPrice)} ALEO
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{tier.description}</p>
                  <ul className="mt-3 space-y-1">
                    {tier.features.map((f) => (
                      <li
                        key={f}
                        className="text-xs text-slate-400 flex items-center gap-2"
                      >
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Fee Breakdown */}
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-4">
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Creator ({100 - PLATFORM_FEE_PCT}%)</span>
                      <span className="text-slate-300">{formatCredits(creatorCut)} ALEO</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform fee ({PLATFORM_FEE_PCT}%)</span>
                      <span className="text-slate-300">{formatCredits(platformCut)} ALEO</span>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-white/5 flex justify-between text-slate-400">
                      <span>Duration</span>
                      <span>~30 days ({SUBSCRIPTION_DURATION_BLOCKS.toLocaleString()} blocks)</span>
                    </div>
                  </div>
                </div>

                {/* Privacy Notice */}
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 mb-6 space-y-1.5">
                  <p className="text-xs text-green-400 font-medium">Zero-Knowledge Privacy</p>
                  <ul className="text-[11px] text-green-400/80 space-y-1 list-none">
                    <li>Your address is never published on-chain</li>
                    <li>Only aggregate totals update in public mappings</li>
                    <li>AccessPass stored privately in your wallet</li>
                    <li>Payment via credits.aleo/transfer_private</li>
                  </ul>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {insufficientBalance && (
                  <div className="mb-4">
                    <BalanceConverter
                      requiredAmount={totalPrice}
                      onConverted={() => {
                        setInsufficientBalance(false)
                        setError(null)
                        handleSubscribe()
                      }}
                    />
                  </div>
                )}

                {/* Subscribe Button */}
                <button
                  onClick={handleSubscribe}
                  disabled={txStatus !== 'idle'}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {txStatus !== 'idle' ? 'Processing...' : 'Subscribe Privately'}
                </button>
              </>
            ) : (
              <div className="py-2">
                {statusMessage && (
                  <div className="mb-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <p className="text-xs text-violet-300 animate-pulse">{statusMessage}</p>
                  </div>
                )}
                <TransactionStatus status={txStatus} txId={txId} />
                {txStatus === 'confirmed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center"
                  >
                    <p className="text-green-400 font-medium mb-1">
                      Subscribed!
                    </p>
                    <p className="text-xs text-slate-400">
                      Your AccessPass is now in your wallet. Access for ~30 days.
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
                    {error && (
                      <p className="text-xs text-red-400 mb-3">{error}</p>
                    )}
                    <button
                      onClick={() => {
                        setTxStatus('idle')
                        setError(null)
                        setStatusMessage(null)
                      }}
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
