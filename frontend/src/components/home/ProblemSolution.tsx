import { Check, X as XIcon } from 'lucide-react'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ScrollReveal from '@/components/ScrollReveal'

// Extracted style constants to prevent re-renders
const HEADING_STYLE = { letterSpacing: '-0.03em', lineHeight: 1.1 } as const

const COMPARISON_ROWS = [
  {
    traditional: 'Every subscription platform keeps a list of who pays whom. One breach and everyone knows your interests.',
    veilsub: 'No subscriber list exists. Not encrypted, not hidden. The data simply does not exist to be leaked.',
  },
  {
    traditional: 'Your bank, your credit card, and the platform all see every payment. Patreon paid $7.25M for sharing watch data with Facebook.',
    veilsub: 'Payments are private by default. No payment trail connects you to any creator.',
  },
  {
    traditional: 'Every crypto alternative (BitPatron, Creaton, LibrePatron) failed because public blockchains made privacy worse than Web2.',
    veilsub: 'Built on a blockchain designed for privacy. Subscriber identity is mathematically impossible to expose — even by us.',
  },
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
              Every subscription platform knows who supports whom.
              Your credit card knows. Your bank knows. The platform knows.
              One data breach and everyone knows.
            </p>
            <p className="mt-4 text-white/60 leading-relaxed text-sm">
              2.33M Patreon accounts breached in 2015. $7.25M privacy settlement in 2024.
              This is not a technical problem — it is a design choice. VeilSub chose differently.
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
                        <span className="text-[11px] uppercase tracking-wider text-red-400 font-medium">
                          Traditional
                        </span>
                        <p className="text-sm text-white/60 mt-0.5">{row.traditional}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-6">
                      <Check className="w-4 h-4 text-emerald-400/50 mt-0.5 shrink-0" aria-hidden="true" />
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-medium">
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
