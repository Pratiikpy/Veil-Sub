'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { generatePassId, formatCredits } from '@/lib/utils'
import { SUBSCRIPTION_DURATION_BLOCKS, PLATFORM_FEE_PCT } from '@/lib/config'
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
  const { subscribe, getCreditsRecords, splitCredits, pollTxStatus, connected } = useVeilSub()
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
      // Fetch user's credits records with retry (NullPay pattern)
      let rawRecords = await getCreditsRecords()
      if (rawRecords.length === 0) {
        // Retry after brief sync delay
        await new Promise(r => setTimeout(r, 2000))
        rawRecords = await getCreditsRecords()
      }
      const seen = new Set<string>()
      const records = rawRecords.filter(r => { if (seen.has(r)) return false; seen.add(r); return true })

      if (records.length < 1) {
        setInsufficientBalance(true)
        setError('No private credit records found. Convert public credits to private or get testnet credits.')
        setTxStatus('idle')
        submittingRef.current = false
        return
      }

      // Check total available balance across ALL records (not just first)
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

      let rec1 = records[0]
      let rec2 = records.length >= 2 ? records[1] : null

      // Auto-split: if only 1 record, split it via credits.aleo/split
      if (!rec2) {
        setStatusMessage('Splitting credit record (1 of 2)...')
        const splitAmount = Math.ceil(totalPrice * 0.96) // ~96% for creator (95%) + buffer
        const splitTxId = await splitCredits(records[0], splitAmount)
        if (!splitTxId) {
          setTxStatus('failed')
          setError('Record split was rejected by wallet.')
          submittingRef.current = false
          return
        }

        // Wait for split to confirm
        setStatusMessage('Waiting for split to confirm...')
        await new Promise<void>((resolve, reject) => {
          let attempts = 0
          const poll = setInterval(async () => {
            attempts++
            try {
              const status = (await pollTxStatus(splitTxId)).toLowerCase()
              if (status.includes('finalize') || status.includes('confirm') || status.includes('accept') || status.includes('complete')) {
                clearInterval(poll)
                resolve()
              } else if (status.includes('fail') || status.includes('reject')) {
                clearInterval(poll)
                reject(new Error('Split transaction failed on-chain'))
              }
            } catch { /* continue polling */ }
            if (attempts > 60) { // ~60 seconds
              clearInterval(poll)
              reject(new Error('Split transaction timed out. Please try again.'))
            }
          }, 1000)
        })

        // Re-fetch records after split
        setStatusMessage('Fetching updated records...')
        await new Promise(r => setTimeout(r, 2000)) // brief wait for wallet sync
        const newRecords = await getCreditsRecords()
        const dedupSet = new Set<string>()
        const deduped = newRecords.filter(r => { if (dedupSet.has(r)) return false; dedupSet.add(r); return true })
        if (deduped.length < 2) {
          setTxStatus('failed')
          setError('Split completed but records not yet synced. Please close and try again in a few seconds.')
          submittingRef.current = false
          return
        }
        rec1 = deduped[0]
        rec2 = deduped[1]
      }

      const passId = generatePassId()
      const expiresAt = blockHeight + SUBSCRIPTION_DURATION_BLOCKS

      setStatusMessage(null)
      setTxStatus('proving')
      const id = await subscribe(
        rec1,
        rec2,
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
            setTxStatus('confirmed')
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
    if (txStatus === 'signing' || txStatus === 'proving') return
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
      if (e.key === 'Escape' && (txStatusRef.current === 'idle' || txStatusRef.current === 'failed' || txStatusRef.current === 'confirmed'))
        handleCloseRef.current()
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
            className="w-full max-w-md rounded-2xl bg-[#13111c] border border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
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
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 mb-6">
                  <p className="text-xs text-green-400">
                    Your identity stays private. The creator will receive payment
                    but will never know who you are. Both transfers use credits.aleo/transfer_private.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {insufficientBalance && (
                  <div className="mb-4">
                    <BalanceConverter requiredAmount={totalPrice} />
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
