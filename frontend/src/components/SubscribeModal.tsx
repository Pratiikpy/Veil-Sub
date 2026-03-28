'use client'

import { useState, useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Shield, Sparkles, ArrowRight, CreditCard, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { clearMappingCache } from '@/hooks/useCreatorStats'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { generatePassId, formatCredits, formatUsd, computeWalletHash } from '@/lib/utils'
import { SUBSCRIPTION_DURATION_BLOCKS, TRIAL_DURATION_BLOCKS, TRIAL_PRICE_DIVISOR, PLATFORM_FEE_PCT, FEES } from '@/lib/config'
import { getErrorMessage } from '@/lib/errorMessages'
import { logSubscriptionEvent } from '@/lib/logEvent'
import { notifyNewSubscriber } from '@/lib/notificationTrigger'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex'
import { useBalanceCheck } from '@/hooks/useBalanceCheck'
import TransactionProgress from './TransactionProgress'
import type { ProgressStep } from './TransactionProgress'
import BalanceConverter from './BalanceConverter'
import Button from './ui/Button'
import TokenSelector from './TokenSelector'
import type { PaymentToken } from './TokenSelector'
import dynamic from 'next/dynamic'
const RecommendationsCard = dynamic(() => import('./RecommendationsCard'), { ssr: false })
import ZKReceipt from './ZKReceipt'
import { playSubscribeSuccess } from '@/lib/sounds'
import type { SubscriptionTier } from '@/types'

type DurationPeriod = 1 | 3

interface Props {
  isOpen: boolean
  onClose: () => void
  tier: SubscriptionTier
  creatorAddress: string
  basePrice: number // microcredits
  onSuccess?: () => void // Called after successful subscription for cache invalidation
  availableTiers?: SubscriptionTier[] // All tiers for this creator (enables tier switching)
  initialPeriods?: DurationPeriod // 1 = ~30 days (default), 3 = ~90 days
}

export default function SubscribeModal({
  isOpen,
  onClose,
  tier: initialTier,
  creatorAddress,
  basePrice,
  onSuccess,
  availableTiers,
  initialPeriods = 1,
}: Props) {
  const [activeTier, setActiveTier] = useState<SubscriptionTier>(initialTier)
  const [showTierPicker, setShowTierPicker] = useState(false)
  // Keep activeTier in sync when parent changes the tier prop
  const prevTierRef = useRef(initialTier)
  if (prevTierRef.current !== initialTier) {
    prevTierRef.current = initialTier
    setActiveTier(initialTier)
    setShowTierPicker(false)
  }
  const tier = activeTier
  const { subscribe, subscribeBlind, subscribeTrial, subscribeUsdcx, subscribeUsad, getCreditsRecords, getUsdcxRecords, getUsadRecords, connected, publicKey } = useVeilSub()
  const { signMessage } = useWallet()
  const { blockHeight, error: blockHeightError } = useBlockHeight()
  const { startPolling, stopPolling } = useTransactionPoller()
  const {
    txStatus, setTxStatus, txId, setTxId,
    error, setError, statusMessage,
    submittingRef, handleClose, resetFlow,
  } = useTransactionFlow({ isOpen, onClose, connected, stopPolling })
  const focusTrapRef = useFocusTrap(isOpen, handleClose)
  const { checkBalance } = useBalanceCheck(getCreditsRecords)

  const [insufficientBalance, setInsufficientBalance] = useState(false)
  const [largestRecord, setLargestRecord] = useState(0)
  const [paymentToken, setPaymentToken] = useState<PaymentToken>('credits')
  const [privacyMode, setPrivacyMode] = useState<'standard' | 'blind' | 'trial'>('standard')
  const [durationPeriod, setDurationPeriod] = useState<DurationPeriod>(initialPeriods)
  const [receiptPassId, setReceiptPassId] = useState('')
  const [receiptExpiry, setReceiptExpiry] = useState(0)
  const privacyGroupRef = useRef<HTMLDivElement>(null)
  useRovingTabIndex(privacyGroupRef)

  // Force standard privacy mode when stablecoin is selected (blind/trial require ALEO credits)
  useEffect(() => {
    if (paymentToken !== 'credits' && privacyMode !== 'standard') {
      setPrivacyMode('standard')
    }
  }, [paymentToken, privacyMode])

  // Dismiss lingering toasts when modal unmounts
  useEffect(() => {
    return () => { toast.dismiss('subscribe-optimistic') }
  }, [])

  // Map TxStatus → ProgressStep for the visual progress bar
  const progressStep: ProgressStep =
    txStatus === 'idle' ? 'idle'
      : txStatus === 'signing' ? 'preparing'
      : txStatus === 'proving' ? 'proving'
      : txStatus === 'broadcasting' ? 'broadcasting'
      : txStatus === 'confirmed' ? 'success'
      : txStatus === 'failed' ? 'error'
      : 'idle'

  const trialMinutes = Math.round((TRIAL_DURATION_BLOCKS * 3) / 60) // 3 sec per block
  // Trial mode always uses single-period pricing; extended duration applies to standard/blind only
  const effectivePeriods = privacyMode === 'trial' ? 1 : durationPeriod
  const fullPrice = basePrice * tier.priceMultiplier * effectivePeriods
  const totalPrice = privacyMode === 'trial' ? Math.floor((basePrice * tier.priceMultiplier) / TRIAL_PRICE_DIVISOR) : fullPrice
  const platformCut = Math.floor(totalPrice * PLATFORM_FEE_PCT / 100)
  const creatorCut = totalPrice - platformCut

  // Placeholder MerkleProof for stablecoin freeze list compliance.
  // TODO: Generate real MerkleProof from freeze list oracle when available.
  const PLACEHOLDER_MERKLE_PROOF = '{ path: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], indices: [false, false, false, false, false, false, false, false] }'

  const handleSubscribe = async () => {
    if (submittingRef.current) return
    if (!connected) {
      setError('Connect wallet to subscribe privately.')
      return
    }
    if (publicKey && creatorAddress.toLowerCase() === publicKey.toLowerCase()) {
      setError('You cannot subscribe to your own channel.')
      return
    }
    if (blockHeight === null) {
      setError(blockHeightError?.message ?? 'Could not sync with Aleo network. Check your connection and try again.')
      return
    }

    submittingRef.current = true
    setError(null)
    setTxStatus('signing')
    toast.loading('Preparing your private subscription...', { id: 'subscribe-optimistic', duration: 60000 })

    try {
      // For stablecoin payments, fetch token records instead of credits
      if (paymentToken === 'usdcx' || paymentToken === 'usad') {
        const fetchRecords = paymentToken === 'usdcx' ? getUsdcxRecords : getUsadRecords
        const tokenLabel = paymentToken === 'usdcx' ? 'USDCx' : 'USAD'

        let tokenRecords: string[]
        try {
          tokenRecords = await fetchRecords()
        } catch {
          toast.dismiss('subscribe-optimistic')
          setError(`Could not fetch ${tokenLabel} records. Make sure Shield Wallet is connected.`)
          setTxStatus('idle')
          submittingRef.current = false
          return
        }

        if (!tokenRecords.length) {
          toast.dismiss('subscribe-optimistic')
          setError(`No ${tokenLabel} tokens found in your wallet. You need ${tokenLabel} to pay with stablecoins.`)
          setTxStatus('idle')
          submittingRef.current = false
          return
        }

        // Find a token record with sufficient amount (u128)
        const needed = BigInt(totalPrice)
        const paymentRecord = tokenRecords.find((r) => {
          const match = r.match(/amount\s*:\s*([\d_]+)u128/)
          return match ? BigInt(match[1].replace(/_/g, '')) >= needed : false
        })

        if (!paymentRecord) {
          toast.dismiss('subscribe-optimistic')
          setError(`Insufficient ${tokenLabel} balance. Need at least ${totalPrice} micro-${tokenLabel}.`)
          setTxStatus('idle')
          submittingRef.current = false
          return
        }

        // Check public balance covers the stablecoin network fee
        try {
          const feeNeeded = paymentToken === 'usdcx' ? FEES.SUBSCRIBE_USDCX : FEES.SUBSCRIBE_USAD
          const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(publicKey ?? '')}`)
          if (pubRes.ok) {
            const pubText = await pubRes.text()
            const pubBal = parseInt((pubText ?? '').replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
            if (!isNaN(pubBal) && pubBal < feeNeeded) {
              toast.dismiss('subscribe-optimistic')
              setError(`Insufficient public balance for network fee. You need ~${formatCredits(feeNeeded)} ALEO public credits.`)
              setTxStatus('idle')
              submittingRef.current = false
              return
            }
          }
        } catch {
          toast.warning('Could not verify public balance. Transaction may fail if fees are insufficient.')
        }

        const passId = generatePassId()
        const expiresAt = blockHeight + (SUBSCRIPTION_DURATION_BLOCKS * effectivePeriods)
        setReceiptPassId(passId)
        setReceiptExpiry(expiresAt)
        setTxStatus('proving')
        toast.dismiss('subscribe-optimistic')

        const subscribeFn = paymentToken === 'usdcx' ? subscribeUsdcx : subscribeUsad
        const id = await subscribeFn(
          paymentRecord,
          creatorAddress,
          tier.id,
          String(totalPrice),
          passId,
          expiresAt,
          PLACEHOLDER_MERKLE_PROOF
        )

        if (id) {
          setTxId(id)
          setTxStatus('broadcasting')
          startPolling(id, (result) => {
            if (result.status === 'confirmed') {
              if (result.resolvedTxId) setTxId(result.resolvedTxId)
              setTxStatus('confirmed')
              playSubscribeSuccess()
              clearMappingCache()
              onSuccess?.()
              notifyNewSubscriber(creatorAddress, tier.id, result.resolvedTxId || id)
              toast.success("You're subscribed!")
            } else if (result.status === 'failed') {
              setTxStatus('failed')
              setError(`Stablecoin subscription failed. Make sure you have enough ${tokenLabel} tokens and public credits for fees.`)
              toast.error('Subscription failed')
            } else if (result.status === 'timeout') {
              if (result.resolvedTxId) setTxId(result.resolvedTxId)
              setTxStatus('confirmed')
              toast.success('Transaction likely succeeded — verify on the explorer if needed.', { duration: 6000 })
              clearMappingCache()
              onSuccess?.()
              notifyNewSubscriber(creatorAddress, tier.id, result.resolvedTxId || id)
            }
          })
        } else {
          setTxStatus('failed')
          setError('Wallet rejected or failed. Make sure you approved the transaction in your wallet.')
        }

        return // stablecoin path complete
      }

      // --- ALEO Credits path (existing logic) ---
      const balanceResult = await checkBalance(totalPrice)
      if (balanceResult.largestRecord) setLargestRecord(balanceResult.largestRecord)
      if (balanceResult.error || !balanceResult.records?.length) {
        toast.dismiss('subscribe-optimistic')
        if (balanceResult.insufficientBalance) setInsufficientBalance(true)
        setError(balanceResult.error || 'No credit records available.')
        setTxStatus('idle')
        submittingRef.current = false
        return
      }
      const records = balanceResult.records

      // Check public balance covers the network fee (paid separately from private record)
      try {
        const feeNeeded = privacyMode === 'trial' ? FEES.SUBSCRIBE_TRIAL : privacyMode === 'blind' ? FEES.SUBSCRIBE_BLIND : FEES.SUBSCRIBE
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(publicKey ?? '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt((pubText ?? '').replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < feeNeeded) {
            toast.dismiss('subscribe-optimistic')
            setError(`Insufficient public balance for network fee. You need ~${formatCredits(feeNeeded)} ALEO public credits. Get testnet credits from the Aleo faucet.`)
            setTxStatus('idle')
            submittingRef.current = false
            return
          }
        }
      } catch {
        // If we can't check, warn but allow — better than blocking on API failure
        toast.warning('Could not verify public balance. Transaction may fail if fees are insufficient.')
      }

      const passId = generatePassId()
      const expiresAt = privacyMode === 'trial'
        ? blockHeight + TRIAL_DURATION_BLOCKS
        : blockHeight + (SUBSCRIPTION_DURATION_BLOCKS * effectivePeriods)

      setReceiptPassId(passId)
      setReceiptExpiry(expiresAt)
      setTxStatus('proving')
      toast.dismiss('subscribe-optimistic')

      let id: string | null
      if (privacyMode === 'trial') {
        // Trial subscribe — ephemeral short-lived pass at reduced cost
        id = await subscribeTrial(
          records[0], creatorAddress, tier.id, totalPrice, passId, expiresAt
        )
      } else if (privacyMode === 'blind') {
        // v11: Blind subscribe — nonce-rotated identity hash
        const nonce = generatePassId() // random nonce
        id = await subscribeBlind(
          records[0], creatorAddress, nonce, tier.id, totalPrice, passId, expiresAt
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
            playSubscribeSuccess()
            const wrappedSign = signMessage
              ? async (msg: Uint8Array) => { const r = await signMessage(msg); if (!r) throw new Error('cancelled'); return r }
              : null
            logSubscriptionEvent(creatorAddress, tier.id, totalPrice, result.resolvedTxId || id, wrappedSign)
            clearMappingCache()
            onSuccess?.()
            notifyNewSubscriber(creatorAddress, tier.id, result.resolvedTxId || id)
            toast.success("You're subscribed!")
            // Start welcome sequence (fire-and-forget)
            if (publicKey) {
              (async () => {
                try {
                  const walletHash = await computeWalletHash(publicKey)
                  const timestamp = Date.now()
                  fetch('/api/welcome-sequence', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscriber: publicKey, creator: creatorAddress, walletHash, timestamp }),
                  }).catch(() => { /* non-critical */ })
                } catch { /* non-critical */ }
              })()
            }
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            const walletDetail = result.walletMessage ? ` (Wallet: ${result.walletMessage.slice(0, 150)})` : ''
            console.error('[SubscribeModal] Transaction failed on-chain:', walletDetail)
            setError(`Subscription failed.${walletDetail} Make sure you have enough public credits (~0.3 ALEO) for fees and private credits for the tier price.`)
            toast.error('Subscription failed')
          } else if (result.status === 'timeout') {
            // Transaction likely succeeded — Shield Wallet delegates proving and
            // never reports 'confirmed', but the tx IS signed and broadcast.
            if (result.resolvedTxId) setTxId(result.resolvedTxId)
            setTxStatus('confirmed')
            toast.success('Transaction likely succeeded — verify on the explorer if needed.', { duration: 6000 })
            clearMappingCache()
            onSuccess?.()
            notifyNewSubscriber(creatorAddress, tier.id, result.resolvedTxId || id)
          }
        })
      } else {
        setTxStatus('failed')
        setError('Wallet rejected or failed. Make sure you approved the transaction in your wallet.')
      }
    } catch (err) {
      toast.dismiss('subscribe-optimistic')
      setTxStatus('failed')
      const rawMsg = err instanceof Error ? err.message : String(err)
      console.error('[SubscribeModal] Transaction error:', rawMsg)
      // Show the ACTUAL error, not a generic message
      const friendlyMsg = getErrorMessage(rawMsg)
      setError(friendlyMsg !== rawMsg ? friendlyMsg : `Transaction failed: ${rawMsg.slice(0, 200)}`)
    } finally {
      submittingRef.current = false
    }
  }

  const handleModalClose = () => {
    setInsufficientBalance(false)
    setPaymentToken('credits')
    setPrivacyMode('standard') // Reset privacy mode for next open
    setDurationPeriod(initialPeriods) // Reset duration for next open
    setShowTierPicker(false)
    handleClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] sm:pt-[10vh] bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={handleModalClose}
        >
          <m.div
            ref={focusTrapRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Subscribe to creator"
            className="w-[calc(100vw-2rem)] max-w-md rounded-2xl bg-surface-1 border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-white/70" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-white">
                  Private Subscription
                </h3>
              </div>
              <button
                onClick={handleModalClose}
                disabled={txStatus !== 'idle' && txStatus !== 'confirmed' && txStatus !== 'failed'}
                aria-label="Close subscription dialog"
                title={txStatus !== 'idle' && txStatus !== 'confirmed' && txStatus !== 'failed' ? 'Transaction in progress - please wait' : 'Close dialog'}
                className="p-2.5 rounded-lg hover:bg-white/[0.05] text-white/70 hover:text-white active:scale-[0.9] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <AnimatePresence mode="wait">
            {txStatus === 'idle' ? (
              <m.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {/* Tier Picker (shown when user clicks "Change tier") */}
                {showTierPicker && availableTiers && availableTiers.length > 1 ? (
                  <div className="mb-4">
                    <p className="text-xs text-white/60 uppercase tracking-wider font-medium mb-2">Choose a tier</p>
                    <div className="space-y-2">
                      {availableTiers.map((t) => {
                        const tPrice = basePrice * t.priceMultiplier
                        const isSelected = t.id === tier.id
                        return (
                          <button
                            key={t.id}
                            onClick={() => { setActiveTier(t); setShowTierPicker(false) }}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                              isSelected
                                ? 'border-white/20 bg-white/[0.06]'
                                : 'border-border bg-surface-2 hover:border-white/15 hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-sm font-medium text-white">{t.name}</span>
                              <span className="text-sm font-bold text-white">
                                {formatCredits(tPrice)} <span className="text-xs font-normal text-white/60">ALEO</span>
                              </span>
                            </div>
                            {t.description && (
                              <p className="text-xs text-white/50">{t.description}</p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Tier Info */}
                    <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
                          {tier.name}
                        </span>
                        {availableTiers && availableTiers.length > 1 && (
                          <button
                            onClick={() => setShowTierPicker(true)}
                            className="text-xs text-white/50 hover:text-white/80 transition-colors underline underline-offset-2"
                          >
                            Change tier
                          </button>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-white mb-1">
                        {formatCredits(totalPrice)} <span className="text-sm font-medium text-white/70">ALEO</span>
                      </p>
                      <p className="text-sm text-white/50 mb-1">{formatUsd(totalPrice)}</p>
                      <p className="text-[11px] text-white/50">
                        {100 - PLATFORM_FEE_PCT}% to creator · {PLATFORM_FEE_PCT}% platform fee
                      </p>
                      <p className="text-sm text-white/70 mt-2">{tier.description}</p>
                      <ul className="mt-4 space-y-1">
                        {(tier.features.length > 0 ? tier.features : ['Access to all tier-gated content']).map((f) => (
                          <li
                            key={f}
                            className="text-xs text-white/70 flex items-center gap-2"
                          >
                            <Sparkles className="w-3 h-3 text-white/70" aria-hidden="true" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Duration Selector — not available for trial mode */}
                {privacyMode !== 'trial' && (
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                  <p className="text-xs text-white/60 mb-2 font-medium">Duration</p>
                  <div className="relative inline-flex items-center rounded-full bg-white/[0.03] border border-border p-0.5">
                    <m.div
                      className="absolute top-0.5 bottom-0.5 rounded-full bg-white/[0.08] border border-white/10"
                      initial={false}
                      animate={{
                        left: durationPeriod === 1 ? 2 : '50%',
                        right: durationPeriod === 3 ? 2 : '50%',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                    <button
                      onClick={() => setDurationPeriod(1)}
                      className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        durationPeriod === 1 ? 'text-white' : 'text-white/50 hover:text-white/70'
                      }`}
                    >
                      ~30 days
                    </button>
                    <button
                      onClick={() => setDurationPeriod(3)}
                      className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                        durationPeriod === 3 ? 'text-white' : 'text-white/50 hover:text-white/70'
                      }`}
                    >
                      ~90 days
                      <span className="px-1 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-[9px] font-semibold text-green-400 leading-none">
                        3 mo
                      </span>
                    </button>
                  </div>
                  {durationPeriod === 3 && (
                    <m.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-[11px] text-green-400/70 mt-2"
                    >
                      One transaction for 3 months of access — no renewal hassle.
                    </m.p>
                  )}
                </div>
                )}

                {/* Token Selector */}
                <TokenSelector
                  selected={paymentToken}
                  onChange={setPaymentToken}
                  disabled={txStatus !== 'idle'}
                />

                {/* Fee Breakdown */}
                <p className="text-[11px] text-white/60 mb-2">
                  Includes {PLATFORM_FEE_PCT}% platform fee &middot; {formatCredits(creatorCut)} {paymentToken === 'credits' ? 'ALEO' : paymentToken === 'usdcx' ? 'USDCx' : 'USAD'} goes to creator
                </p>
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                  <div className="text-xs text-white/60 space-y-1">
                    <div className="flex justify-between">
                      <span>Creator ({100 - PLATFORM_FEE_PCT}%)</span>
                      <span className="text-white/70">{formatCredits(creatorCut)} ALEO <span className="text-white/50">({formatUsd(creatorCut)})</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform fee ({PLATFORM_FEE_PCT}%)</span>
                      <span className="text-white/70">{formatCredits(platformCut)} ALEO <span className="text-white/50">({formatUsd(platformCut)})</span></span>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-white/5">
                      <div className="flex justify-between text-white/70">
                        <span>Duration</span>
                        <span>
                          {privacyMode === 'trial'
                            ? `~${trialMinutes} minutes`
                            : effectivePeriods === 3 ? '~90 days (3 months)' : '~30 days'}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 mt-0.5">No auto-renewal — you control when to renew.</p>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. network fee</span>
                      <span>~{formatCredits(
                        paymentToken === 'usdcx' ? FEES.SUBSCRIBE_USDCX
                          : paymentToken === 'usad' ? FEES.SUBSCRIBE_USAD
                          : privacyMode === 'trial' ? FEES.SUBSCRIBE_TRIAL
                          : privacyMode === 'blind' ? FEES.SUBSCRIBE_BLIND
                          : FEES.SUBSCRIBE
                      )} ALEO</span>
                    </div>
                  </div>
                </div>

                {/* Privacy Mode Selector — only for ALEO credits; stablecoins use standard mode */}
                {paymentToken === 'credits' ? (
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                    <p className="text-xs text-white/60 mb-2 font-medium">Privacy Level</p>
                    <div ref={privacyGroupRef} className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Privacy level">
                      {([
                        { key: 'standard' as const, label: 'Standard', desc: '30 days' },
                        { key: 'blind' as const, label: 'Enhanced', desc: 'Maximum privacy \u2014 unlinkable renewals' },
                        { key: 'trial' as const, label: 'Trial', desc: `${trialMinutes} min \u00b7 20% price` },
                      ]).map((mode) => (
                        <button
                          key={mode.key}
                          role="radio"
                          aria-checked={privacyMode === mode.key}
                          tabIndex={privacyMode === mode.key ? 0 : -1}
                          onClick={() => setPrivacyMode(mode.key)}
                          className={`p-2 rounded-lg border text-center transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none ${
                            privacyMode === mode.key
                              ? 'border-white/20 bg-white/[0.04] text-white/70 shadow-accent-sm'
                              : 'border-border/75 bg-transparent text-white/60 hover:border-glass-hover hover:text-white/70'
                          }`}
                        >
                          <span className="text-[11px] font-medium block">{mode.label}</span>
                          <span className="text-[11px] text-white/50 block">{mode.desc}</span>
                        </button>
                      ))}
                    </div>
                    {privacyMode === 'standard' && (
                      <p className="text-[11px] text-white/50 mt-2">
                        Creator sees total subscriber count only—never which individuals subscribed.
                      </p>
                    )}
                    {privacyMode === 'blind' && (
                      <p className="text-[11px] text-white/50 mt-2">
                        Maximum privacy — each renewal uses a fresh anonymous identity, so no one can track your subscription history across periods.
                      </p>
                    )}
                    {privacyMode === 'trial' && (
                      <p className="text-[11px] text-white/50 mt-2">
                        Try risk-free — short-term access at 20% price. Auto-expires with zero trace. One trial per creator.
                      </p>
                    )}
                    <a href="/privacy" target="_blank" className="text-[11px] text-violet-400 hover:text-violet-300 mt-2 inline-block transition-colors">Learn about our privacy modes &rarr;</a>
                </div>
                ) : (
                <div className="p-3 rounded-xl bg-surface-2 border border-border mb-4">
                  <p className="text-[11px] text-white/50">
                    Stablecoin subscriptions use standard privacy mode (30 days). Blind and trial modes are available with ALEO credits.
                  </p>
                </div>
                )}

                {/* Privacy Notice */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-6 space-y-2">
                  <p className="text-xs text-green-400 font-medium">Your Privacy Guaranteed</p>
                  <ul className="text-[11px] text-green-400/80 space-y-1 list-none">
                    <li>Your address is never published on-chain</li>
                    {privacyMode === 'standard' && <li>Creator sees total count, not individuals</li>}
                    {privacyMode === 'blind' && <li>Identity masked — renewals are unlinkable</li>}
                    {privacyMode === 'trial' && <li>Short-lived pass — 20% cost, ~{trialMinutes} minute access</li>}
                    <li>Subscription pass stored privately in your wallet</li>
                    <li>Payment sent privately to creator</li>
                    <li>No auto-renewal — cancel anytime by simply not renewing</li>
                  </ul>
                </div>

                {error && (
                  <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/15 mb-4">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {insufficientBalance && (
                  <div className="mb-4">
                    <BalanceConverter
                      requiredAmount={totalPrice}
                      largestRecord={largestRecord}
                      onConverted={() => {
                        setInsufficientBalance(false)
                        setError(null)
                        handleSubscribe()
                      }}
                    />
                  </div>
                )}

                <p className="text-[11px] text-white/50 text-center mb-2">Blockchain transactions are final and non-refundable.</p>

                {/* Subscribe Button */}
                <Button
                  variant="accent"
                  onClick={handleSubscribe}
                  disabled={txStatus !== 'idle' || !connected}
                  title={
                    !connected ? 'Connect your wallet to subscribe' :
                    txStatus !== 'idle' ? 'Transaction in progress...' :
                    paymentToken === 'credits'
                      ? `Subscribe to ${tier.name} tier for ${formatCredits(totalPrice)} ALEO`
                      : `Subscribe to ${tier.name} tier with ${paymentToken === 'usdcx' ? 'USDCx' : 'USAD'}`
                  }
                  className="w-full"
                >
                  {txStatus !== 'idle'
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2 inline" />Processing...</>
                    : paymentToken === 'credits'
                      ? effectivePeriods === 3 ? 'Subscribe for 3 Months' : 'Subscribe Privately'
                      : `Subscribe with ${paymentToken === 'usdcx' ? 'USDCx' : 'USAD'}`}
                </Button>
              </m.div>
            ) : (
              <m.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="py-2 space-y-4">
                <TransactionProgress
                  currentStep={progressStep}
                  error={error ?? undefined}
                />
                {txStatus === 'confirmed' && (
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-green-400 font-medium mb-1">
                      Subscribed successfully!
                    </p>
                    <p className="text-xs text-white/70">
                      Your subscription pass is now in your wallet. {privacyMode === 'trial' ? `Trial access for ~${trialMinutes} minutes.` : effectivePeriods === 3 ? 'Access for ~90 days (3 months).' : 'Access for ~30 days.'}
                    </p>
                    {txId && (
                      <ZKReceipt
                        creatorHash={creatorAddress}
                        tier={`Tier ${tier.id}`}
                        expiresAt={receiptExpiry}
                        txId={txId}
                        passId={receiptPassId}
                      />
                    )}

                    {/* What's Next guidance */}
                    <div className="mt-5 p-4 rounded-xl bg-surface-2 border border-border text-left">
                      <p className="text-xs font-medium text-white/80 mb-3">What&apos;s Next?</p>
                      <p className="text-[11px] text-white/55 mb-3">
                        Visit the creator&apos;s page to unlock gated content, or manage all your subscriptions from one place.
                      </p>
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/creator/${creatorAddress}`}
                          onClick={handleModalClose}
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white/[0.06] border border-white/12 text-sm font-medium text-white/70 hover:bg-white/12 transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                        >
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          View Creator&apos;s Content
                        </Link>
                        <Link
                          href="/subscriptions"
                          onClick={handleModalClose}
                          className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-border text-xs text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                        >
                          <CreditCard className="w-3 h-3" aria-hidden="true" />
                          Manage Subscriptions
                        </Link>
                      </div>
                    </div>

                    {/* Creator Recommendations Loop */}
                    <div className="mt-4 text-left">
                      <RecommendationsCard
                        creatorAddress={creatorAddress}
                        compact
                        maxItems={3}
                      />
                    </div>

                    <button
                      onClick={handleModalClose}
                      className="mt-3 px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                    >
                      Close
                    </button>
                  </m.div>
                )}
                {txStatus === 'failed' && (
                  <div className="text-center">
                    <button
                      onClick={() => resetFlow()}
                      className="px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                    >
                      Retry Subscription
                    </button>
                  </div>
                )}
              </m.div>
            )}
            </AnimatePresence>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
