'use client'

import { useState, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Heart, EyeOff, Eye, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { creditsToMicrocredits, formatCredits, generatePassId } from '@/lib/utils'
import { logSubscriptionEvent } from '@/lib/logEvent'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex'
import { useBalanceCheck } from '@/hooks/useBalanceCheck'
import TransactionStatus from './TransactionStatus'
import BalanceConverter from './BalanceConverter'
import { FEES } from '@/lib/config'
import { getErrorMessage } from '@/lib/errorMessages'
import Button from './ui/Button'

interface Props {
  isOpen: boolean
  onClose: () => void
  creatorAddress: string
}

const TIP_AMOUNTS = [1, 5, 10, 25]

type TipMode = 'direct' | 'private'
type CommitPhase = 'commit' | 'reveal' | 'done'

export default function TipModal({ isOpen, onClose, creatorAddress }: Props) {
  const { tip, commitTip, revealTip, getCreditsRecords, connected } = useVeilSub()
  const { signMessage } = useWallet()
  const { startPolling, stopPolling } = useTransactionPoller()
  const {
    txStatus, setTxStatus, txId, setTxId,
    error, setError, statusMessage,
    submittingRef, handleClose, resetFlow,
  } = useTransactionFlow({ isOpen, onClose, connected, stopPolling })
  const focusTrapRef = useFocusTrap(isOpen, handleClose)
  const { checkBalance } = useBalanceCheck(getCreditsRecords)

  const [selectedAmount, setSelectedAmount] = useState(5)
  const [customAmount, setCustomAmount] = useState('')
  const [insufficientBalance, setInsufficientBalance] = useState(false)
  const [tipMode, setTipMode] = useState<TipMode>('direct')
  const [commitPhase, setCommitPhase] = useState<CommitPhase>('commit')
  const [savedSalt, setSavedSalt] = useState<string | null>(null)
  const [savedAmount, setSavedAmount] = useState<number>(0)
  const tipGroupRef = useRef<HTMLDivElement>(null)
  const modeGroupRef = useRef<HTMLDivElement>(null)
  useRovingTabIndex(tipGroupRef)
  useRovingTabIndex(modeGroupRef)

  const getTipAmount = () => {
    const parsed = parseFloat(customAmount)
    return Number.isFinite(parsed) ? parsed : selectedAmount
  }

  const handleDirectTip = async () => {
    if (submittingRef.current) return
    if (!connected) {
      setError('Connect wallet to tip privately.')
      return
    }

    submittingRef.current = true
    setError(null)
    setTxStatus('signing')
    const tipDisplay = getTipAmount()
    toast.loading(`Sending ${tipDisplay} ALEO tip...`, { id: 'tip-optimistic', duration: 60000 })

    try {
      const tipAmount = getTipAmount()
      if (tipAmount < 0.1 || tipAmount > 1000) {
        toast.dismiss('tip-optimistic')
        setError('Tip amount must be between 0.1 and 1000 ALEO.')
        setTxStatus('idle')
        submittingRef.current = false
        return
      }

      const tipMicrocredits = creditsToMicrocredits(tipAmount)

      const balanceResult = await checkBalance(tipMicrocredits)
      if (balanceResult.error) {
        toast.dismiss('tip-optimistic')
        if (balanceResult.insufficientBalance) setInsufficientBalance(true)
        setError(balanceResult.error)
        setTxStatus('idle')
        submittingRef.current = false
        return
      }
      const records = balanceResult.records
      if (!records || records.length === 0) {
        toast.dismiss('tip-optimistic')
        setError('No private credits available. Convert public credits first.')
        setTxStatus('idle')
        submittingRef.current = false
        return
      }
      const paymentRecord = records[0]

      setTxStatus('proving')
      toast.dismiss('tip-optimistic')
      const id = await tip(paymentRecord, creatorAddress, tipMicrocredits)

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
            logSubscriptionEvent(creatorAddress, 0, tipMicrocredits, result.resolvedTxId || id, wrappedSign)
            toast.success('Private tip sent—you remain anonymous')
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            setError('Commit-reveal tip failed on-chain. Verify credits balance.')
            toast.error('Tip failed')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Transaction was rejected by wallet.')
      }
    } catch (err) {
      toast.dismiss('tip-optimistic')
      setTxStatus('failed')
      setError(getErrorMessage(err instanceof Error ? err.message : 'Tip failed'))
    } finally {
      submittingRef.current = false
    }
  }

  const handleCommit = async () => {
    if (submittingRef.current) return
    if (!connected) {
      setError('Connect wallet for commit-reveal tipping.')
      return
    }

    const tipAmount = getTipAmount()
    if (tipAmount < 0.1 || tipAmount > 1000) {
      setError('Tip amount must be between 0.1 and 1000 ALEO.')
      return
    }

    submittingRef.current = true
    setError(null)
    setTxStatus('signing')
    toast.loading('Committing hidden tip...', { id: 'commit-tip', duration: 60000 })

    try {
      const tipMicrocredits = creditsToMicrocredits(tipAmount)
      const salt = generatePassId()

      setTxStatus('proving')
      toast.dismiss('commit-tip')
      const id = await commitTip(creatorAddress, tipMicrocredits, salt)

      if (id) {
        setSavedSalt(salt)
        setSavedAmount(tipMicrocredits)
        setTxId(id)
        setTxStatus('broadcasting')
        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            if (result.resolvedTxId) setTxId(result.resolvedTxId)
            setTxStatus('confirmed')
            setCommitPhase('reveal')
            toast.success('Tip committed! You can reveal it when ready.')
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            setError('Commit failed on-chain.')
            toast.error('Commit failed')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Transaction was rejected by wallet.')
      }
    } catch (err) {
      toast.dismiss('commit-tip')
      setTxStatus('failed')
      setError(getErrorMessage(err instanceof Error ? err.message : 'Commit failed'))
    } finally {
      submittingRef.current = false
    }
  }

  const handleReveal = async () => {
    if (submittingRef.current || !savedSalt) return
    if (!connected) {
      setError('Connect wallet to reveal tip amount.')
      return
    }

    submittingRef.current = true
    setError(null)
    setTxStatus('signing')
    toast.loading('Revealing tip...', { id: 'reveal-tip', duration: 60000 })

    try {
      const balanceResult = await checkBalance(savedAmount)
      if (balanceResult.error) {
        toast.dismiss('reveal-tip')
        if (balanceResult.insufficientBalance) setInsufficientBalance(true)
        setError(balanceResult.error)
        setTxStatus('idle')
        submittingRef.current = false
        return
      }
      const records = balanceResult.records
      if (!records || records.length === 0) {
        toast.dismiss('reveal-tip')
        setError('No private credits available. Convert public credits first.')
        setTxStatus('idle')
        submittingRef.current = false
        return
      }
      const paymentRecord = records[0]

      setTxStatus('proving')
      toast.dismiss('reveal-tip')
      const id = await revealTip(paymentRecord, creatorAddress, savedAmount, savedSalt)

      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')
        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            if (result.resolvedTxId) setTxId(result.resolvedTxId)
            setTxStatus('confirmed')
            setCommitPhase('done')
            toast.success('Tip revealed and sent!')
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            setError('Reveal failed on-chain.')
            toast.error('Reveal failed')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Transaction was rejected by wallet.')
      }
    } catch (err) {
      toast.dismiss('reveal-tip')
      setTxStatus('failed')
      setError(getErrorMessage(err instanceof Error ? err.message : 'Reveal failed'))
    } finally {
      submittingRef.current = false
    }
  }

  const handleModalClose = () => {
    setInsufficientBalance(false)
    setCommitPhase('commit')
    setSavedSalt(null)
    setSavedAmount(0)
    setTipMode('direct')
    handleClose()
  }

  const handleAction = () => {
    if (tipMode === 'direct') {
      handleDirectTip()
    } else if (commitPhase === 'commit') {
      handleCommit()
    } else if (commitPhase === 'reveal') {
      resetFlow()
      handleReveal()
    }
  }

  const currentFee = tipMode === 'direct'
    ? FEES.TIP
    : commitPhase === 'commit'
      ? FEES.COMMIT_TIP
      : FEES.REVEAL_TIP

  const isRevealReady = tipMode === 'private' && commitPhase === 'reveal' && txStatus === 'confirmed'

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
            aria-label="Send a private tip"
            className="w-full max-w-sm rounded-xl bg-surface-1 border border-border shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-white">
                  Send a Private Tip
                </h3>
              </div>
              <button
                onClick={handleModalClose}
                aria-label="Close tip dialog"
                className="p-1 rounded-lg hover:bg-white/[0.05] text-white/70 hover:text-white active:scale-[0.9] transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {(txStatus === 'idle' || isRevealReady) ? (
              <>
                {/* Tip Mode Toggle */}
                {commitPhase === 'commit' && (
                  <div ref={modeGroupRef} className="grid grid-cols-2 gap-1.5 mb-4" role="radiogroup" aria-label="Tip mode">
                    <button
                      role="radio"
                      aria-checked={tipMode === 'direct'}
                      tabIndex={tipMode === 'direct' ? 0 : -1}
                      onClick={() => setTipMode('direct')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        tipMode === 'direct'
                          ? 'border-violet-500/40 bg-violet-500/[0.08] text-violet-300 shadow-accent-sm'
                          : 'border-border/75 bg-transparent text-white/60 hover:border-glass-hover hover:text-white/70'
                      }`}
                    >
                      <Eye className="w-4 h-4 mx-auto mb-1" aria-hidden="true" />
                      <span className="text-[11px] font-medium block">Direct Tip</span>
                      <span className="text-[9px] text-white/60 block">Private transfer</span>
                    </button>
                    <button
                      role="radio"
                      aria-checked={tipMode === 'private'}
                      tabIndex={tipMode === 'private' ? 0 : -1}
                      onClick={() => setTipMode('private')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        tipMode === 'private'
                          ? 'border-violet-500/40 bg-violet-500/[0.08] text-violet-300 shadow-accent-sm'
                          : 'border-border/75 bg-transparent text-white/60 hover:border-glass-hover hover:text-white/70'
                      }`}
                    >
                      <EyeOff className="w-4 h-4 mx-auto mb-1" aria-hidden="true" />
                      <span className="text-[11px] font-medium block">Private Tip</span>
                      <span className="text-[9px] text-white/60 block">BHP256 commit-reveal</span>
                    </button>
                  </div>
                )}

                {/* Reveal Phase Banner */}
                {isRevealReady && (
                  <div className="p-4 rounded-xl bg-violet-500/[0.06] border border-violet-500/15 mb-4">
                    <p className="text-xs text-violet-300 font-medium mb-1">Phase 2: Reveal Your Tip</p>
                    <p className="text-[11px] text-white/70">
                      Your commitment is on-chain. Click below to reveal {formatCredits(savedAmount)} ALEO
                      and transfer it to the creator.
                    </p>
                  </div>
                )}

                {/* Amount Selection (only in commit phase) */}
                {commitPhase === 'commit' && (
                  <>
                    <div ref={tipGroupRef} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4" role="radiogroup" aria-label="Tip amount">
                      {TIP_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          role="radio"
                          aria-checked={selectedAmount === amount && !customAmount}
                          tabIndex={selectedAmount === amount && !customAmount ? 0 : -1}
                          onClick={() => { setSelectedAmount(amount); setCustomAmount('') }}
                          className={`py-3 rounded-xl text-sm font-medium transition-all ${
                            selectedAmount === amount && !customAmount
                              ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300 shadow-accent-sm'
                              : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/15'
                          }`}
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                    <div className="relative mb-4">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value)
                          if (e.target.value) setSelectedAmount(0)
                        }}
                        placeholder="Custom amount"
                        aria-label="Custom tip amount in ALEO"
                        min="0.1"
                        max="1000"
                        step="0.1"
                        className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-base pr-16"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/60">ALEO</span>
                    </div>
                    <p className="text-center text-sm text-white/70 mb-4">
                      {customAmount ? `${customAmount} ALEO credits` : `${selectedAmount} ALEO credits`}
                    </p>
                  </>
                )}

                {/* Privacy Notice */}
                <div className="p-2.5 rounded-xl bg-surface-2 border border-border mb-4 space-y-1">
                  {tipMode === 'direct' ? (
                    <>
                      <p className="text-[11px] text-green-400/80">
                        Your identity stays completely private. The creator receives payment but never knows who tipped.
                      </p>
                      <p className="text-[11px] text-white/60">
                        Est. network fee: ~{formatCredits(currentFee)} ALEO
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex gap-1.5 items-start">
                        <Shield className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
                        <div className="text-[11px] text-green-400/80 space-y-0.5">
                          <p className="font-medium text-green-400">Commit-Reveal Privacy</p>
                          {commitPhase === 'commit' ? (
                            <p>Phase 1: Commits your tip amount cryptographically. The creator sees only the commitment until you reveal.</p>
                          ) : (
                            <p>Phase 2: Verifies your commitment and transfers the payment privately.</p>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Est. network fee: ~{formatCredits(currentFee)} ALEO ({commitPhase === 'commit' ? 'commit' : 'reveal'} phase)
                      </p>
                    </>
                  )}
                </div>

                {error && (
                  <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/15 mb-4">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {insufficientBalance && (
                  <div className="mb-4">
                    <BalanceConverter
                      requiredAmount={creditsToMicrocredits(getTipAmount())}
                      onConverted={() => {
                        setInsufficientBalance(false)
                        setError(null)
                        handleAction()
                      }}
                    />
                  </div>
                )}

                <Button
                  onClick={handleAction}
                  disabled={(txStatus !== 'idle' && !isRevealReady) || !connected}
                  title={
                    !connected ? 'Connect your wallet to send a tip' :
                    (txStatus !== 'idle' && !isRevealReady) ? 'Transaction in progress...' :
                    tipMode === 'direct'
                      ? `Send ${getTipAmount()} ALEO tip privately`
                      : commitPhase === 'commit'
                        ? 'Commit hidden tip amount (BHP256 hash)'
                        : 'Reveal tip amount and send payment'
                  }
                  className="w-full"
                >
                  {tipMode === 'direct'
                    ? 'Tip Privately'
                    : commitPhase === 'commit'
                      ? 'Commit Tip (Phase 1)'
                      : 'Reveal & Send (Phase 2)'}
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
                {txStatus === 'confirmed' && tipMode === 'direct' && (
                  <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-center"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-green-400 font-medium">Private tip sent!</p>
                    <button
                      onClick={handleModalClose}
                      className="mt-4 px-8 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                    >
                      Done
                    </button>
                  </m.div>
                )}
                {txStatus === 'confirmed' && tipMode === 'private' && commitPhase === 'done' && (
                  <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-center"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-green-400 font-medium">Commit-reveal tip complete!</p>
                    <p className="text-xs text-white/70 mt-1">
                      The creator has received {formatCredits(savedAmount)} ALEO privately. Both phases verified on-chain.
                    </p>
                    <button
                      onClick={handleModalClose}
                      className="mt-4 px-8 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                    >
                      Done
                    </button>
                  </m.div>
                )}
                {txStatus === 'failed' && (
                  <div className="mt-4 text-center">
                    {error && (
                      <p role="alert" className="text-xs text-red-400 mb-4">{error}</p>
                    )}
                    <button
                      onClick={() => resetFlow()}
                      className="px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                    >
                      Retry Tip
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
