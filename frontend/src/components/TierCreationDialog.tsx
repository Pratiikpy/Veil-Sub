'use client'

import { useState, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Plus, X, Layers, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { MICROCREDITS_PER_CREDIT } from '@/lib/config'
import Button from './ui/Button'

interface TierCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  creatorAddress?: string
  onSuccess?: (tierId: number) => void
  existingTierIds?: number[]
}

export default function TierCreationDialog({ isOpen, onClose, creatorAddress, onSuccess, existingTierIds = [] }: TierCreationDialogProps) {
  const { createCustomTier, connected } = useVeilSub()
  const {
    txStatus, txId,
    error, setError, handleClose: baseHandleClose,
    setTxStatus, setTxId, submittingRef,
  } = useTransactionFlow({ isOpen, onClose })
  const focusTrapRef = useFocusTrap(isOpen, baseHandleClose)

  const [tierId, setTierId] = useState<number>(0)
  const [tierName, setTierName] = useState('')
  const [priceAleo, setPriceAleo] = useState('')

  // Map the hook's TxStatus to the simpler local status for this component
  const status = txStatus === 'idle' ? 'idle' as const
    : txStatus === 'confirmed' ? 'success' as const
    : txStatus === 'failed' ? 'error' as const
    : 'submitting' as const

  // Simple string -> field hash (deterministic number from characters)
  const hashName = (name: string): string => {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      const chr = name.charCodeAt(i)
      hash = ((hash << 5) - hash) + chr
      hash |= 0
    }
    return `${Math.abs(hash) + 1}`
  }

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return // Prevent double-submission
    if (!connected || tierId === 0 || !tierName.trim() || !priceAleo) return
    submittingRef.current = true
    setTxStatus('signing')
    setError(null)
    try {
      const parsedPrice = parseFloat(priceAleo)
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) throw new Error('Price must be greater than 0')
      const priceMicrocredits = Math.round(parsedPrice * MICROCREDITS_PER_CREDIT)
      const nameHash = hashName(tierName.trim())
      const result = await createCustomTier(tierId, priceMicrocredits, nameHash)
      setTxId(result)
      setTxStatus('confirmed')
      toast.success(`Tier #${tierId} created!`)
      // Persist tier — localStorage for instant UI update, Supabase for cross-browser sync
      if (creatorAddress) {
        try {
          const storageKey = `veilsub_creator_tiers_${creatorAddress}`
          const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
          existing[tierId] = { name: tierName.trim(), price: priceMicrocredits }
          localStorage.setItem(storageKey, JSON.stringify(existing))
        } catch { /* localStorage unavailable */ }

        // Sync to Supabase — fire-and-forget, doesn't block UI
        fetch('/api/tiers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: creatorAddress,
            tier_id: tierId,
            name: tierName.trim(),
            price_microcredits: priceMicrocredits,
          }),
        }).catch(() => { /* non-critical — localStorage already saved */ })
      }
      onSuccess?.(tierId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create tier')
      setTxStatus('failed')
      toast.error('Tier creation failed')
    } finally {
      submittingRef.current = false
    }
  }, [connected, tierId, tierName, priceAleo, createCustomTier, onSuccess, setTxStatus, setError, setTxId, submittingRef])

  const availableIds = Array.from({ length: 10 }, (_, i) => i + 1).filter(id => !existingTierIds.includes(id))

  const handleClose = () => {
    setTierId(0)
    setTierName('')
    setPriceAleo('')
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
            aria-label="Create custom tier"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-violet-500/20 p-2">
                  <Layers className="h-5 w-5 text-white/70" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-white">Create Custom Tier</h3>
              </div>
              <button onClick={handleClose} disabled={status === 'submitting'} aria-label="Close tier creation dialog" className="rounded-lg p-1 text-white/70 hover:bg-white/[0.1] hover:text-white active:scale-[0.9] transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {status === 'success' ? (
              <div className="space-y-4" role="status" aria-live="polite">
                <div className="rounded-xl bg-surface-2 border border-border p-4 text-center">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-green-400" aria-hidden="true" />
                  <p className="text-sm font-medium text-green-400">Tier #{tierId} created!</p>
                  {txId && <p className="mt-1 text-xs text-white/60 break-all">Tx: {txId.slice(0, 20)}...</p>}
                </div>
                <button onClick={handleClose} aria-label="Tier created successfully - close dialog" className="w-full rounded-lg bg-white/[0.05] border border-border py-2.5 text-sm font-medium text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-violet-400/50">
                  Done
                </button>
              </div>
            ) : status === 'error' ? (
              <div className="space-y-4">
                <div role="alert" className="rounded-xl bg-red-500/10 border border-red-500/15 p-4 text-center">
                  <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" aria-hidden="true" />
                  <p className="text-sm font-medium text-red-400">Tier creation failed</p>
                  {error && <p className="mt-1 text-xs text-white/60">{error}</p>}
                </div>
                <button
                  onClick={() => { setError(null); setTxStatus('idle') }}
                  className="w-full rounded-lg bg-white/[0.05] border border-border py-2.5 text-sm font-medium text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-violet-400/50"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tier ID Selector */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-white/70">Tier ID</label>
                  <div className="grid grid-cols-5 gap-2">
                    {availableIds.map((id) => (
                      <button
                        key={id}
                        onClick={() => setTierId(id)}
                        aria-label={`Select tier ${id}`}
                        aria-pressed={tierId === id}
                        className={`rounded-lg py-2 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-violet-400/50 ${
                          tierId === id
                            ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300 shadow-accent-sm'
                            : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/15'
                        }`}
                      >
                        #{id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tier Name */}
                <div>
                  <label htmlFor="tier-name" className="mb-2 block text-xs font-medium text-white/70">Tier Name <span className="text-red-400" aria-hidden="true">*</span></label>
                  <input
                    id="tier-name"
                    type="text"
                    value={tierName}
                    onChange={(e) => setTierName(e.target.value)}
                    placeholder="e.g. Supporter, Premium, VIP"
                    className="w-full rounded-lg bg-white/[0.05] border border-border px-4 py-2.5 text-white placeholder-subtle focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-400/50 transition-all text-base"
                    maxLength={32}
                    required
                    aria-required="true"
                  />
                </div>

                {/* Price */}
                <div>
                  <label htmlFor="tier-price" className="mb-2 block text-xs font-medium text-white/70">Price (ALEO credits) <span className="text-red-400" aria-hidden="true">*</span></label>
                  <input
                    id="tier-price"
                    type="number"
                    inputMode="decimal"
                    value={priceAleo}
                    onChange={(e) => setPriceAleo(e.target.value)}
                    placeholder="0.5"
                    step="0.001"
                    min="0.001"
                    max="1000000"
                    required
                    aria-required="true"
                    className="w-full rounded-lg bg-white/[0.05] border border-border px-4 py-2.5 text-white placeholder-subtle focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-400/50 transition-all text-base"
                  />
                  {priceAleo && (
                    <p className="mt-1 text-xs text-white/60">
                      = {Math.round(parseFloat(priceAleo || '0') * MICROCREDITS_PER_CREDIT).toLocaleString()} microcredits
                    </p>
                  )}
                </div>

                {/* Privacy note */}
                <div className="rounded-xl bg-surface-2 border border-border p-4">
                  <p className="text-xs text-green-400/80">
                    Tier price is stored on-chain. Tier name is hashed — only you know the real name.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/15 p-4">
                    <AlertCircle className="mt-1 h-4 w-4 flex-shrink-0 text-red-400" aria-hidden="true" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <Button
                  variant="accent"
                  onClick={handleSubmit}
                  disabled={status === 'submitting' || tierId === 0 || !tierName.trim() || !priceAleo || !connected}
                  title={
                    !connected ? 'Connect wallet first'
                      : tierId === 0 ? 'Select a tier ID'
                      : !tierName.trim() ? 'Enter tier name'
                      : !priceAleo ? 'Enter tier price'
                      : status === 'submitting' ? 'Creating tier...'
                      : undefined
                  }
                  className="w-full"
                >
                  {status === 'submitting' ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                      Creating tier...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create Custom Tier #{tierId || '?'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
