'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { creditsToMicrocredits } from '@/lib/utils'
import { dedupeRecords } from '@/lib/recordSync'
import { logSubscriptionEvent } from '@/lib/logEvent'
import TransactionStatus from './TransactionStatus'
import BalanceConverter from './BalanceConverter'
import type { TxStatus } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  creatorAddress: string
}

const TIP_AMOUNTS = [1, 5, 10, 25]

const parseMicrocredits = (plaintext: string): number => {
  const match = plaintext.match(/microcredits\s*:\s*([\d_]+)u64/)
  return match ? parseInt(match[1].replace(/_/g, ''), 10) : 0
}

export default function TipModal({ isOpen, onClose, creatorAddress }: Props) {
  const { tip, getCreditsRecords, connected } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const [selectedAmount, setSelectedAmount] = useState(5)
  const [customAmount, setCustomAmount] = useState('')
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

  // Cycling status messages during proving/broadcasting
  useEffect(() => {
    if (txStatus !== 'proving' && txStatus !== 'broadcasting') {
      setStatusMessage(null)
      return
    }
    const messages = txStatus === 'proving'
      ? ['Generating zero-knowledge proof...', 'Wallet is computing the ZK circuit...', 'This may take 30-60 seconds...']
      : ['Broadcasting tip to Aleo network...', 'Waiting for block confirmation...', 'Validators are verifying the proof...']
    let idx = 0
    setStatusMessage(messages[0])
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length
      setStatusMessage(messages[idx])
    }, 4000)
    return () => clearInterval(interval)
  }, [txStatus])

  const handleTip = async () => {
    if (submittingRef.current) return
    if (!connected) {
      setError('Please connect your wallet first.')
      return
    }

    submittingRef.current = true
    setError(null)
    setStatusMessage(null)
    setTxStatus('signing')

    try {
      const tipAmount = parseFloat(customAmount) || selectedAmount
      if (tipAmount < 0.1 || tipAmount > 1000) {
        setError('Tip amount must be between 0.1 and 1000 ALEO.')
        setTxStatus('idle')
        submittingRef.current = false
        return
      }

      const tipMicrocredits = creditsToMicrocredits(tipAmount)

      let rawRecords: string[]
      try {
        rawRecords = await getCreditsRecords()
      } catch {
        await new Promise(r => setTimeout(r, 2000))
        try {
          rawRecords = await getCreditsRecords()
        } catch (retryErr) {
          throw new Error(`Could not load wallet records: ${retryErr instanceof Error ? retryErr.message : 'Unknown error'}. Check browser console.`)
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
      if (totalAvailable < tipMicrocredits) {
        setInsufficientBalance(true)
        setError(`Insufficient private balance. You have ${(totalAvailable / 1_000_000).toFixed(2)} ALEO but need ${tipAmount} ALEO.`)
        setTxStatus('idle')
        submittingRef.current = false
        return
      }
      if (largestRecord < tipMicrocredits) {
        setInsufficientBalance(true)
        setError(`Your largest record has ${(largestRecord / 1_000_000).toFixed(2)} ALEO but you need ${tipAmount} in a single record. Convert public credits to private to create a larger record.`)
        setTxStatus('idle')
        submittingRef.current = false
        return
      }

      // v7: Single-record tip — contract handles both creator and platform payments
      const paymentRecord = records[0]

      setStatusMessage(null)
      setTxStatus('proving')
      const id = await tip(
        paymentRecord,
        creatorAddress,
        tipMicrocredits
      )

      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')
        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            if (result.resolvedTxId) setTxId(result.resolvedTxId)
            setTxStatus('confirmed')
            logSubscriptionEvent(creatorAddress, 0, tipMicrocredits, result.resolvedTxId || id)
            toast.success('Tip sent!')
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            setError('Transaction failed on-chain.')
            toast.error('Tip failed')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Transaction was rejected by wallet.')
      }
    } catch (err) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Tip failed')
    } finally {
      submittingRef.current = false
    }
  }

  const handleClose = () => {
    // Allow close in ANY state — never trap the user
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
            aria-label="Send a private tip"
            className="w-full max-w-sm rounded-2xl bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/[0.12] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-semibold text-white">
                  Send a Private Tip
                </h3>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close tip dialog"
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {txStatus === 'idle' ? (
              <>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {TIP_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => { setSelectedAmount(amount); setCustomAmount('') }}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        selectedAmount === amount && !customAmount
                          ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                          : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                <div className="relative mb-4">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value)
                      if (e.target.value) setSelectedAmount(0)
                    }}
                    placeholder="Custom amount"
                    min="0.1"
                    max="1000"
                    step="0.1"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">ALEO</span>
                </div>
                <p className="text-center text-sm text-slate-400 mb-3">
                  {customAmount ? `${customAmount} ALEO credits` : `${selectedAmount} ALEO credits`}
                </p>
                <div className="p-2.5 rounded-lg bg-green-500/5 border border-green-500/10 mb-4">
                  <p className="text-[11px] text-green-400/80">
                    Your identity stays private. The creator receives payment but never knows who tipped.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {insufficientBalance && (
                  <div className="mb-4">
                    <BalanceConverter
                      requiredAmount={creditsToMicrocredits(parseFloat(customAmount) || selectedAmount)}
                      onConverted={() => {
                        setInsufficientBalance(false)
                        setError(null)
                        handleTip()
                      }}
                    />
                  </div>
                )}

                <button
                  onClick={handleTip}
                  disabled={txStatus !== 'idle'}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 text-white font-medium hover:from-pink-500 hover:to-violet-500 transition-all hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {txStatus !== 'idle' ? 'Processing...' : 'Tip Privately'}
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-center"
                  >
                    <p className="text-green-400 font-medium">Tip sent!</p>
                    <button
                      onClick={handleClose}
                      className="mt-3 px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors"
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
