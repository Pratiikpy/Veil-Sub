'use client'

import { useState, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { generatePassId, formatCredits } from '@/lib/utils'
import { SUBSCRIPTION_DURATION_BLOCKS, PLATFORM_FEE_PCT, FEES, SECONDS_PER_BLOCK, SECONDS_PER_DAY } from '@/lib/config'
import { getErrorMessage } from '@/lib/errorMessages'
import { logSubscriptionEvent } from '@/lib/logEvent'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex'
import { useBalanceCheck } from '@/hooks/useBalanceCheck'
import { useCreatorTiers } from '@/hooks/useCreatorTiers'
import TransactionStatus from './TransactionStatus'
import BalanceConverter from './BalanceConverter'
import Button from './ui/Button'
import type { AccessPass } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  pass: AccessPass
  basePrice: number // microcredits
}

export default function RenewModal({
  isOpen,
  onClose,
  pass,
  basePrice,
}: Props) {
  const { renew, renewBlind, getCreditsRecords, connected } = useVeilSub()
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
  const { tiers: onChainTiers } = useCreatorTiers(pass.creator)

  // Build dynamic tier options from on-chain data (same pattern as CreatePostForm)
  const tierOptions: { id: number; name: string; price: number }[] = [
    { id: 1, name: 'Supporter', price: basePrice },
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
    ?? { id: selectedTierId, name: `Tier ${selectedTierId}`, price: basePrice * selectedTierId }

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
      setError('Could not sync with Aleo network. Check your connection and try again.')
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
            toast.success('Subscription renewed privately')
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            setError('Renewal failed on-chain. Verify you have enough credits and a valid subscription pass.')
            toast.error('Renewal failed')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Transaction was rejected by wallet.')
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
                aria-label="Close renewal dialog"
                className="p-1 rounded-lg hover:bg-white/[0.05] text-white/70 hover:text-white active:scale-[0.9] transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
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
                    ) : (
                      <span className="text-xs text-white/70">
                        ~{daysRemaining} days left
                      </span>
                    )}
                  </div>
                </div>

                {/* Tier Selector */}
                <div className="mb-4">
                  <p className="text-xs text-white/70 mb-2">Renew as:</p>
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
                          className={`p-2 rounded-lg border text-center transition-all ${
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
                  <p className="text-2xl font-bold text-white mt-1 mb-2">
                    {formatCredits(totalPrice)} <span className="text-sm font-medium text-white/70">ALEO</span>
                  </p>
                  <div className="text-xs text-white/60 space-y-1">
                    <div className="flex justify-between">
                      <span>Creator ({100 - PLATFORM_FEE_PCT}%)</span>
                      <span>{formatCredits(creatorCut)} ALEO</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform fee ({PLATFORM_FEE_PCT}%)</span>
                      <span>{formatCredits(platformCut)} ALEO</span>
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
                    <button
                      onClick={handleModalClose}
                      className="mt-4 px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                    >
                      Done
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
