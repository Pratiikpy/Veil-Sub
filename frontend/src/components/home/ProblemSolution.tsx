import { Check, X as XIcon } from 'lucide-react'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ScrollReveal from '@/components/ScrollReveal'

// Extracted style constants to prevent re-renders
const HEADING_STYLE = { letterSpacing: '-0.03em', lineHeight: 1.1 } as const

const COMPARISON_ROWS = [
  { traditional: 'Patreon/Ko-fi show subscriber names in tier lists', veilsub: 'Subscriber identity never enters public state—not even mappings' },
  { traditional: 'Transaction history is permanent and public', veilsub: 'Payments via credits.aleo transfer_private—ZK proven, no on-chain trace' },
  { traditional: 'Blockchain explorers reveal who pays whom', veilsub: 'All 25 mappings use Poseidon2 field keys—zero raw address storage' },
]

export default function ProblemSolution() {
  return (
    <section className="py-20 lg:py-28 section-divider">
      <Container>
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
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
              Patreon, Ko-fi, and YouTube memberships display subscriber names
              in public tier lists. On Ethereum, on-chain payments are forever
              traceable. Privacy-conscious supporters avoid subscribing at all.
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
