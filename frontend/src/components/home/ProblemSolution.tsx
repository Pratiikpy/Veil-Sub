import { Check, X as XIcon } from 'lucide-react'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ScrollReveal from '@/components/ScrollReveal'

const COMPARISON_ROWS = [
  { traditional: 'Subscriber lists are public', veilsub: 'Subscriber identity is never exposed' },
  { traditional: 'Transaction history is permanent', veilsub: 'Payments are cryptographically hidden' },
  { traditional: 'Everyone knows who pays whom', veilsub: 'Zero subscription graph exists' },
]

export default function ProblemSolution() {
  return (
    <section className="py-24 lg:py-36 section-divider">
      <Container>
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
          <ScrollReveal>
            <Badge>The Problem</Badge>
            <h2
              className="mt-6 text-3xl sm:text-4xl lg:text-[44px] font-serif italic text-white"
              style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}
            >
              Every Platform
              <br />
              Exposes You.
            </h2>
            <p className="mt-6 text-white/70 leading-relaxed">
              Every major platform—Patreon, Ko-fi, YouTube memberships—publicly
              links subscribers to creators. Fans fear judgment. Creators lose
              privacy-conscious supporters.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="space-y-3">
              {COMPARISON_ROWS.map((row) => (
                <div
                  key={row.traditional}
                  className="rounded-2xl glass overflow-hidden hover:border-border-hover transition-colors duration-300"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/75">
                    <div className="flex items-start gap-2.5 p-5">
                      <XIcon className="w-4 h-4 text-red-400/50 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-red-400 font-medium">
                          Traditional
                        </span>
                        <p className="text-sm text-white/60 mt-0.5">{row.traditional}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-5">
                      <Check className="w-4 h-4 text-emerald-400/50 mt-0.5 shrink-0" />
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
