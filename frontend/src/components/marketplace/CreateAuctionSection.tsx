'use client'

import { useState, useCallback } from 'react'
import { Plus, Gavel, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import GlassCard from '@/components/GlassCard'
import Button from '@/components/ui/Button'
import { useContractExecute } from '@/hooks/useContractExecute'
import { MICROCREDITS_PER_CREDIT } from '@/lib/config'
import { MARKETPLACE_PROGRAM_ID, MARKETPLACE_FEES } from './constants'
import { saveAuctionToStorage } from './helpers'

export default function CreateAuctionSection() {
  const { execute, connected } = useContractExecute()
  const [slotLabel, setSlotLabel] = useState('')
  const [contentSlotId, setContentSlotId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = useCallback(async () => {
    if (!connected) {
      toast.error('Please connect your wallet')
      return
    }
    if (!contentSlotId) {
      toast.error('Please enter a content slot ID')
      return
    }

    setSubmitting(true)
    try {
      const slotIdFormatted = contentSlotId.endsWith('field') ? contentSlotId : `${contentSlotId}field`
      const txId = await execute(
        'create_auction',
        [slotIdFormatted],
        MARKETPLACE_FEES.CREATE_AUCTION,
        MARKETPLACE_PROGRAM_ID
      )
      if (txId) {
        saveAuctionToStorage(slotIdFormatted, slotLabel || `Auction ${slotIdFormatted.slice(0, 8)}...`)
        toast.success('Auction created! Bidding is now open.')
        setSlotLabel('')
        setContentSlotId('')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create auction'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }, [connected, contentSlotId, slotLabel, execute])

  return (
    <GlassCard className="!p-6 sm:!p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
          <Plus className="w-5 h-5 text-violet-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Create Auction</h3>
          <p className="text-xs text-white/50">Open a sealed-bid auction for a content slot</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Auction Label</label>
          <input
            type="text"
            value={slotLabel}
            onChange={e => setSlotLabel(e.target.value)}
            placeholder="e.g. Featured Slot #1"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Content Slot ID</label>
          <input
            type="text"
            value={contentSlotId}
            onChange={e => setContentSlotId(e.target.value)}
            placeholder="Unique numeric ID (e.g. 12345)"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/20"
          />
          <p className="text-xs text-white/30 mt-1">
            The auction ID is derived on-chain from your address + this slot ID
          </p>
        </div>

        <Button
          variant="accent"
          className="w-full rounded-xl"
          onClick={handleCreate}
          disabled={submitting || !connected || !contentSlotId}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Creating auction...
            </>
          ) : (
            <>
              <Gavel className="w-4 h-4" aria-hidden="true" />
              Create Auction ({(MARKETPLACE_FEES.CREATE_AUCTION / MICROCREDITS_PER_CREDIT).toFixed(2)} ALEO)
            </>
          )}
        </Button>
      </div>
    </GlassCard>
  )
}
