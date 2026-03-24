'use client'

import { useState, useCallback } from 'react'
import { m } from 'framer-motion'
import { toast } from 'sonner'
import { formatCredits, formatUsd } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

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

  const menuItems = items ?? DEFAULT_MENU

  const handleOrder = useCallback((item: TipMenuItem) => {
    if (!connected) {
      toast.error('Connect your wallet to place an order')
      return
    }
    setOrderingId(item.id)

    // Save order to localStorage for creator dashboard
    try {
      const key = `veilsub_tip_menu_orders_${creatorAddress}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push({
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        timestamp: Date.now(),
      })
      localStorage.setItem(key, JSON.stringify(existing.slice(-50)))
    } catch { /* localStorage unavailable */ }

    // If parent provided a tip handler, use it (opens TipModal with preset amount)
    if (onTipRequest) {
      onTipRequest(item.price / 1_000_000, item.name)
    }

    toast.success(`Order placed for "${item.name}"! Send a tip of ${formatCredits(item.price)} ALEO to complete your request.`, {
      duration: 5000,
    })
    setOrderingId(null)
  }, [connected, creatorAddress, onTipRequest])

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
              <button
                onClick={() => handleOrder(item)}
                disabled={!connected || isOrdering}
                className="mt-3 w-full py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.98] bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isOrdering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    Processing...
                  </>
                ) : (
                  connected ? 'Order' : 'Connect wallet'
                )}
              </button>
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
