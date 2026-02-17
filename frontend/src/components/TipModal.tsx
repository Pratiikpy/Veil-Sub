'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { creditsToMicrocredits } from '@/lib/utils'
import { extractNonce, dedupeRecords, waitForRecordSync } from '@/lib/recordSync'
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
  const { tip, getCreditsRecords, splitCredits, pollTxStatus, connected } = useVeilSub()
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

      // Fetch with retry (NullPay pattern)
      console.log('[TipModal] Fetching credits records...')
      let rawRecords: string[]
      try {
        rawRecords = await getCreditsRecords()
      } catch (fetchErr) {
        console.error('[TipModal] First fetch failed:', fetchErr)
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
      // Nonce-based deduplication (CLAUDE.md: NEVER deduplicate by full plaintext string)
      const records = dedupeRecords(rawRecords)
      console.log('[TipModal] Deduped records:', records.length)

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

      const tipPlatformCut = Math.floor(tipMicrocredits / 20)
      let rec1 = records[0]
      let rec2 = records.length >= 2 ? records[1] : null

      // Validate rec2 has enough for platform cut (5%) and rec1 !== rec2
      if (rec2) {
        if (extractNonce(rec1) === extractNonce(rec2)) {
          rec2 = records.length >= 3 ? records[2] : null
        }
        if (rec2 && parseMicrocredits(rec2) < tipPlatformCut) {
          rec2 = null // Force auto-split path
        }
      }

      // Auto-split if only 1 record
      if (!rec2) {
        // Save consumed record nonce to exclude stale cache entries after split
        const consumedNonce = extractNonce(records[0])
        console.log('[TipModal] Consumed record nonce for exclusion:', consumedNonce)

        setStatusMessage('Splitting credit record (1 of 2)...')
        const splitAmount = tipMicrocredits - Math.floor(tipMicrocredits / 20) // 95% for creator, remainder covers 5% platform fee
        const splitTxId = await splitCredits(records[0], splitAmount)
        if (!splitTxId) {
          setTxStatus('failed')
          setError('Record split was rejected by wallet.')
          submittingRef.current = false
          return
        }

        setStatusMessage('Waiting for split to confirm...')
        await new Promise<void>((resolve, reject) => {
          let attempts = 0
          const poll = setInterval(async () => {
            attempts++
            try {
              const status = (await pollTxStatus(splitTxId)).toLowerCase()
              if (status.includes('finalize') || status.includes('confirm') || status.includes('accept') || status.includes('complete')) { clearInterval(poll); resolve() }
              else if (status.includes('fail') || status.includes('reject')) { clearInterval(poll); reject(new Error('Split failed')) }
            } catch { /* continue */ }
            if (attempts > 60) { clearInterval(poll); reject(new Error('Split timed out.')) }
          }, 1000)
        })

        setStatusMessage('Fetching updated records...')
        const synced = await waitForRecordSync(getCreditsRecords, setStatusMessage, new Set([consumedNonce]))
        rec1 = synced[0]
        rec2 = synced[1]
      }

      setStatusMessage(null)
      setTxStatus('proving')
      const id = await tip(
        rec1,
        rec2,
        creatorAddress,
        tipMicrocredits
      )

      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')
        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            setTxStatus('confirmed')
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
            className="w-full max-w-sm rounded-2xl bg-[#0a0a0f] border border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
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
                <p className="text-center text-sm text-slate-400 mb-4">
                  {customAmount ? `${customAmount} ALEO credits` : `${selectedAmount} ALEO credits`}
                </p>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {insufficientBalance && (
                  <div className="mb-4">
                    <BalanceConverter requiredAmount={creditsToMicrocredits(parseFloat(customAmount) || selectedAmount)} />
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
