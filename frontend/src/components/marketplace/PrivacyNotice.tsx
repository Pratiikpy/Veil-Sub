'use client'

import { Shield, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type NoticeVariant = 'bid' | 'reveal' | 'resolve' | 'general'

interface PrivacyNoticeProps {
  variant: NoticeVariant
  className?: string
}

// ─── Notice content per variant ───────────────────────────────────────────────

const notices: Record<
  NoticeVariant,
  {
    icon: typeof Shield
    iconColor: string
    borderColor: string
    bgColor: string
    title: string
    body: string
  }
> = {
  bid: {
    icon: Lock,
    iconColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/15',
    bgColor: 'bg-emerald-500/[0.04]',
    title: 'Your bid amount stays private.',
    body: 'Only a BHP256 commitment hash is stored on-chain. No tokens move during bidding. Your bid amount is completely hidden until you choose to reveal it.',
  },
  reveal: {
    icon: Eye,
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-500/15',
    bgColor: 'bg-amber-500/[0.04]',
    title: 'Revealing makes your bid amount public.',
    body: 'This is by design -- fair Vickrey settlement requires all revealed amounts to be visible. Your identity stays hidden (only a Poseidon2 hash). Losing bidders who skip reveal keep their amounts private forever.',
  },
  resolve: {
    icon: EyeOff,
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/15',
    bgColor: 'bg-blue-500/[0.04]',
    title: 'Vickrey settlement: winner pays second-highest price.',
    body: 'The winner is the highest bidder, but they pay only the second-highest bid amount. This incentivizes truthful bidding -- bid your true value for the optimal strategy.',
  },
  general: {
    icon: Shield,
    iconColor: 'text-violet-400',
    borderColor: 'border-violet-500/15',
    bgColor: 'bg-violet-500/[0.04]',
    title: 'Privacy by default.',
    body: 'Bidder identities use Poseidon2 hashes (never stored as addresses). Creator identity is also hashed. All mapping keys are field-typed -- zero addresses in finalize.',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrivacyNotice({
  variant,
  className = '',
}: PrivacyNoticeProps) {
  const notice = notices[variant]
  const Icon = notice.icon

  return (
    <div
      className={`p-3 rounded-xl ${notice.bgColor} border ${notice.borderColor} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className={`w-4 h-4 ${notice.iconColor} shrink-0 mt-0.5`}
          aria-hidden="true"
        />
        <div>
          <p className="text-xs leading-relaxed text-white/60">
            <span className={`font-semibold ${notice.iconColor}`}>
              {notice.title}
            </span>{' '}
            {notice.body}
          </p>
        </div>
      </div>
    </div>
  )
}
