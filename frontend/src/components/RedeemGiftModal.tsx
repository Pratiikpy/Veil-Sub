'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Gift, X, Sparkles, AlertCircle, Shield, Loader2, Package, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'
import { getErrorMessage } from '@/lib/errorMessages'
import { parseRecordPlaintext, shortenAddress } from '@/lib/utils'

interface GiftTokenParsed {
  creator: string
  tier: number
  expiresAt: number
  giftId: string
  rawPlaintext: string
}

function parseGiftToken(plaintext: string): GiftTokenParsed | null {
  const parsed = parseRecordPlaintext(plaintext)
  const tier = parseInt(parsed.tier ?? '', 10)
  const expiresAt = parseInt(parsed.expires_at ?? '', 10)
  if (!parsed.creator || isNaN(tier) || tier < 1 || tier > 20) {
    return null
  }
  return {
    creator: parsed.creator,
    tier,
    expiresAt: isNaN(expiresAt) ? 0 : expiresAt,
    giftId: parsed.gift_id ?? '',
    rawPlaintext: plaintext,
  }
}

interface RedeemGiftModalProps {
  isOpen: boolean
  onClose: () => void
  creatorAddress: string
  onSuccess?: () => void
}

export default function RedeemGiftModal({
  isOpen,
  onClose,
  creatorAddress,
  onSuccess,
}: RedeemGiftModalProps) {
  const { redeemGift, getGiftTokens, connected } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const {
    txStatus, setTxStatus, txId, setTxId,
    error, setError, handleClose: baseHandleClose, submittingRef,
  } = useTransactionFlow({ isOpen, onClose, connected, stopPolling })
  const focusTrapRef = useFocusTrap(isOpen, baseHandleClose)

  const [giftTokens, setGiftTokens] = useState<GiftTokenParsed[]>([])
  const [selectedToken, setSelectedToken] = useState<GiftTokenParsed | null>(null)
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualPlaintext, setManualPlaintext] = useState('')
  const [manualPlaintextError, setManualPlaintextError] = useState<string | null>(null)
  const [syncingPass, setSyncingPass] = useState(false)
  const successCalledRef = useRef(false)
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  // Map the hook's TxStatus to the simpler local status
  const status = txStatus === 'idle' ? 'idle' as const
    : txStatus === 'confirmed' ? 'success' as const
    : txStatus === 'failed' ? 'error' as const
    : 'submitting' as const

  // Auto-detect gift tokens from wallet when modal opens
  useEffect(() => {
    if (!isOpen || !connected) return
    let cancelled = false
    setLoadingTokens(true)
    getGiftTokens().then((tokens) => {
      if (cancelled) return
      const parsed = tokens
        .map((t) => parseGiftToken(t))
        .filter((t): t is GiftTokenParsed => t !== null)
        // Filter to tokens for this creator
        .filter((t) => t.creator === creatorAddress)
      setGiftTokens(parsed)
      if (parsed.length === 1) {
        setSelectedToken(parsed[0])
      }
      setLoadingTokens(false)
    }).catch(() => {
      if (cancelled) return
      setGiftTokens([])
      setLoadingTokens(false)
    })
    return () => { cancelled = true }
  }, [isOpen, connected, getGiftTokens, creatorAddress])

  const handleRedeem = useCallback(async () => {
    if (submittingRef.current) return // Prevent double-submission
    if (!connected) return

    const plaintext = manualEntry
      ? manualPlaintext.trim()
      : selectedToken?.rawPlaintext

    if (!plaintext) {
      setError('Select a gift token or paste the record plaintext.')
      return
    }

    submittingRef.current = true
    setTxStatus('signing')
    setError(null)

    try {
      const result = await redeemGift(plaintext)
      if (result) {
        setTxId(result)
        setTxStatus('broadcasting')
        startPolling(result, (pollResult) => {
          if (pollResult.status === 'confirmed') {
            if (pollResult.resolvedTxId) setTxId(pollResult.resolvedTxId)
            setTxStatus('confirmed')
            setSyncingPass(true)
            toast.success('Gift redeemed! Syncing subscription pass to your wallet...')
            // Delay onSuccess slightly to allow wallet record sync.
            // Use ref guard to prevent double-fire.
            if (!successCalledRef.current) {
              successCalledRef.current = true
              const t1 = setTimeout(() => {
                onSuccess?.()
                const t2 = setTimeout(() => {
                  setSyncingPass(false)
                }, 2000)
                timeoutRefs.current.push(t2)
              }, 1000)
              timeoutRefs.current.push(t1)
            }
          } else if (pollResult.status === 'failed') {
            setTxStatus('failed')
            setError('Gift couldn\u2019t be redeemed. It may have already been used or expired.')
            toast.error('Gift couldn\u2019t be redeemed')
          } else if (pollResult.status === 'timeout') {
            // Shield Wallet delegates proving and never reports 'confirmed' —
            // the transaction IS broadcast, so treat timeout as likely success.
            if (pollResult.resolvedTxId) setTxId(pollResult.resolvedTxId)
            setTxStatus('confirmed')
            setSyncingPass(true)
            toast.success('Gift redeemed! (confirmation was slow) Syncing subscription pass...')
            if (!successCalledRef.current) {
              successCalledRef.current = true
              const t1 = setTimeout(() => {
                onSuccess?.()
                const t2 = setTimeout(() => {
                  setSyncingPass(false)
                }, 2000)
                timeoutRefs.current.push(t2)
              }, 1000)
              timeoutRefs.current.push(t1)
            }
          }
        })
      } else {
        setTxStatus('failed')
        setError('Wallet didn\u2019t approve the transaction. Try again when ready.')
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Redemption failed'
      setError(getErrorMessage(rawMsg))
      setTxStatus('failed')
    } finally {
      submittingRef.current = false
    }
  }, [connected, manualEntry, manualPlaintext, selectedToken, redeemGift, setTxStatus, setError, setTxId, startPolling, submittingRef, onSuccess])

  // Clean up pending timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout)
      timeoutRefs.current = []
    }
  }, [])

  const handleClose = () => {
    setSelectedToken(null)
    setGiftTokens([])
    setManualEntry(false)
    setManualPlaintext('')
    setManualPlaintextError(null)
    setSyncingPass(false)
    successCalledRef.current = false
    timeoutRefs.current.forEach(clearTimeout)
    timeoutRefs.current = []
    baseHandleClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
          <m.div
            ref={focusTrapRef}
            className="relative w-full max-w-md rounded-xl bg-surface-1 border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Redeem a gift subscription"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-white/[0.08] p-2">
                  <Gift className="h-5 w-5 text-white/60" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-white">Redeem Gift</h3>
              </div>
              <button
                onClick={handleClose}
                disabled={status === 'submitting'}
                aria-label="Close redeem gift modal"
                className={`rounded-lg p-1 transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none ${
                  status === 'submitting'
                    ? 'text-white/50 cursor-not-allowed'
                    : 'text-white/70 hover:bg-white/[0.1] hover:text-white active:scale-[0.9]'
                }`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {status === 'success' ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-surface-2 border border-border p-4 text-center">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-green-400" aria-hidden="true" />
                  <p className="text-sm font-medium text-green-400">Gift redeemed!</p>
                  {syncingPass ? (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 text-white/60 animate-spin" aria-hidden="true" />
                      <p className="text-xs text-white/60">Syncing subscription pass to wallet...</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-white/60">Your subscription pass is now in your wallet</p>
                  )}
                  {txId && <p className="mt-1 text-xs text-white/50 break-all font-mono">Tx: {txId.slice(0, 20)}...</p>}
                </div>
                <p className="text-xs text-white/60 text-center">What&apos;s next?</p>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/creator/${creatorAddress}`}
                    onClick={handleClose}
                    className="flex items-center justify-center gap-2 w-full rounded-lg bg-white/[0.04] border border-white/15 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    View Creator&apos;s Content
                  </Link>
                  <button
                    onClick={handleClose}
                    className="w-full rounded-lg bg-white/[0.05] border border-border py-2.5 text-sm font-medium text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Auto-detected tokens */}
                {loadingTokens ? (
                  <div className="rounded-xl bg-surface-2 border border-border p-4 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 text-white/60 animate-spin" aria-hidden="true" />
                    <span className="text-sm text-white/70">Scanning wallet for gift tokens...</span>
                  </div>
                ) : !manualEntry && giftTokens.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-white/70">
                      {giftTokens.length === 1 ? 'Gift token found in your wallet' : `${giftTokens.length} gift tokens found`}
                    </p>
                    {giftTokens.map((token, i) => (
                      <button
                        key={token.giftId || i}
                        onClick={() => setSelectedToken(token)}
                        className={`w-full text-left rounded-xl border p-4 transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none ${
                          selectedToken?.giftId === token.giftId
                            ? 'border-white/20 bg-white/[0.04] shadow-accent-sm'
                            : 'border-border bg-surface-2 hover:border-glass-hover'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-white/60 shrink-0" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-white">Tier {token.tier}</span>
                              {selectedToken?.giftId === token.giftId && (
                                <span className="text-[11px] font-medium text-white/70 bg-white/[0.04] px-2 py-0.5 rounded-full">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/60">
                              From creator {shortenAddress(token.creator)}
                            </p>
                            {token.giftId && (
                              <p className="text-xs text-white/50 font-mono mt-0.5">
                                ID: {token.giftId.length > 16 ? `${token.giftId.slice(0, 8)}...${token.giftId.slice(-6)}` : token.giftId}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setManualEntry(true)
                        setSelectedToken(null)
                      }}
                      className="text-xs text-white/50 hover:text-white/70 transition-colors"
                    >
                      Or paste token manually
                    </button>
                  </div>
                ) : !manualEntry && giftTokens.length === 0 ? (
                  <div className="space-y-2">
                    <div className="rounded-xl bg-surface-2 border border-border p-4 text-center">
                      <Package className="mx-auto mb-2 h-6 w-6 text-white/50" aria-hidden="true" />
                      <p className="text-sm text-white/60">No gift tokens found for this creator</p>
                      <p className="text-xs text-white/50 mt-1">If you received a gift, paste the token below</p>
                    </div>
                    <button
                      onClick={() => setManualEntry(true)}
                      className="w-full rounded-lg bg-white/[0.05] border border-border py-2 text-sm text-white/60 hover:bg-white/[0.08] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                    >
                      Paste Gift Token Manually
                    </button>
                  </div>
                ) : null}

                {/* Manual entry */}
                {manualEntry && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="gift-token-plaintext" className="text-xs font-medium text-white/70">
                        Gift Token Record
                      </label>
                      {giftTokens.length > 0 && (
                        <button
                          onClick={() => {
                            setManualEntry(false)
                            setManualPlaintext('')
                            setManualPlaintextError(null)
                          }}
                          className="text-xs text-white/50 hover:text-white/70 transition-colors"
                        >
                          Back to auto-detect
                        </button>
                      )}
                    </div>
                    <textarea
                      id="gift-token-plaintext"
                      value={manualPlaintext}
                      onChange={(e) => {
                        const val = e.target.value
                        setManualPlaintext(val)
                        // Real-time validation feedback
                        if (val.trim()) {
                          const parsed = parseGiftToken(val.trim())
                          if (!parsed) {
                            setManualPlaintextError('Invalid format. Expected: { owner: aleo1..., creator: aleo1..., tier: 1u8, ... }')
                          } else {
                            setManualPlaintextError(null)
                          }
                        } else {
                          setManualPlaintextError(null)
                        }
                      }}
                      placeholder='{ owner: aleo1..., creator: aleo1..., tier: 1u8, expires_at: 0u32, gifter_hash: 123field, gift_id: 456field }'
                      rows={4}
                      maxLength={2000}
                      aria-invalid={!!manualPlaintextError}
                      aria-describedby={manualPlaintextError ? 'plaintext-error' : undefined}
                      className={`w-full rounded-lg bg-white/[0.05] border px-4 py-2.5 text-white placeholder-subtle focus:outline-none focus:ring-1 transition-all text-xs font-mono resize-none ${
                        manualPlaintextError
                          ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-border focus:border-white/30 focus:ring-white/20'
                      }`}
                    />
                    {manualPlaintextError ? (
                      <p id="plaintext-error" className="mt-1.5 text-[11px] text-red-400">{manualPlaintextError}</p>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-white/50">
                        Paste the full GiftToken record plaintext from the gifter
                      </p>
                    )}
                  </div>
                )}

                {/* Privacy note */}
                <div className="rounded-xl bg-surface-2 border border-border p-4">
                  <div className="flex items-start gap-2">
                    <Shield className="mt-1 h-4 w-4 flex-shrink-0 text-green-400" aria-hidden="true" />
                    <p className="text-xs text-green-400/80">
                      Redeeming converts your gift token into a private subscription pass. The gifter&apos;s identity stays hidden via Poseidon2 hash.
                    </p>
                  </div>
                </div>

                {/* Transaction progress */}
                {status === 'submitting' && (
                  <TransactionStatus status={txStatus} txId={txId} errorMessage={error} />
                )}

                {/* Error state with retry */}
                {status === 'error' && error && (
                  <>
                    <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/15 p-4" role="alert">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" aria-hidden="true" />
                      <p className="text-xs text-red-400">{error}</p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={handleClose}
                        className="flex-1 rounded-lg bg-white/[0.05] border border-border py-2.5 text-sm font-medium text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                      >
                        Cancel
                      </button>
                      <Button
                        onClick={() => {
                          setTxStatus('idle')
                          setError(null)
                        }}
                        className="flex-1"
                      >
                        Try Again
                      </Button>
                    </div>
                  </>
                )}

                {/* Submit - show only when idle */}
                {status === 'idle' && (
                  <Button
                    variant="accent"
                    onClick={handleRedeem}
                    disabled={
                      !connected ||
                      (manualEntry ? !manualPlaintext.trim() : !selectedToken)
                    }
                    title={
                      !connected ? 'Connect wallet first'
                        : manualEntry && !manualPlaintext.trim() ? 'Paste a gift token record'
                        : !manualEntry && !selectedToken ? 'Select a gift token'
                        : undefined
                    }
                    className="w-full"
                  >
                    <Gift className="h-4 w-4" aria-hidden="true" />
                    Redeem Gift Token
                  </Button>
                )}
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
