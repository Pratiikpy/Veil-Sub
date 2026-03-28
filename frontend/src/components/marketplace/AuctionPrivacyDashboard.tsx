'use client'

import { Shield, Lock, Eye, EyeOff, Hash, Globe } from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import { AUCTION_STATUS } from './constants'
import type { AuctionStatus } from './constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuctionPrivacyDashboardProps {
  status: AuctionStatus
}

interface PrivacyItem {
  label: string
  icon: typeof Lock
  getState: (status: AuctionStatus) => {
    level: 'private' | 'public' | 'hashed'
    text: string
  }
}

// ─── Privacy items — what is visible at each phase ────────────────────────────

const privacyItems: PrivacyItem[] = [
  {
    label: 'Bid Amounts',
    icon: Lock,
    getState: (s) => {
      if (s === AUCTION_STATUS.OPEN)
        return { level: 'private', text: 'Hidden -- only you can see your bid' }
      if (s === AUCTION_STATUS.CLOSED)
        return {
          level: 'public',
          text: 'Revealed amounts become public during reveal phase',
        }
      return { level: 'public', text: 'Visible -- shown after settlement' }
    },
  },
  {
    label: 'Bidder Identity',
    icon: EyeOff,
    getState: () => ({
      level: 'private',
      text: 'Your address is Poseidon2-hashed -- never stored in plaintext',
    }),
  },
  {
    label: 'Creator Identity',
    icon: Hash,
    getState: () => ({
      level: 'hashed',
      text: 'Poseidon2 hash of creator address -- computationally infeasible to reverse',
    }),
  },
  {
    label: 'Bid Commitment',
    icon: Shield,
    getState: (s) => {
      if (s === AUCTION_STATUS.OPEN)
        return {
          level: 'hashed',
          text: 'BHP256 commitment stored -- binding but hiding',
        }
      return {
        level: 'public',
        text: 'Commitment verified against revealed amount',
      }
    },
  },
  {
    label: 'Winner',
    icon: Eye,
    getState: (s) => {
      if (s === AUCTION_STATUS.RESOLVED)
        return {
          level: 'hashed',
          text: 'Winner hash stored -- only winner knows their identity',
        }
      return { level: 'private', text: 'Unknown until auction resolves' }
    },
  },
  {
    label: 'Settlement Price',
    icon: Globe,
    getState: (s) => {
      if (s === AUCTION_STATUS.RESOLVED)
        return {
          level: 'public',
          text: 'Vickrey second-price is public for auditability',
        }
      return { level: 'private', text: 'No settlement yet' }
    },
  },
]

// ─── Phase explainers ─────────────────────────────────────────────────────────

const phaseExplainers: Record<number, string> = {
  [AUCTION_STATUS.OPEN]:
    'Bid amounts are completely private. BHP256 commitments are hiding and binding -- nobody can see your bid, and you cannot change it after committing.',
  [AUCTION_STATUS.CLOSED]:
    'Bidding is closed. Bidders can now reveal their amounts. Revealed bids become public -- this is intentional for fair Vickrey settlement.',
  [AUCTION_STATUS.RESOLVED]:
    'Auction resolved via Vickrey (second-price) settlement. Winner pays the second-highest bid. All settlement data is on-chain for auditability.',
}

// ─── Level config ─────────────────────────────────────────────────────────────

const levelConfig = {
  private: {
    barColor: 'bg-emerald-400',
    barBg: 'bg-emerald-500/20',
    barWidth: 'w-full',
    textColor: 'text-emerald-400',
    iconColor: 'text-emerald-400',
    label: 'Private',
  },
  hashed: {
    barColor: 'bg-amber-400',
    barBg: 'bg-amber-500/20',
    barWidth: 'w-3/4',
    textColor: 'text-amber-400',
    iconColor: 'text-amber-400',
    label: 'Hashed',
  },
  public: {
    barColor: 'bg-white/40',
    barBg: 'bg-white/10',
    barWidth: 'w-1/4',
    textColor: 'text-white/50',
    iconColor: 'text-white/40',
    label: 'Public',
  },
} as const

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuctionPrivacyDashboard({
  status,
}: AuctionPrivacyDashboardProps) {
  const explainer = phaseExplainers[status] || 'Auction state unknown.'
  const privateCount = privacyItems.filter(
    (i) => i.getState(status).level === 'private'
  ).length
  const hashedCount = privacyItems.filter(
    (i) => i.getState(status).level === 'hashed'
  ).length
  const protectedCount = privateCount + hashedCount

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      {/* Top accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-violet-500 to-emerald-500" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Privacy Dashboard
              </h4>
              <p className="text-[10px] text-white/40">
                Real-time privacy status
              </p>
            </div>
          </div>
          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {protectedCount}/{privacyItems.length} protected
          </span>
        </div>

        {/* Privacy items */}
        <div className="space-y-2 mb-4">
          {privacyItems.map((item) => {
            const state = item.getState(status)
            const config = levelConfig[state.level]
            const Icon = item.icon

            return (
              <div
                key={item.label}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.02] group"
                title={state.text}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${config.iconColor}`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">
                    {item.label}
                  </p>
                </div>
                {/* Privacy bar */}
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`h-1.5 w-14 rounded-full overflow-hidden ${config.barBg}`}
                  >
                    <div
                      className={`h-full rounded-full ${config.barColor} ${config.barWidth}`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-medium w-12 text-right ${config.textColor}`}
                  >
                    {config.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Phase explainer */}
        <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
          <p className="text-xs text-white/50 leading-relaxed">
            <span className="text-violet-400 font-medium">Current Phase: </span>
            {explainer}
          </p>
        </div>
      </div>
    </div>
  )
}
