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
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react'

// ─── Step data ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    step: '1. Create',
    icon: Plus,
    color: 'violet',
    text: 'Creator opens an auction for a premium content slot. A unique auction ID is derived from their identity.',
    privacy: 'Creator identity: Poseidon2 hashed',
  },
  {
    step: '2. Bid',
    icon: Lock,
    color: 'blue',
    text: 'Bidders submit BHP256 commitments -- the bid amount is hidden on-chain. Only the commitment hash is stored publicly.',
    privacy: 'Bid amount: completely private',
  },
  {
    step: '3. Close',
    icon: Clock,
    color: 'amber',
    text: 'Creator closes bidding. No more bids accepted. Reveal phase begins.',
    privacy: 'All bids still sealed',
  },
  {
    step: '4. Reveal',
    icon: Unlock,
    color: 'emerald',
    text: 'Bidders reveal their amounts. Contract verifies against stored commitments. Losing bidders can skip this step (their bids stay private forever).',
    privacy: 'Revealed amounts become public (by design)',
  },
  {
    step: '5. Resolve',
    icon: Trophy,
    color: 'yellow',
    text: 'Highest bidder wins, but pays the SECOND-highest price (Vickrey auction). This incentivizes truthful bidding -- bid your true value.',
    privacy: 'Winner hash stored; identity stays hidden',
  },
]

// ─── Color map for dynamic Tailwind classes ───────────────────────────────────

const stepColors: Record<string, { iconBg: string; iconBorder: string; iconText: string }> = {
  violet: { iconBg: 'bg-violet-500/10', iconBorder: 'border-violet-500/20', iconText: 'text-violet-400' },
  blue: { iconBg: 'bg-blue-500/10', iconBorder: 'border-blue-500/20', iconText: 'text-blue-400' },
  amber: { iconBg: 'bg-amber-500/10', iconBorder: 'border-amber-500/20', iconText: 'text-amber-400' },
  emerald: { iconBg: 'bg-emerald-500/10', iconBorder: 'border-emerald-500/20', iconText: 'text-emerald-400' },
  yellow: { iconBg: 'bg-yellow-500/10', iconBorder: 'border-yellow-500/20', iconText: 'text-yellow-400' },
}

// ─── Privacy comparison table ─────────────────────────────────────────────────

const privacyComparison = [
  {
    data: 'Bid Amounts',
    traditional: 'Public to all',
    veilsub: 'BHP256 committed (hidden)',
    icon: Lock,
  },
  {
    data: 'Bidder Identity',
    traditional: 'On-chain address',
    veilsub: 'Poseidon2 hash only',
    icon: EyeOff,
  },
  {
    data: 'Creator Identity',
    traditional: 'On-chain address',
    veilsub: 'Poseidon2 hash only',
    icon: Shield,
  },
  {
    data: 'Losing Bids',
    traditional: 'Permanently public',
    veilsub: 'Private forever (no reveal needed)',
    icon: Eye,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function SealedBidExplainer() {
  const [expanded, setExpanded] = useState(true) // Default expanded per Obscura pattern

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">
            How Sealed-Bid Auctions Work
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-white/60" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/60" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5">
              {/* Steps */}
              <div className="space-y-4">
                {STEPS.map((s, i) => {
                  const Icon = s.icon
                  const colors = stepColors[s.color]
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors.iconBg} border ${colors.iconBorder}`}
                      >
                        <Icon
                          className={`w-4 h-4 ${colors.iconText}`}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">
                          {s.step}
                        </p>
                        <p className="text-xs text-white/60 leading-relaxed">
                          {s.text}
                        </p>
                        {/* Privacy indicator per step */}
                        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                          <Shield
                            className="w-2.5 h-2.5 text-emerald-400"
                            aria-hidden="true"
                          />
                          <span className="text-[10px] text-emerald-400/80">
                            {s.privacy}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Privacy Comparison Table */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
                  <p className="text-xs font-semibold text-white/70">
                    Privacy Comparison: Traditional vs VeilSub
                  </p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {privacyComparison.map((row) => {
                    const Icon = row.icon
                    return (
                      <div
                        key={row.data}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <Icon
                          className="w-3.5 h-3.5 text-white/30 shrink-0"
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/70">
                            {row.data}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-red-400/60 line-through">
                            {row.traditional}
                          </span>
                          <ArrowRight
                            className="w-3 h-3 text-white/20"
                            aria-hidden="true"
                          />
                          <span className="text-[10px] text-emerald-400 font-medium">
                            {row.veilsub}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Cryptographic guarantee box */}
              <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                <p className="text-xs text-white/50 leading-relaxed">
                  <span className="font-semibold text-violet-400">
                    Cryptographic guarantee:
                  </span>{' '}
                  BHP256 commitments are both hiding (nobody can see your bid
                  amount) and binding (you cannot change your bid after
                  committing). The Vickrey mechanism ensures the dominant
                  strategy is to bid your true value. Nullifier-based
                  anti-Sybil prevents double-bidding per auction.
                </p>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
