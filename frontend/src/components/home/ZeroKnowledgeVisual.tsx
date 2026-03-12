'use client'

import { m } from 'framer-motion'
import { Server, Zap } from 'lucide-react'
import Container from '@/components/ui/Container'
import ScrollReveal from '@/components/ScrollReveal'
import PrivacyRings from '@/components/home/PrivacyRings'

// Extracted style constants to prevent re-renders
const HEADING_STYLE = { letterSpacing: '-0.025em', lineHeight: 1.1 } as const

const ARCHITECTURE_POINTS = [
  {
    label: 'Blind Subscription Protocol',
    desc: 'Subscribers rotate cryptographic nonces on renewal. No one can link subscription periods to the same person.',
  },
  {
    label: 'Zero-Address Finalize',
    desc: 'All 25 on-chain mappings are keyed by Poseidon2 hashes. No public mapping ever reveals who subscribed to whom.',
  },
  {
    label: 'Scoped Audit Tokens',
    desc: 'Verifiers get tokens with a bitfield mask controlling which fields they can inspect. Selective disclosure, not all-or-nothing.',
  },
]

export default function ZeroKnowledgeVisual() {
  return (
    <section className="py-24 lg:py-36 section-divider">
      <Container>
        <ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text content */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <Server className="w-4 h-4 text-violet-400/60" aria-hidden="true" />
                <span className="text-[11px] font-semibold tracking-[0.2em] text-white/70 uppercase">Architecture</span>
              </div>
              <h2
                className="text-4xl sm:text-5xl lg:text-6xl font-serif italic text-white"
                style={HEADING_STYLE}
              >
                Powered by{' '}
                <span className="drop-shadow-[0_0_20px_rgba(139,92,246,0.35)]">
                  Aleo
                </span>
              </h2>
              <p className="text-lg text-white/70 leading-relaxed">
                Aleo is a Layer-1 blockchain purpose-built for zero-knowledge applications. Unlike Ethereum or Solana where privacy is an afterthought, Aleo makes ZK-proofs a native, first-class feature.
              </p>
              <div className="space-y-4 pt-2">
                {ARCHITECTURE_POINTS.map((item, i) => (
                  <m.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.15 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-violet-500/10 transition-all duration-300"
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-500/[0.06] flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/[0.1]">
                      <Zap className="w-4 h-4 text-violet-400" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">{item.label}</h4>
                      <p className="text-xs text-white/70 leading-relaxed">{item.desc}</p>
                    </div>
                  </m.div>
                ))}
              </div>
            </div>

            {/* Right: Orbital privacy rings diagram */}
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex justify-center"
            >
              <PrivacyRings />
            </m.div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  )
}
