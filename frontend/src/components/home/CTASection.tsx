import Link from 'next/link'
import { ArrowRight, Github } from 'lucide-react'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import ScrollReveal from '@/components/ScrollReveal'

export default function CTASection() {
  return (
    <section className="relative py-24 lg:py-36 section-divider overflow-hidden">
      {/* CTA ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 70%)',
        }}
      />
      <Container className="relative">
        <ScrollReveal>
          <div className="relative max-w-3xl mx-auto rounded-3xl overflow-hidden">
            {/* Gradient border */}
            <div
              className="absolute inset-0 rounded-3xl"
              style={{
                padding: '1px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.05) 40%, rgba(139,92,246,0.05) 60%, rgba(139,92,246,0.3))',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />
            <div className="relative p-10 sm:p-16 text-center bg-white/[0.01]">
              <h2
                className="text-4xl sm:text-5xl lg:text-6xl font-serif italic text-white"
                style={{ letterSpacing: '-0.03em' }}
              >
                Ready to Go Private?
              </h2>
              <p className="mt-6 text-lg text-muted max-w-lg mx-auto leading-relaxed">
                Start earning from subscribers who value privacy. No lists. No traces. No compromise.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap mt-10">
                <Link href="/dashboard">
                  <Button variant="accent" size="lg" className="rounded-full px-10 shadow-accent-lg">
                    Become a Creator
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <a
                  href="https://github.com/Pratiikpy/Veil-Sub"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="lg" className="rounded-full">
                    <Github className="w-4 h-4" />
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
