'use client'

import { useState, useEffect, useCallback } from 'react'
import { Layers, Crown, Star, Gem } from 'lucide-react'

// Tier metadata stored off-chain (name can't be on-chain in Leo)
const TIER_ICONS: Record<number, any> = {
  1: Star,
  2: Crown,
  3: Gem,
}

const TIER_COLORS: Record<number, string> = {
  1: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  2: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
  3: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
}

export interface TierOption {
  id: number
  name: string
  price: number // microcredits
  isCustom: boolean
  deprecated?: boolean
}

interface DynamicTierSelectorProps {
  tiers: TierOption[]
  selectedTierId: number | null
  onSelect: (tier: TierOption) => void
  loading?: boolean
}

export default function DynamicTierSelector({ tiers, selectedTierId, onSelect, loading }: DynamicTierSelectorProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-[8px] bg-white/[0.05] border border-white/[0.08]" />
        ))}
      </div>
    )
  }

  const activeTiers = tiers.filter(t => !t.deprecated)

  if (activeTiers.length === 0) {
    return (
      <div className="rounded-[8px] bg-white/[0.05] border border-white/[0.08] p-4 text-center">
        <Layers className="mx-auto mb-2 h-6 w-6 text-[#71717a]" />
        <p className="text-sm text-[#a1a1aa]">No tiers available</p>
        <p className="text-xs text-[#71717a]">Creator hasn&apos;t set up subscription tiers yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activeTiers.map((tier) => {
        const isSelected = selectedTierId === tier.id
        const Icon = TIER_ICONS[tier.id] || Layers
        const colors = TIER_COLORS[tier.id] || 'from-slate-500/20 to-slate-600/20 border-slate-500/30'
        const priceAleo = (tier.price / 1_000_000).toFixed(2)

        return (
          <button
            key={tier.id}
            onClick={() => onSelect(tier)}
            className={`w-full rounded-[8px] border p-3 text-left transition-all ${
              isSelected
                ? `bg-gradient-to-br ${colors}`
                : 'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.08]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-1.5 ${isSelected ? 'bg-white/10' : 'bg-white/[0.05]'}`}>
                  <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-[#a1a1aa]'}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-[#a1a1aa]'}`}>
                    {tier.name}
                    {tier.isCustom && (
                      <span className="ml-1.5 text-[10px] text-[#a1a1aa] bg-violet-500/10 px-1.5 py-0.5 rounded-full">Custom</span>
                    )}
                  </p>
                  <p className="text-xs text-[#71717a]">Tier #{tier.id}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-[#a1a1aa]'}`}>
                  {priceAleo} ALEO
                </p>
                <p className="text-[10px] text-slate-500">/month</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
