import {
  Shield,
  Lock,
  Zap,
  EyeOff,
  Layers,
  Coins,
  Code,
} from 'lucide-react'

const TICKER_ITEMS = [
  { icon: Shield, text: '100% Private Subscriptions' },
  { icon: EyeOff, text: 'Zero Public Footprint' },
  { icon: Lock, text: 'Identity Never Stored' },
  { icon: Zap, text: 'Aleo Testnet Live' },
  { icon: Coins, text: 'Pay with Private Credits' },
  { icon: Layers, text: 'v27 Contract Deployed' },
  { icon: Shield, text: '6 Private Record Types' },
  { icon: EyeOff, text: 'Unlinkable Renewals' },
  { icon: Lock, text: 'Scoped Audit Tokens' },
  { icon: Shield, text: 'Commit-Reveal Tipping' },
  { icon: Code, text: '27 Transitions, 25 Mappings' },
]

export default function TrustTicker() {
  return (
    <div className="relative overflow-hidden border-y border-violet-500/10 py-5 bg-gradient-to-r from-transparent via-violet-500/[0.02] to-transparent">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />
      <div className="flex animate-marquee whitespace-nowrap">
        {[...Array(2)].map((_, dupeIdx) => (
          <div key={dupeIdx} className="flex items-center gap-12 mx-8">
            {TICKER_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <span
                  key={`${dupeIdx}-${item.text}`}
                  className="inline-flex items-center gap-2.5 text-sm text-white/70 font-semibold tracking-wide"
                >
                  <Icon className="w-4 h-4 text-violet-300" aria-hidden="true" />
                  {item.text}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
