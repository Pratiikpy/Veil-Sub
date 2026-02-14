'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart } from 'lucide-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { creditsToMicrocredits } from '@/lib/utils'
import TransactionStatus from './TransactionStatus'
import BalanceConverter from './BalanceConverter'
import type { TxStatus } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  creatorAddress: string
}

const TIP_AMOUNTS = [1, 5, 10, 25]

export default function TipModal({ isOpen, onClose, creatorAddress }: Props) {
  const { tip, getCreditsRecords, connected } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const [selectedAmount, setSelectedAmount] = useState(5)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [insufficientBalance, setInsufficientBalance] = useState(false)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, txStatus])

  // Stop polling on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const handleTip = async () => {
    if (!connected) {
      setError('Please connect your wallet first.')
      return
    }

    setError(null)
    setTxStatus('signing')

    try {
      const records = await getCreditsRecords()
      if (records.length < 2) {
        setInsufficientBalance(true)
        setError('Need at least 2 private credit records. Split your credits first.')
        setTxStatus('idle')
        return
      }

      setTxStatus('proving')
      const id = await tip(
        records[0],
        records[1],
        creatorAddress,
        creditsToMicrocredits(selectedAmount)
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
      setError(err instanceof Error ? err.message : 'Tip failed')
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
            aria-label="Send a private tip"
            className="w-full max-w-sm rounded-2xl bg-[#13111c] border border-white/10 p-6 shadow-2xl"
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
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {TIP_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setSelectedAmount(amount)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        selectedAmount === amount
                          ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                          : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-slate-400 mb-4">
                  {selectedAmount} ALEO credits
                </p>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {insufficientBalance && (
                  <div className="mb-4">
                    <BalanceConverter
                      requiredAmount={creditsToMicrocredits(selectedAmount)}
                      currentBalance={0}
                    />
                  </div>
                )}

                <button
                  onClick={handleTip}
                  disabled={txStatus !== 'idle'}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 text-white font-medium hover:from-pink-500 hover:to-violet-500 transition-all hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tip Privately
                </button>
              </>
            ) : (
              <div className="py-2">
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
