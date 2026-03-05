'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, Sparkles, Users } from 'lucide-react'
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
  referrerAddress?: string | null
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
  referrerAddress,
}: Props) {
  const { subscribe, subscribeBlind, subscribeReferral, subscribePrivateCount, getCreditsRecords, connected } = useVeilSub()
  const { blockHeight } = useBlockHeight()
  const { startPolling, stopPolling } = useTransactionPoller()
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [insufficientBalance, setInsufficientBalance] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [privacyMode, setPrivacyMode] = useState<'standard' | 'blind' | 'max'>('standard')
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
  const isReferral = !!referrerAddress && referrerAddress.startsWith('aleo1') && referrerAddress !== creatorAddress
  const referralAmount = isReferral ? Math.floor(totalPrice / 10) : 0 // 10% to referrer
  const creatorAmount = totalPrice - referralAmount
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
    toast.loading('Preparing your private subscription...', { id: 'subscribe-optimistic', duration: 5000 })

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
        toast.dismiss('subscribe-optimistic')
        setInsufficientBalance(true)
        setError('No private credit records found. Convert public credits to private or get testnet credits.')
        setTxStatus('idle')
        submittingRef.current = false
        return
      }

      const totalAvailable = records.reduce((sum, r) => sum + parseMicrocredits(r), 0)
      const largestRecord = parseMicrocredits(records[0])
      if (totalAvailable < totalPrice) {
        toast.dismiss('subscribe-optimistic')
        setInsufficientBalance(true)
        setError(`Insufficient private balance. You have ${formatCredits(totalAvailable)} ALEO but need ${formatCredits(totalPrice)} ALEO.`)
        setTxStatus('idle')
        submittingRef.current = false
        return
      }
      if (largestRecord < totalPrice) {
        toast.dismiss('subscribe-optimistic')
        setInsufficientBalance(true)
        setError(`Your largest record has ${formatCredits(largestRecord)} ALEO but you need ${formatCredits(totalPrice)} in a single record. Convert public credits to private to create a larger record.`)
        setTxStatus('idle')
        submittingRef.current = false
        return
      }

      const passId = generatePassId()
      const expiresAt = blockHeight + SUBSCRIPTION_DURATION_BLOCKS

      setStatusMessage(null)
      setTxStatus('proving')
      toast.dismiss('subscribe-optimistic')

      let id: string | null
      if (isReferral && referrerAddress && records.length >= 2) {
        // v16: Referral subscribe — needs two credit records
        id = await subscribeReferral(
          records[0], records[1],
          creatorAddress, referrerAddress,
          tier.id, referralAmount, creatorAmount, passId, expiresAt
        )
      } else if (privacyMode === 'blind') {
        // v11: Blind subscribe — nonce-rotated identity hash
        const nonce = generatePassId() // random nonce
        id = await subscribeBlind(
          records[0], creatorAddress, nonce, tier.id, totalPrice, passId, expiresAt
        )
      } else if (privacyMode === 'max') {
        // v17: Max privacy — Pedersen commitment, no public count
        const blinding = generatePassId() // random blinding factor
        id = await subscribePrivateCount(
          records[0], creatorAddress, tier.id, totalPrice, passId, expiresAt, blinding
        )
      } else {
        // Standard subscribe
        id = await subscribe(
          records[0], creatorAddress, tier.id, totalPrice, passId, expiresAt
        )
      }

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
      toast.dismiss('subscribe-optimistic')
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
            className="w-full max-w-md rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#a1a1aa]" />
                <h3 className="text-lg font-semibold text-white">
                  Private Subscription
                </h3>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close subscription dialog"
                className="p-1 rounded-lg hover:bg-white/5 text-[#a1a1aa] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {txStatus === 'idle' ? (
              <>
                {/* Tier Info */}
                <div className="p-4 rounded-[8px] bg-[#18181b] border border-white/[0.08] mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#a1a1aa] font-medium">
                      {tier.name}
                    </span>
                    <span className="text-white font-bold">
                      {formatCredits(totalPrice)} ALEO
                    </span>
                  </div>
                  <p className="text-sm text-[#a1a1aa]">{tier.description}</p>
                  <ul className="mt-3 space-y-1">
                    {tier.features.map((f) => (
                      <li
                        key={f}
                        className="text-xs text-[#a1a1aa] flex items-center gap-2"
                      >
                        <Sparkles className="w-3 h-3 text-[#a1a1aa]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Referral Notice */}
                {isReferral && (
                  <div className="p-3 rounded-[8px] bg-violet-500/[0.06] border border-violet-500/[0.12] mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-xs font-medium text-violet-300">Referral Subscription</span>
                    </div>
                    <p className="text-[11px] text-[#a1a1aa]">
                      10% ({formatCredits(referralAmount)} ALEO) goes to the referrer as a private reward.
                      The referrer cannot see your identity.
                    </p>
                  </div>
                )}

                {/* Fee Breakdown */}
                <div className="p-3 rounded-[8px] bg-[#18181b] border border-white/[0.08] mb-4">
                  <div className="text-xs text-[#71717a] space-y-1">
                    {isReferral && (
                      <div className="flex justify-between">
                        <span>Referrer (10%)</span>
                        <span className="text-violet-300">{formatCredits(referralAmount)} ALEO</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Creator ({isReferral ? '90' : String(100 - PLATFORM_FEE_PCT)}%)</span>
                      <span className="text-[#a1a1aa]">{formatCredits(isReferral ? creatorAmount : creatorCut)} ALEO</span>
                    </div>
                    {!isReferral && (
                      <div className="flex justify-between">
                        <span>Platform fee ({PLATFORM_FEE_PCT}%)</span>
                        <span className="text-[#a1a1aa]">{formatCredits(platformCut)} ALEO</span>
                      </div>
                    )}
                    <div className="pt-1.5 mt-1.5 border-t border-white/5 flex justify-between text-[#a1a1aa]">
                      <span>Duration</span>
                      <span>~30 days ({SUBSCRIPTION_DURATION_BLOCKS.toLocaleString()} blocks)</span>
                    </div>
                  </div>
                </div>

                {/* Privacy Mode Selector (v17) */}
                {!isReferral && (
                  <div className="p-3 rounded-[8px] bg-[#18181b] border border-white/[0.08] mb-4">
                    <p className="text-xs text-[#71717a] mb-2 font-medium">Privacy Level</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { key: 'standard' as const, label: 'Standard', desc: 'BHP256 hash' },
                        { key: 'blind' as const, label: 'Blind', desc: 'Nonce rotation' },
                        { key: 'max' as const, label: 'Maximum', desc: 'Pedersen commit' },
                      ]).map((mode) => (
                        <button
                          key={mode.key}
                          onClick={() => setPrivacyMode(mode.key)}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            privacyMode === mode.key
                              ? 'border-violet-500/40 bg-violet-500/[0.08] text-violet-300'
                              : 'border-white/[0.06] bg-transparent text-[#71717a] hover:border-white/[0.12]'
                          }`}
                        >
                          <span className="text-[11px] font-medium block">{mode.label}</span>
                          <span className="text-[9px] opacity-60 block">{mode.desc}</span>
                        </button>
                      ))}
                    </div>
                    {privacyMode === 'blind' && (
                      <p className="text-[10px] text-violet-400/70 mt-2">
                        Each subscription uses a unique identity hash. Creator cannot link renewals to the same person.
                      </p>
                    )}
                    {privacyMode === 'max' && (
                      <p className="text-[10px] text-violet-400/70 mt-2">
                        Subscriber count hidden behind Pedersen commitment. No public counter increment.
                      </p>
                    )}
                  </div>
                )}

                {/* Privacy Notice */}
                <div className="p-3 rounded-[8px] bg-[#18181b] border border-white/[0.08] mb-6 space-y-1.5">
                  <p className="text-xs text-green-400 font-medium">Zero-Knowledge Privacy</p>
                  <ul className="text-[11px] text-green-400/80 space-y-1 list-none">
                    <li>Your address is never published on-chain</li>
                    {privacyMode === 'standard' && <li>Aggregate subscriber count updates publicly</li>}
                    {privacyMode === 'blind' && <li>Identity hash rotated — unlinkable renewals</li>}
                    {privacyMode === 'max' && <li>Subscriber count stays hidden (Pedersen commitment)</li>}
                    <li>AccessPass stored privately in your wallet</li>
                    <li>Payment via credits.aleo/transfer_private</li>
                  </ul>
                </div>

                {error && (
                  <div className="p-3 rounded-[8px] bg-red-500/10 border border-red-500/15 mb-4">
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
                  className="w-full py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {txStatus !== 'idle' ? 'Processing...' : 'Subscribe Privately'}
                </button>
              </>
            ) : (
              <div className="py-2">
                {statusMessage && (
                  <div className="mb-3 p-3 rounded-[8px] bg-[#18181b] border border-white/[0.08]">
                    <p className="text-xs text-[#a1a1aa] animate-pulse">{statusMessage}</p>
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
                    <p className="text-xs text-[#a1a1aa]">
                      Your AccessPass is now in your wallet. Access for ~30 days.
                    </p>
                    <button
                      onClick={handleClose}
                      className="mt-4 px-6 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#fafafa] hover:bg-white/[0.08] transition-colors"
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
                      className="px-6 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#fafafa] hover:bg-white/[0.08] transition-colors"
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
