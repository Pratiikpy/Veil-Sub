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
  { icon: Shield, text: 'Built on Aleo' },
  { icon: Lock, text: 'Zero-Knowledge Proofs' },
  { icon: Zap, text: 'Testnet Live' },
  { icon: EyeOff, text: 'Private Subscriptions' },
  { icon: Layers, text: '27 Transitions' },
  { icon: Shield, text: 'Zero Public Footprint' },
  { icon: Coins, text: 'Poseidon2 Privacy' },
  { icon: Shield, text: '6 Record Types' },
  { icon: Layers, text: '25 Mappings' },
  { icon: Code, text: '1,388 Lines of Leo' },
  { icon: Shield, text: '102 Error Codes' },
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
                  <Icon className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
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
