'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Layers, Sparkles, AlertCircle } from 'lucide-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { MICROCREDITS_PER_CREDIT } from '@/lib/config'

interface TierCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (tierId: number) => void
  existingTierIds?: number[]
}

export default function TierCreationDialog({ isOpen, onClose, onSuccess, existingTierIds = [] }: TierCreationDialogProps) {
  // State: tierId (1-10), tierName (string → hashed to field), price in ALEO credits (display) converted to microcredits
  // On submit: call createCustomTier(tierId, priceInMicrocredits, nameHashField)
  // nameHash: use a simple numeric hash from the name string (since Leo has no strings, frontend hashes the name)
  // Show: tier ID selector (radio/grid of 1-10, exclude existingTierIds), name input, price input (in ALEO, show microcredits)
  // Success: show green confirmation, call onSuccess
  // Error: show red error box
  // Loading: show pulse animation, disable button

  const { createCustomTier, connected } = useVeilSub()
  const [tierId, setTierId] = useState<number>(0)
  const [tierName, setTierName] = useState('')
  const [priceAleo, setPriceAleo] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [txId, setTxId] = useState<string | null>(null)

  // Simple string → field hash (deterministic number from characters)
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
    if (!connected || tierId === 0 || !tierName.trim() || !priceAleo) return
    setStatus('submitting')
    setError('')
    try {
      const priceMicrocredits = Math.round(parseFloat(priceAleo) * MICROCREDITS_PER_CREDIT)
      if (priceMicrocredits <= 0) throw new Error('Price must be greater than 0')
      const nameHash = hashName(tierName.trim())
      const result = await createCustomTier(tierId, priceMicrocredits, nameHash)
      setTxId(result)
      setStatus('success')
      onSuccess?.(tierId)
    } catch (err: any) {
      setError(err?.message || 'Failed to create tier')
      setStatus('error')
    }
  }, [connected, tierId, tierName, priceAleo, createCustomTier, onSuccess])

  const availableIds = Array.from({ length: 10 }, (_, i) => i + 1).filter(id => !existingTierIds.includes(id))

  const handleClose = () => {
    setStatus('idle')
    setError('')
    setTierId(0)
    setTierName('')
    setPriceAleo('')
    setTxId(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            className="relative w-full max-w-md rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] shadow-2xl p-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-violet-500/20 p-2">
                  <Layers className="h-5 w-5 text-[#a1a1aa]" />
                </div>
                <h3 className="text-lg font-semibold text-white">Create Custom Tier</h3>
              </div>
              <button onClick={handleClose} className="rounded-lg p-1 text-[#a1a1aa] hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {status === 'success' ? (
              <div className="space-y-4">
                <div className="rounded-[8px] bg-[#18181b] border border-white/[0.08] p-4 text-center">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-green-400" />
                  <p className="text-sm font-medium text-green-400">Tier #{tierId} created!</p>
                  {txId && <p className="mt-1 text-xs text-[#71717a] break-all">Tx: {txId.slice(0, 20)}...</p>}
                </div>
                <button onClick={handleClose} className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] py-2.5 text-sm font-medium text-[#fafafa] hover:bg-white/[0.08]">
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tier ID Selector */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#a1a1aa]">Tier ID</label>
                  <div className="grid grid-cols-5 gap-2">
                    {availableIds.map((id) => (
                      <button
                        key={id}
                        onClick={() => setTierId(id)}
                        className={`rounded-lg py-2 text-xs font-medium transition-all ${
                          tierId === id
                            ? 'bg-violet-500/20 border border-violet-500/40 text-[#a1a1aa]'
                            : 'bg-white/5 border border-white/10 text-[#a1a1aa] hover:bg-white/10'
                        }`}
                      >
                        #{id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tier Name */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#a1a1aa]">Tier Name</label>
                  <input
                    type="text"
                    value={tierName}
                    onChange={(e) => setTierName(e.target.value)}
                    placeholder="e.g. Supporter, Premium, VIP"
                    className="w-full rounded-lg bg-[#0a0a0a] border border-white/[0.08] px-4 py-2.5 text-sm text-white placeholder:text-[#71717a] focus:border-violet-500/[0.3] focus:outline-none focus:shadow-[0_0_20px_rgba(139,92,246,0.08)] transition-all"
                    maxLength={32}
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#a1a1aa]">Price (ALEO credits)</label>
                  <input
                    type="number"
                    value={priceAleo}
                    onChange={(e) => setPriceAleo(e.target.value)}
                    placeholder="0.5"
                    step="0.1"
                    min="0.001"
                    className="w-full rounded-lg bg-[#0a0a0a] border border-white/[0.08] px-4 py-2.5 text-sm text-white placeholder:text-[#71717a] focus:border-violet-500/[0.3] focus:outline-none focus:shadow-[0_0_20px_rgba(139,92,246,0.08)] transition-all"
                  />
                  {priceAleo && (
                    <p className="mt-1 text-xs text-[#71717a]">
                      = {Math.round(parseFloat(priceAleo || '0') * MICROCREDITS_PER_CREDIT).toLocaleString()} microcredits
                    </p>
                  )}
                </div>

                {/* Privacy note */}
                <div className="rounded-[8px] bg-[#18181b] border border-white/[0.08] p-3">
                  <p className="text-xs text-green-400/80">
                    Tier price is stored on-chain. Tier name is hashed — only you know the real name.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-[8px] bg-red-500/10 border border-red-500/15 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={status === 'submitting' || tierId === 0 || !tierName.trim() || !priceAleo || !connected}
                  className="w-full rounded-lg bg-white py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {status === 'submitting' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating tier...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Tier #{tierId || '?'}
                    </span>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
