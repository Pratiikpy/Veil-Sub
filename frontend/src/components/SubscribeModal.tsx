'use client'

import { useState, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Shield, Sparkles, ArrowRight, CreditCard } from 'lucide-react'
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
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex'
import { useBalanceCheck } from '@/hooks/useBalanceCheck'
import TransactionProgress from './TransactionProgress'
import type { ProgressStep } from './TransactionProgress'
import BalanceConverter from './BalanceConverter'
import Button from './ui/Button'
import dynamic from 'next/dynamic'
const RecommendationsCard = dynamic(() => import('./RecommendationsCard'), { ssr: false })
import type { SubscriptionTier } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  tier: SubscriptionTier
  creatorAddress: string
  basePrice: number // microcredits
  onSuccess?: () => void // Called after successful subscription for cache invalidation
  availableTiers?: SubscriptionTier[] // All tiers for this creator (enables tier switching)
}

export default function SubscribeModal({
  isOpen,
  onClose,
  tier: initialTier,
  creatorAddress,
  basePrice,
  onSuccess,
  availableTiers,
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
  const { subscribe, subscribeBlind, subscribeTrial, getCreditsRecords, connected, publicKey } = useVeilSub()
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
  const [privacyMode, setPrivacyMode] = useState<'standard' | 'blind' | 'trial'>('standard')
  const privacyGroupRef = useRef<HTMLDivElement>(null)
  useRovingTabIndex(privacyGroupRef)

  // Map TxStatus → ProgressStep for the visual progress bar
  const progressStep: ProgressStep =
    txStatus === 'idle' ? 'idle'
      : txStatus === 'signing' ? 'preparing'
      : txStatus === 'proving' ? 'proving'
      : txStatus === 'broadcasting' ? 'broadcasting'
      : txStatus === 'confirmed' ? 'success'
      : txStatus === 'failed' ? 'error'
      : 'idle'

  const fullPrice = basePrice * tier.priceMultiplier
  const totalPrice = privacyMode === 'trial' ? Math.floor(fullPrice / TRIAL_PRICE_DIVISOR) : fullPrice
  const platformCut = Math.floor(totalPrice * PLATFORM_FEE_PCT / 100)
  const creatorCut = totalPrice - platformCut

  const handleSubscribe = async () => {
    if (submittingRef.current) return
    if (!connected) {
      setError('Connect wallet to subscribe privately.')
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
      const balanceResult = await checkBalance(totalPrice)
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
        : blockHeight + SUBSCRIPTION_DURATION_BLOCKS

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
            const wrappedSign = signMessage
              ? async (msg: Uint8Array) => { const r = await signMessage(msg); if (!r) throw new Error('cancelled'); return r }
              : null
            logSubscriptionEvent(creatorAddress, tier.id, totalPrice, result.resolvedTxId || id, wrappedSign)
            onSuccess?.() // Trigger cache invalidation in parent
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
            // Transaction likely confirmed — Shield Wallet doesn't report status well
            // Treat as success since the wallet already signed and broadcast
            setTxStatus('confirmed')
            toast.success('Subscribed! (confirmation was slow but your transaction was sent)')
            clearMappingCache()
            onSuccess?.()
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
    setPrivacyMode('standard') // Reset privacy mode for next open
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
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] bg-black/60 backdrop-blur-sm overflow-y-auto"
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
            className="w-full max-w-md rounded-xl bg-surface-1 border border-border shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
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
                className="p-1 rounded-lg hover:bg-white/[0.05] text-white/70 hover:text-white active:scale-[0.9] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {txStatus === 'idle' ? (
              <>
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
                      <p className="text-sm text-white/50 mb-2">{formatUsd(totalPrice)}</p>
                      <p className="text-sm text-white/70">{tier.description}</p>
                      <ul className="mt-4 space-y-1">
                        {tier.features.map((f) => (
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

                {/* Fee Breakdown */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                  <div className="text-xs text-white/60 space-y-1">
                    <div className="flex justify-between">
                      <span>Creator ({100 - PLATFORM_FEE_PCT}%)</span>
                      <span className="text-white/70">{formatCredits(creatorCut)} ALEO <span className="text-white/40">({formatUsd(creatorCut)})</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform fee ({PLATFORM_FEE_PCT}%)</span>
                      <span className="text-white/70">{formatCredits(platformCut)} ALEO <span className="text-white/40">({formatUsd(platformCut)})</span></span>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-white/5 flex justify-between text-white/70">
                      <span>Duration</span>
                      <span>
                        {privacyMode === 'trial'
                          ? '~50 minutes'
                          : '~30 days'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. network fee</span>
                      <span>~{formatCredits(
                        privacyMode === 'trial' ? FEES.SUBSCRIBE_TRIAL
                          : privacyMode === 'blind' ? FEES.SUBSCRIBE_BLIND
                          : FEES.SUBSCRIBE
                      )} ALEO</span>
                    </div>
                  </div>
                </div>

                {/* Privacy Mode Selector */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                    <p className="text-xs text-white/60 mb-2 font-medium">Privacy Level</p>
                    <div ref={privacyGroupRef} className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Privacy level">
                      {([
                        { key: 'standard' as const, label: 'Standard', desc: '30 days' },
                        { key: 'blind' as const, label: 'Blind', desc: 'Identity masked' },
                        { key: 'trial' as const, label: 'Trial', desc: '~50 min / 20%' },
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
                          <span className="text-[10px] text-white/50 block">{mode.desc}</span>
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
                        Each renewal looks different to the creator—they cannot track you across renewals.
                      </p>
                    )}
                    {privacyMode === 'trial' && (
                      <p className="text-[11px] text-white/50 mt-2">
                        Short-term pass (~50 minutes) at 20% of tier price.
                      </p>
                    )}
                </div>

                {/* Privacy Notice */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-6 space-y-2">
                  <p className="text-xs text-green-400 font-medium">Your Privacy Guaranteed</p>
                  <ul className="text-[11px] text-green-400/80 space-y-1 list-none">
                    <li>Your address is never published on-chain</li>
                    {privacyMode === 'standard' && <li>Creator sees total count, not individuals</li>}
                    {privacyMode === 'blind' && <li>Identity masked—renewals are unlinkable</li>}
                    {privacyMode === 'trial' && <li>Short-lived pass—20% cost, ~50 minute access</li>}
                    <li>Subscription pass stored privately in your wallet</li>
                    <li>Payment sent privately to creator</li>
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
                      onConverted={() => {
                        setInsufficientBalance(false)
                        setError(null)
                        handleSubscribe()
                      }}
                    />
                  </div>
                )}

                {/* Subscribe Button */}
                <Button
                  variant="accent"
                  onClick={handleSubscribe}
                  disabled={txStatus !== 'idle' || !connected}
                  title={
                    !connected ? 'Connect your wallet to subscribe' :
                    txStatus !== 'idle' ? 'Transaction in progress...' :
                    `Subscribe to ${tier.name} tier for ${formatCredits(totalPrice)} ALEO`
                  }
                  className="w-full"
                >
                  {txStatus !== 'idle' ? 'Creating subscription...' : 'Subscribe Privately'}
                </Button>
              </>
            ) : (
              <div className="py-2 space-y-4">
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
                      Your subscription pass is now in your wallet. {privacyMode === 'trial' ? 'Trial access for ~50 minutes.' : 'Access for ~30 days.'}
                    </p>
                    {txId && (
                      <p className="text-[11px] text-white/60 mt-2 font-mono break-all">
                        TX: {txId.slice(0, 16)}...{txId.slice(-8)}
                      </p>
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
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
