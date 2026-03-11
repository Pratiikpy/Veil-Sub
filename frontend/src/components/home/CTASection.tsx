import Link from 'next/link'
import { ArrowRight, Github } from 'lucide-react'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import ScrollReveal from '@/components/ScrollReveal'

export default function CTASection() {
  return (
    <section className="relative py-24 lg:py-36 section-divider overflow-hidden">
      {/* CTA ambient glow (responsive) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[800px] h-[200px] sm:h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 70%)',
        }}
      />
      <Container className="relative">
        <ScrollReveal>
          <div className="relative max-w-3xl mx-auto rounded-3xl overflow-hidden">
            {/* Gradient border */}
            <div className="gradient-border-accent" />
            <div className="relative p-10 sm:p-16 text-center bg-white/[0.01]">
              <h2
                className="text-4xl sm:text-5xl lg:text-6xl font-serif italic text-white"
                style={{ letterSpacing: '-0.03em' }}
              >
                Earn While They Stay Hidden
              </h2>
              <p className="mt-6 text-lg text-white/80 max-w-lg mx-auto leading-relaxed">
                Earn ALEO from privacy-conscious subscribers. Zero subscriber enumeration. BSP nonce rotation. Poseidon2 field-hashed mappings.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap mt-10">
                <Link href="/dashboard">
                  <Button variant="accent" size="lg" className="rounded-full px-10 shadow-accent-lg">
                    Become a Creator
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </Link>
                <a
                  href="https://github.com/Pratiikpy/Veil-Sub"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="lg" className="rounded-full hover:scale-105 transition-transform">
                    <Github className="w-4 h-4" aria-hidden="true" />
                    View on GitHub
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  )
}
