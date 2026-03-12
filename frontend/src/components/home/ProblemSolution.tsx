import { Check, X as XIcon } from 'lucide-react'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ScrollReveal from '@/components/ScrollReveal'

// Extracted style constants to prevent re-renders
const HEADING_STYLE = { letterSpacing: '-0.03em', lineHeight: 1.1 } as const

const COMPARISON_ROWS = [
  { traditional: 'Patreon\'s 2023 opt-out profiles made subscriber lists searchable by default—users had to manually hide themselves', veilsub: 'Subscriber identity never enters public state—not even in smart contract mappings' },
  { traditional: 'Patreon paid $7.25M in a 2024 VPPA settlement for sharing watch history with Facebook via pixel tracking', veilsub: 'Payments via credits.aleo transfer_private—ZK proven, no metadata left on-chain' },
  { traditional: 'Every crypto Patreon alternative (BitPatron, Creaton, LibrePatron) failed—public ledgers made privacy worse than Web2', veilsub: 'Aleo\'s ZK-native VM makes subscriber identity mathematically impossible to expose—even to us' },
]

export default function ProblemSolution() {
  return (
    <section className="py-20 lg:py-28 section-divider">
      <Container>
        <div className="grid md:grid-cols-2 gap-6 md:gap-12 lg:gap-20 items-start">
          <ScrollReveal>
            <Badge>The Problem</Badge>
            <h2
              className="mt-6 text-3xl sm:text-4xl lg:text-[44px] font-serif italic text-white"
              style={HEADING_STYLE}
            >
              Every Platform
              <br />
              Exposes You.
            </h2>
            <p className="mt-6 text-white/80 leading-relaxed">
              Every major creator platform has leaked, sold, or exposed subscriber data. 2.33M Patreon users breached in 2015. $7.25M VPPA settlement in 2024.
              Blockchain alternatives made it worse—public ledgers are permanently traceable.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="space-y-4">
              {COMPARISON_ROWS.map((row) => (
                <div
                  key={row.traditional}
                  className="rounded-2xl glass overflow-hidden hover:border-border-hover transition-colors duration-300"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/75">
                    <div className="flex items-start gap-4 p-6">
                      <XIcon className="w-4 h-4 text-red-400/50 mt-0.5 shrink-0" aria-hidden="true" />
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-red-400 font-medium">
                          Traditional
                        </span>
                        <p className="text-sm text-white/60 mt-0.5">{row.traditional}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-6">
                      <Check className="w-4 h-4 text-emerald-400/50 mt-0.5 shrink-0" aria-hidden="true" />
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-medium">
                          VeilSub
                        </span>
                        <p className="text-sm text-white mt-0.5">{row.veilsub}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  )
}
