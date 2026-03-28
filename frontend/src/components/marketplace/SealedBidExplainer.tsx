'use client'

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Lock,
  Clock,
  Unlock,
  Trophy,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'

const STEPS = [
  {
    step: '1. Create',
    icon: Plus,
    color: 'violet',
    text: 'Creator opens an auction for a premium content slot. A unique auction ID is derived from their identity.',
  },
  {
    step: '2. Bid',
    icon: Lock,
    color: 'blue',
    text: 'Bidders submit BHP256 commitments -- the bid amount is hidden on-chain. Only the commitment hash is stored publicly.',
  },
  {
    step: '3. Close',
    icon: Clock,
    color: 'amber',
    text: 'Creator closes bidding. No more bids accepted. Reveal phase begins.',
  },
  {
    step: '4. Reveal',
    icon: Unlock,
    color: 'emerald',
    text: 'Bidders reveal their amounts. Contract verifies against stored commitments. Losing bidders can skip this step (their bids stay private forever).',
  },
  {
    step: '5. Resolve',
    icon: Trophy,
    color: 'yellow',
    text: 'Highest bidder wins, but pays the SECOND-highest price (Vickrey auction). This incentivizes truthful bidding -- bid your true value.',
  },
]

export default function SealedBidExplainer() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">How Sealed-Bid Auctions Work</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-white/60" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/60" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {STEPS.map((s, i) => {
                const Icon = s.icon
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-${s.color}-500/10 border border-${s.color}-500/20`}>
                      <Icon className={`w-4 h-4 text-${s.color}-400`} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{s.step}</p>
                      <p className="text-xs text-white/60 leading-relaxed">{s.text}</p>
                    </div>
                  </div>
                )
              })}

              <div className="mt-4 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                <p className="text-xs text-white/50 leading-relaxed">
                  <span className="font-semibold text-violet-400">Cryptographic guarantee:</span> BHP256 commitments are both hiding (nobody can see your bid amount) and binding (you cannot change your bid after committing). The Vickrey mechanism ensures the dominant strategy is to bid your true value.
                </p>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
