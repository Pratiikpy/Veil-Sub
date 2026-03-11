'use client'

import { useState, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Shield, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { generatePassId, formatCredits } from '@/lib/utils'
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
import type { SubscriptionTier } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  tier: SubscriptionTier
  creatorAddress: string
  basePrice: number // microcredits
}

export default function SubscribeModal({
  isOpen,
  onClose,
  tier,
  creatorAddress,
  basePrice,
}: Props) {
  const { subscribe, subscribeBlind, subscribeTrial, getCreditsRecords, connected } = useVeilSub()
  const { signMessage } = useWallet()
  const { blockHeight } = useBlockHeight()
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
  const creatorCut = totalPrice - Math.floor(totalPrice / 20)
  const platformCut = Math.floor(totalPrice / 20)

  const handleSubscribe = async () => {
    if (submittingRef.current) return
    if (!connected) {
      setError('Connect wallet to subscribe privately.')
      return
    }
    if (blockHeight === null) {
      setError('Could not fetch current block height. Please try again.')
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
      setError(getErrorMessage(err instanceof Error ? err.message : 'Transaction failed'))
    } finally {
      submittingRef.current = false
    }
  }

  const handleModalClose = () => {
    setInsufficientBalance(false)
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
                aria-label="Close subscription dialog"
                className="p-1 rounded-lg hover:bg-white/[0.05] text-white/70 hover:text-white active:scale-[0.9] transition-all"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {txStatus === 'idle' ? (
              <>
                {/* Tier Info */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
                      {tier.name}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mb-2">
                    {formatCredits(totalPrice)} <span className="text-sm font-medium text-white/70">ALEO</span>
                  </p>
                  <p className="text-sm text-white/70">{tier.description}</p>
                  <ul className="mt-3 space-y-1">
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

                {/* Fee Breakdown */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                  <div className="text-xs text-white/60 space-y-1">
                    <div className="flex justify-between">
                      <span>Creator ({100 - PLATFORM_FEE_PCT}%)</span>
                      <span className="text-white/70">{formatCredits(creatorCut)} ALEO</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform fee ({PLATFORM_FEE_PCT}%)</span>
                      <span className="text-white/70">{formatCredits(platformCut)} ALEO</span>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-white/5 flex justify-between text-white/70">
                      <span>Duration</span>
                      <span>
                        {privacyMode === 'trial'
                          ? `~12 hours (${TRIAL_DURATION_BLOCKS.toLocaleString()} blocks)`
                          : `~30 days (${SUBSCRIPTION_DURATION_BLOCKS.toLocaleString()} blocks)`}
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
                        { key: 'blind' as const, label: 'Blind', desc: 'Nonce rotation' },
                        { key: 'trial' as const, label: 'Trial', desc: '~12 hrs / 20%' },
                      ]).map((mode) => (
                        <button
                          key={mode.key}
                          role="radio"
                          aria-checked={privacyMode === mode.key}
                          tabIndex={privacyMode === mode.key ? 0 : -1}
                          onClick={() => setPrivacyMode(mode.key)}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            privacyMode === mode.key
                              ? 'border-violet-500/40 bg-violet-500/[0.08] text-violet-300 shadow-accent-sm'
                              : 'border-border/75 bg-transparent text-white/60 hover:border-glass-hover hover:text-white/70'
                          }`}
                        >
                          <span className="text-[11px] font-medium block">{mode.label}</span>
                          <span className="text-[10px] text-white/50 block">{mode.desc}</span>
                        </button>
                      ))}
                    </div>
                    {privacyMode === 'standard' && (
                      <p className="text-[11px] text-violet-400/80 mt-2">
                        Zero-address finalize: creator sees aggregate count only, never your address.
                      </p>
                    )}
                    {privacyMode === 'blind' && (
                      <p className="text-[11px] text-violet-400/80 mt-2">
                        BSP nonce rotation—unlinkable renewals via Poseidon2 hashing.
                      </p>
                    )}
                    {privacyMode === 'trial' && (
                      <p className="text-[11px] text-violet-400/80 mt-2">
                        Short-term pass (~12 hours / 1,000 blocks) at 20% of tier price.
                      </p>
                    )}
                </div>

                {/* Privacy Notice */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-6 space-y-1.5">
                  <p className="text-xs text-green-400 font-medium">Zero-Knowledge Privacy</p>
                  <ul className="text-[11px] text-green-400/80 space-y-1 list-none">
                    <li>Your address is never published on-chain</li>
                    {privacyMode === 'standard' && <li>Aggregate subscriber count updates publicly</li>}
                    {privacyMode === 'blind' && <li>Identity hash rotated—unlinkable renewals</li>}
                    {privacyMode === 'trial' && <li>Short-lived pass—20% cost, ~12 hour access</li>}
                    <li>AccessPass stored privately in your wallet</li>
                    <li>Payment via credits.aleo/transfer_private</li>
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
                  onClick={handleSubscribe}
                  disabled={txStatus !== 'idle' || !connected}
                  title={
                    !connected ? 'Connect your wallet to subscribe' :
                    txStatus !== 'idle' ? 'Transaction in progress...' :
                    `Subscribe to ${tier.name} tier for ${formatCredits(totalPrice)} ALEO`
                  }
                  className="w-full"
                >
                  {txStatus !== 'idle' ? 'Processing...' : 'Subscribe Privately'}
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
                  >
                    <p className="text-green-400 font-medium mb-1">
                      Subscribed!
                    </p>
                    <p className="text-xs text-white/70">
                      Your AccessPass is now in your wallet. {privacyMode === 'trial' ? 'Trial access for ~12 hours.' : 'Access for ~30 days.'}
                    </p>
                    {txId && (
                      <p className="text-[11px] text-white/60 mt-2 font-mono break-all">
                        TX: {txId.slice(0, 16)}...{txId.slice(-8)}
                      </p>
                    )}
                    <button
                      onClick={handleModalClose}
                      className="mt-4 px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                    >
                      Done
                    </button>
                  </m.div>
                )}
                {txStatus === 'failed' && (
                  <div className="text-center">
                    <button
                      onClick={() => resetFlow()}
                      className="px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
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
