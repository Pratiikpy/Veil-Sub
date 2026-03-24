'use client'

import React, { useState, useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, ArrowRight, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { generatePassId, formatCredits, formatUsd } from '@/lib/utils'
import { SUBSCRIPTION_DURATION_BLOCKS, PLATFORM_FEE_PCT, FEES, SECONDS_PER_BLOCK, SECONDS_PER_DAY } from '@/lib/config'
import { getErrorMessage } from '@/lib/errorMessages'
import { logSubscriptionEvent } from '@/lib/logEvent'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex'
import { useBalanceCheck } from '@/hooks/useBalanceCheck'
import { useCreatorTiers } from '@/hooks/useCreatorTiers'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import TransactionStatus from './TransactionStatus'
import BalanceConverter from './BalanceConverter'
import Button from './ui/Button'
import type { AccessPass } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  pass: AccessPass
  basePrice?: number // microcredits — optional fallback, component fetches from on-chain if not provided
  onSuccess?: () => void
}

export default function RenewModal({
  isOpen,
  onClose,
  pass,
  basePrice,
  onSuccess,
}: Props) {
  const { renew, renewBlind, getCreditsRecords, connected } = useVeilSub()
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
  const { tiers: onChainTiers, loading: tiersLoading, error: tiersError } = useCreatorTiers(pass.creator)
  const { fetchCreatorStats } = useCreatorStats()
  const [fetchedBasePrice, setFetchedBasePrice] = useState<number | null>(null)

  // Fetch base price from on-chain if not provided via prop
  // This ensures correct pricing even when RenewModal is opened from subscriptions page
  useEffect(() => {
    if (isOpen && pass.creator) {
      fetchCreatorStats(pass.creator).then((stats) => {
        if (stats.tierPrice !== null) {
          setFetchedBasePrice(stats.tierPrice)
        }
      }).catch(() => {
        // Fallback to prop or 0 if fetch fails
      })
    }
  }, [isOpen, pass.creator, fetchCreatorStats])

  // Use fetched price, fall back to prop, then 0
  const effectiveBasePrice = fetchedBasePrice ?? basePrice ?? 0

  // Build dynamic tier options from on-chain data (same pattern as CreatePostForm)
  const tierOptions: { id: number; name: string; price: number }[] = [
    { id: 1, name: 'Supporter', price: effectiveBasePrice },
    ...Object.entries(onChainTiers)
      .filter(([, t]) => t.price > 0)
      .map(([id, t]) => ({ id: Number(id), name: t.name, price: t.price }))
      .sort((a, b) => a.id - b.id),
  ]

  const [selectedTierId, setSelectedTierId] = useState<number>(pass.tier)
  const [privacyMode, setPrivacyMode] = useState<'standard' | 'blind'>('standard')
  const [insufficientBalance, setInsufficientBalance] = useState(false)
  const tierGroupRef = useRef<HTMLDivElement>(null)
  const privacyGroupRef = useRef<HTMLDivElement>(null)
  useRovingTabIndex(tierGroupRef)
  useRovingTabIndex(privacyGroupRef)

  // Derive selected option — fall back to absolute price estimate if not in options yet
  const selectedOption = tierOptions.find(t => t.id === selectedTierId)
    ?? { id: selectedTierId, name: `Tier ${selectedTierId}`, price: effectiveBasePrice * selectedTierId }

  const totalPrice = selectedOption.price
  const platformFeeDiv = 100 / PLATFORM_FEE_PCT
  const platformCut = Math.floor(totalPrice / platformFeeDiv)
  const creatorCut = totalPrice - platformCut

  // Pass tier name for display in "Current pass" section
  const passTierName = onChainTiers[pass.tier]?.name
    ?? (pass.tier === 1 ? 'Supporter' : `Tier ${pass.tier}`)

  const isExpired = blockHeight !== null && pass.expiresAt <= blockHeight
  const blocksRemaining = blockHeight !== null ? Math.max(0, pass.expiresAt - blockHeight) : null
  const daysRemaining = blocksRemaining !== null ? Math.round((blocksRemaining * SECONDS_PER_BLOCK) / SECONDS_PER_DAY) : null

  const handleRenew = async () => {
    if (submittingRef.current) return
    if (!connected) {
      setError('Connect wallet to renew your subscription privately.')
      return
    }
    if (blockHeight === null) {
      setError(blockHeightError?.message ?? 'Could not sync with Aleo network. Check your connection and try again.')
      return
    }

    submittingRef.current = true
    setError(null)
    setTxStatus('signing')

    try {
      const balanceResult = await checkBalance(totalPrice)
      if (balanceResult.error) {
        if (balanceResult.insufficientBalance) setInsufficientBalance(true)
        setError(balanceResult.error)
        setTxStatus('idle')
        submittingRef.current = false
        return
      }
      const records = balanceResult.records
      if (!records || records.length === 0) {
        setError('No private credits available. Convert public credits first.')
        setTxStatus('idle')
        submittingRef.current = false
        return
      }

      const paymentRecord = records[0]
      const newPassId = generatePassId()
      const newExpiresAt = blockHeight + SUBSCRIPTION_DURATION_BLOCKS

      setTxStatus('proving')

      let id: string | null
      if (privacyMode === 'blind') {
        const nonce = generatePassId()
        id = await renewBlind(
          pass.rawPlaintext,
          paymentRecord,
          nonce,
          selectedTierId,
          totalPrice,
          newPassId,
          newExpiresAt
        )
      } else {
        id = await renew(
          pass.rawPlaintext,
          paymentRecord,
          selectedTierId,
          totalPrice,
          newPassId,
          newExpiresAt
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
            logSubscriptionEvent(pass.creator, selectedTierId, totalPrice, result.resolvedTxId || id, wrappedSign)
            toast.success('Subscription renewed!')
            onSuccess?.()
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            setError('Renewal couldn\u2019t be completed. Check that you have enough credits and your subscription pass is still valid.')
            toast.error('Renewal couldn\u2019t be completed')
          } else if (result.status === 'timeout') {
            setTxStatus('failed')
            setError('Transaction is still processing. Check your wallet or refresh the page to see if it completed.')
            toast.warning('Transaction taking longer than expected')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Wallet didn\u2019t approve the transaction. Try again when ready.')
      }
    } catch (err) {
      setTxStatus('failed')
      setError(getErrorMessage(err instanceof Error ? err.message : 'Renewal failed'))
    } finally {
      submittingRef.current = false
    }
  }

  const handleModalClose = () => {
    setInsufficientBalance(false)
    setSelectedTierId(pass.tier) // Reset to original tier
    setPrivacyMode('standard') // Reset privacy mode
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
            aria-label="Renew subscription"
            className="w-full max-w-md rounded-xl bg-surface-1 border border-border shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-white/70" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-white">
                  Renew Subscription
                </h3>
              </div>
              <button
                onClick={handleModalClose}
                disabled={txStatus !== 'idle' && txStatus !== 'confirmed' && txStatus !== 'failed'}
                aria-label="Close renewal dialog"
                title={txStatus !== 'idle' && txStatus !== 'confirmed' && txStatus !== 'failed' ? 'Transaction in progress - please wait' : 'Close dialog'}
                className="p-1 rounded-lg hover:bg-white/[0.05] text-white/70 hover:text-white active:scale-[0.9] transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {txStatus === 'idle' ? (
              <>
                {/* Current Status */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                  <p className="text-xs text-white/60 mb-1">Current pass</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{passTierName}</span>
                    {isExpired ? (
                      <span className="px-3 py-1 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                        Expired
                      </span>
                    ) : daysRemaining !== null ? (
                      <span className="text-xs text-white/70">
                        ~{daysRemaining} days left
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Tier Selector */}
                <div className="mb-4">
                  <p className="text-xs text-white/70 mb-2">Renew as:</p>
                  {tiersLoading && (
                    <p className="text-xs text-white/50 mb-2">Loading tier options...</p>
                  )}
                  {tiersError && (
                    <p className="text-xs text-yellow-400/80 mb-2">Could not load custom tiers. Showing default tier only.</p>
                  )}
                  <div ref={tierGroupRef} className="flex flex-wrap gap-2" role="radiogroup" aria-label="Subscription tier">
                    {tierOptions.map((tier) => (
                      <button
                        key={tier.id}
                        role="radio"
                        aria-checked={selectedTierId === tier.id}
                        tabIndex={selectedTierId === tier.id ? 0 : -1}
                        onClick={() => setSelectedTierId(tier.id)}
                        className={`py-2.5 px-4 rounded-lg text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-0 ${
                          selectedTierId === tier.id
                            ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300 shadow-accent-sm'
                            : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/15'
                        }`}
                      >
                        {tier.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy Mode Selector */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                    <p className="text-xs text-white/60 mb-2 font-medium">Privacy Level</p>
                    <div ref={privacyGroupRef} className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Privacy level">
                      {([
                        { key: 'standard' as const, label: 'Standard', desc: 'Secure renewal' },
                        { key: 'blind' as const, label: 'Blind', desc: 'Identity masked' },
                      ]).map((mode) => (
                        <button
                          key={mode.key}
                          role="radio"
                          aria-checked={privacyMode === mode.key}
                          tabIndex={privacyMode === mode.key ? 0 : -1}
                          onClick={() => setPrivacyMode(mode.key)}
                          className={`p-2 rounded-lg border text-center transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none ${
                            privacyMode === mode.key
                              ? 'border-violet-500/40 bg-violet-500/[0.08] text-violet-300 shadow-accent-sm'
                              : 'border-border/75 bg-transparent text-white/60 hover:border-glass-hover hover:text-white/70'
                          }`}
                        >
                          <span className="text-[11px] font-medium block">{mode.label}</span>
                          <span className="text-[9px] text-white/60 block">{mode.desc}</span>
                        </button>
                      ))}
                    </div>
                    {privacyMode === 'blind' && (
                      <p className="text-[10px] text-violet-400/70 mt-2">
                        Each renewal looks different to the creator—they cannot track you across renewals.
                      </p>
                    )}
                </div>

                {/* Payment Breakdown */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                  <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
                    {selectedOption.name}
                  </span>
                  <p className="text-2xl font-bold text-white mt-1 mb-1">
                    {formatCredits(totalPrice)} <span className="text-sm font-medium text-white/70">ALEO</span>
                  </p>
                  <p className="text-sm text-white/50 mb-2">{formatUsd(totalPrice)}</p>
                  <div className="text-xs text-white/60 space-y-1">
                    <div className="flex justify-between">
                      <span>Creator ({100 - PLATFORM_FEE_PCT}%)</span>
                      <span>{formatCredits(creatorCut)} ALEO <span className="text-white/40">({formatUsd(creatorCut)})</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform fee ({PLATFORM_FEE_PCT}%)</span>
                      <span>{formatCredits(platformCut)} ALEO <span className="text-white/40">({formatUsd(platformCut)})</span></span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 text-xs text-white/70 space-y-1">
                    <div>Access for ~30 days</div>
                    <div>Est. network fee: ~{formatCredits(privacyMode === 'standard' ? FEES.RENEW : FEES.RENEW_BLIND)} ALEO</div>
                  </div>
                </div>

                {/* Privacy Notice */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4 space-y-2">
                  <p className="text-xs text-green-400 font-medium">Your Privacy Guaranteed</p>
                  <ul className="text-[11px] text-green-400/80 space-y-1 list-none">
                    <li>Your address is never published on-chain</li>
                    {privacyMode === 'standard' && <li>Aggregate subscriber count updates publicly</li>}
                    {privacyMode === 'blind' && <li>Identity hash rotated—unlinkable renewals</li>}
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
                        handleRenew()
                      }}
                    />
                  </div>
                )}

                <Button
                  variant="accent"
                  onClick={handleRenew}
                  disabled={txStatus !== 'idle' || !connected}
                  title={
                    !connected ? 'Connect your wallet to renew subscription' :
                    txStatus !== 'idle' ? 'Transaction in progress...' :
                    `Renew subscription for ${formatCredits(totalPrice)} ALEO`
                  }
                  className="w-full"
                >
                  Renew Privately
                </Button>
              </>
            ) : (
              <div className="py-2">
                {statusMessage && (
                  <div className="mb-4 p-4 rounded-xl bg-surface-2 border border-border">
                    <p className="text-xs text-white/70 animate-pulse">{statusMessage}</p>
                  </div>
                )}
                <TransactionStatus status={txStatus} txId={txId} errorMessage={error} />
                {txStatus === 'confirmed' && (
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-green-400 font-medium mb-1">Renewal Confirmed</p>
                    <p className="text-xs text-white/60">
                      Your subscription is renewed and saved privately to your wallet.
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
                        Your access continues seamlessly. Visit the creator&apos;s page to enjoy their content.
                      </p>
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/creator/${pass.creator}`}
                          onClick={handleModalClose}
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-sm font-medium text-violet-300 hover:bg-violet-500/25 transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
                        >
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          View Creator&apos;s Content
                        </Link>
                        <Link
                          href="/subscriptions"
                          onClick={handleModalClose}
                          className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-border text-xs text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
                        >
                          <CreditCard className="w-3 h-3" aria-hidden="true" />
                          Manage Subscriptions
                        </Link>
                      </div>
                    </div>

                    <button
                      onClick={handleModalClose}
                      className="mt-3 px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
                    >
                      Close
                    </button>
                  </m.div>
                )}
                {txStatus === 'failed' && (
                  <div className="mt-4 text-center">
                    {error && <p role="alert" className="text-xs text-red-400 mb-4">{error}</p>}
                    <button
                      onClick={() => resetFlow()}
                      className="px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                    >
                      Retry Renewal
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
