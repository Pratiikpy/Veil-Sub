'use client'

import { useState, useCallback } from 'react'
import { m } from 'framer-motion'
import { toast } from 'sonner'
import { formatCredits, formatUsd, creditsToMicrocredits } from '@/lib/utils'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { FEES } from '@/lib/config'

export interface TipMenuItem {
  id: string
  name: string
  price: number  // microcredits
  description: string
  emoji: string
}

interface TipMenuProps {
  creatorAddress: string
  creatorName: string
  items?: TipMenuItem[]
  isSubscribed: boolean
  connected: boolean
  onTipRequest?: (amount: number, itemName: string) => void
}

const DEFAULT_MENU: TipMenuItem[] = [
  { id: '1', name: 'Shoutout', price: 5_000_000, description: 'Personal shoutout in next post', emoji: '\u{1F4E2}' },
  { id: '2', name: 'Custom Photo', price: 15_000_000, description: 'Custom photo based on your request', emoji: '\u{1F4F8}' },
  { id: '3', name: 'Q&A Response', price: 10_000_000, description: 'Detailed answer to your question', emoji: '\u{1F4AC}' },
  { id: '4', name: 'Early Access', price: 3_000_000, description: 'Preview of upcoming content', emoji: '\u{1F52E}' },
]

export default function TipMenu({ creatorAddress, creatorName, items, isSubscribed, connected, onTipRequest }: TipMenuProps) {
  const [orderingId, setOrderingId] = useState<string | null>(null)
  const [confirmingItem, setConfirmingItem] = useState<TipMenuItem | null>(null)
  const [payingItem, setPayingItem] = useState<string | null>(null)
  const { tip, getCreditsRecords } = useVeilSub()
  const { startPolling } = useTransactionPoller()

  const menuItems = items ?? DEFAULT_MENU

  // Execute the actual tip payment on-chain
  const executePayment = useCallback(async (item: TipMenuItem) => {
    setPayingItem(item.id)
    setConfirmingItem(null)

    try {
      const records = await getCreditsRecords()
      if (!records || records.length === 0) {
        toast.error('No credits records found. You need ALEO credits in your wallet.')
        setPayingItem(null)
        return
      }

      // Find a record with enough balance
      const needed = item.price + creditsToMicrocredits(FEES.TIP)
      const paymentRecord = records.find((r: string) => {
        try {
          const match = r.match(/microcredits:\s*(\d+)u64/)
          return match ? parseInt(match[1]) >= needed : false
        } catch { return false }
      })

      if (!paymentRecord) {
        toast.error(`Insufficient balance. Need at least ${formatCredits(needed)} ALEO.`)
        setPayingItem(null)
        return
      }

      toast.info(`Sending tip for "${item.name}"...`)

      const txId = await tip(paymentRecord, creatorAddress, item.price)

      if (txId) {
        // Save order to localStorage for creator dashboard
        try {
          const key = `veilsub_tip_menu_orders_${creatorAddress}`
          const existing = JSON.parse(localStorage.getItem(key) || '[]')
          existing.push({
            itemId: item.id,
            itemName: item.name,
            price: item.price,
            txId,
            timestamp: Date.now(),
          })
          localStorage.setItem(key, JSON.stringify(existing.slice(-50)))
        } catch { /* localStorage unavailable */ }

        toast.success(`"${item.name}" purchased! Tip of ${formatCredits(item.price)} ALEO sent to ${creatorName || 'creator'}.`, {
          duration: 5000,
        })

        // Notify parent if handler exists (for cache invalidation etc.)
        if (onTipRequest) {
          onTipRequest(item.price / 1_000_000, item.name)
        }
      } else {
        toast.error('Tip transaction failed or was cancelled.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed'
      toast.error(msg)
    } finally {
      setPayingItem(null)
    }
  }, [getCreditsRecords, tip, creatorAddress, creatorName, onTipRequest])

  const handleOrder = useCallback((item: TipMenuItem) => {
    if (!connected) {
      toast.error('Connect your wallet to place an order')
      return
    }
    if (payingItem) return // prevent double-click while paying
    // Show confirmation step
    setConfirmingItem(item)
  }, [connected, payingItem])

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Tip Menu</h3>
        <p className="text-xs text-white/60 mt-1">
          Support {creatorName || 'this creator'} with a direct tip for a specific request. All tips are sent privately via Aleo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {menuItems.map((item, i) => {
          const isOrdering = orderingId === item.id
          return (
            <m.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] hover:bg-amber-500/[0.06] transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0" aria-hidden="true">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{item.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-300">
                      {formatCredits(item.price)} ALEO
                    </span>
                    <span className="text-[10px] text-white/40">
                      {formatUsd(item.price)}
                    </span>
                  </div>
                </div>
              </div>
              {confirmingItem?.id === item.id ? (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] text-white/60 text-center">
                    Pay {formatCredits(item.price)} ALEO (~{formatUsd(item.price)}) + network fee?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => executePayment(item)}
                      disabled={payingItem === item.id}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.98] bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {payingItem === item.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          Paying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Confirm
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmingItem(null)}
                      disabled={payingItem === item.id}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all bg-white/[0.05] border border-white/[0.1] text-white/50 hover:bg-white/[0.08] disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleOrder(item)}
                  disabled={!connected || payingItem === item.id}
                  className="mt-3 w-full py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.98] bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {payingItem === item.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      Processing...
                    </>
                  ) : (
                    connected ? 'Order' : 'Connect wallet'
                  )}
                </button>
              )}
            </m.div>
          )
        })}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        <p className="text-[11px] text-white/40 text-center">
          Tips are sent as private Aleo transactions. The creator sees the request but not your identity.
        </p>
      </div>
    </div>
  )
}
