'use client'

import { useState, useCallback } from 'react'
import { Lock, EyeOff, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import GlassCard from '@/components/GlassCard'
import Button from '@/components/ui/Button'
import { useContractExecute } from '@/hooks/useContractExecute'
import { MICROCREDITS_PER_CREDIT } from '@/lib/config'
import { MARKETPLACE_PROGRAM_ID, MARKETPLACE_FEES } from './constants'
import { generateSalt, saveBidToStorage } from './helpers'
import { CopyButton } from './SharedComponents'

export default function PlaceBidSection() {
  const { execute, connected } = useContractExecute()
  const [auctionId, setAuctionId] = useState('')
  const [amount, setAmount] = useState('')
  const [salt] = useState(() => generateSalt())
  const [submitting, setSubmitting] = useState(false)

  const handleBid = useCallback(async () => {
    if (!connected) {
      toast.error('Please connect your wallet')
      return
    }
    const amountNum = parseInt(amount, 10)
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid bid amount')
      return
    }
    if (!auctionId) {
      toast.error('Please enter an auction ID')
      return
    }

    setSubmitting(true)
    try {
      const auctionIdFormatted = auctionId.endsWith('field') ? auctionId : `${auctionId}field`

      const txId = await execute(
        'place_sealed_bid',
        [auctionIdFormatted, `${amountNum}u64`, salt],
        MARKETPLACE_FEES.PLACE_BID,
        MARKETPLACE_PROGRAM_ID
      )

      if (txId) {
        saveBidToStorage({
          auctionId: auctionIdFormatted,
          amount: amountNum,
          salt,
          commitment: txId,
          timestamp: Date.now(),
        })
        toast.success(
          'Sealed bid placed! Your bid amount is hidden on-chain. Save your salt for the reveal phase.',
          { duration: 8000 }
        )
        setAuctionId('')
        setAmount('')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to place bid'
      if (msg.includes('not open')) {
        toast.error('This auction is not open for bidding.')
      } else if (msg.includes('Already placed')) {
        toast.error('You have already placed a bid in this auction.')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }, [connected, amount, auctionId, salt, execute])

  return (
    <GlassCard className="!p-6 sm:!p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
          <Lock className="w-5 h-5 text-blue-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Place Sealed Bid</h3>
          <p className="text-xs text-white/50">Submit a BHP256-committed bid (amount hidden)</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Auction ID</label>
          <input
            type="text"
            value={auctionId}
            onChange={e => setAuctionId(e.target.value)}
            placeholder="Auction ID (field)"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Bid Amount</label>
          <div className="relative">
            <input
              type="number"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Amount in microcredits"
              className="w-full px-4 py-2.5 pr-16 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/50"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/60">u64</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Salt <span className="text-white/60">(auto-generated, saved locally)</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/60 font-mono truncate">
              {salt.slice(0, 24)}...
            </div>
            <CopyButton text={salt} label="Copy" />
          </div>
          <p className="text-xs text-amber-400/60 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
            You will need this salt to reveal your bid later. It is saved in your browser.
          </p>
        </div>

        <Button
          variant="accent"
          className="w-full rounded-xl"
          onClick={handleBid}
          disabled={submitting || !connected || !auctionId || !amount}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Committing bid...
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" aria-hidden="true" />
              Place Sealed Bid ({(MARKETPLACE_FEES.PLACE_BID / MICROCREDITS_PER_CREDIT).toFixed(2)} ALEO)
            </>
          )}
        </Button>
      </div>
    </GlassCard>
  )
}
