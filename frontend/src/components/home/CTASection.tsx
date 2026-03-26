import Link from 'next/link'
import { ArrowRight, Github } from 'lucide-react'
import Container from '@/components/ui/Container'
import ScrollReveal from '@/components/ScrollReveal'

// Extracted style constants to prevent re-renders
const CTA_GLOW_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)',
} as const

const LETTER_SPACING_STYLE = { letterSpacing: '-0.03em' } as const

export default function CTASection() {
  return (
    <section className="relative py-12 sm:py-24 lg:py-36 section-divider overflow-hidden">
      {/* CTA ambient glow (responsive) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[800px] h-[200px] sm:h-[400px] pointer-events-none"
        style={CTA_GLOW_STYLE}
      />
      <Container className="relative">
        <ScrollReveal>
          <div className="relative max-w-3xl mx-auto rounded-3xl overflow-hidden">
            {/* Gradient border */}
            <div className="gradient-border-accent" />
            <div className="relative p-6 sm:p-10 lg:p-16 text-center bg-white/[0.01]">
              <h2
                className="text-4xl sm:text-5xl lg:text-6xl font-serif italic text-white"
                style={LETTER_SPACING_STYLE}
              >
                Get paid. No middleman can stop you.
              </h2>
              <p className="mt-6 text-lg text-white/80 max-w-lg mx-auto leading-relaxed">
                Create subscription tiers, publish content, and earn directly from your audience.
                No subscriber data to protect because none is ever collected.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap mt-10">
                <Link href="/dashboard" className="btn-shimmer group relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 bg-violet-600 text-white hover:bg-violet-500 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 hover:shadow-accent-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black px-10 py-3 text-base shadow-accent-lg">
                  <span className="relative z-10 flex items-center gap-2">
                    Become a Creator
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </span>
                </Link>
                <a
                  href="https://github.com/Pratiikpy/Veil-Sub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-shimmer group relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 bg-transparent text-white border border-border hover:border-border-hover hover:bg-white/[0.03] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black px-8 py-3 text-base hover:scale-105"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Github className="w-4 h-4" aria-hidden="true" />
                    View on GitHub
                  </span>
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  )
}
