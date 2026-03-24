'use client'

import { m } from 'framer-motion'
import { spring } from '@/lib/motion'
import {
  Vote,
  Shield,
  Lock,
  Hash,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import ScrollReveal from '@/components/ScrollReveal'
import Badge from '@/components/ui/Badge'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'

// ─── Static styles ──────────────────────────────────────────────────────────
import { HERO_GLOW_STYLE, TITLE_STYLE as LETTER_SPACING_STYLE } from '@/lib/styles'

// ─── How It Works Steps ─────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Commit',
    description:
      'Seal your vote with a secret code. Nobody can see how you voted.',
    icon: Lock,
    color: 'violet',
  },
  {
    step: 2,
    title: 'Vote',
    description:
      'During the voting window, all sealed votes are counted privately. The blockchain stores only encrypted values.',
    icon: Shield,
    color: 'blue',
  },
  {
    step: 3,
    title: 'Resolve',
    description:
      'After the window closes, results are published. Individual votes remain permanently hidden.',
    icon: Eye,
    color: 'emerald',
  },
]

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function GovernancePage() {
  return (
    <PageTransition className="min-h-screen">
      {/* ── BETA Banner ──────────────────────────────────────────────────── */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-center">
        <p className="text-sm text-amber-300 font-medium">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mr-2">Beta</span>
          Governance is not yet live on-chain. This page describes how it will work.
        </p>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] sm:w-[1100px] h-[350px] sm:h-[700px] pointer-events-none"
          style={HERO_GLOW_STYLE}
        />
        <Container className="relative pt-12 sm:pt-20 pb-8 sm:pb-16">
          <m.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.gentle}
            className="text-center"
          >
            <div className="flex justify-center mb-8">
              <Badge variant="accent">
                <Vote className="w-4 h-4" aria-hidden="true" />
                Private Governance
              </Badge>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
              style={LETTER_SPACING_STYLE}
            >
              Private Governance
            </h1>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Vote on VeilSub&apos;s future. Your vote is hidden. Only results are public.
              Sealed votes ensure nobody -- not even the blockchain -- can see how you voted.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-white/60">
                <Lock className="w-3 h-3" aria-hidden="true" />
                Sealed voting
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <EyeOff className="w-3 h-3" aria-hidden="true" />
                Anonymous voting
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* ── Empty State: No Proposals ─────────────────────────────────────── */}
      <section className="py-12 sm:py-20">
        <Container>
          <div className="text-center py-16">
            <Vote className="w-12 h-12 text-white/20 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-white mb-2">No proposals yet</h3>
            <p className="text-sm text-white/50 max-w-sm mx-auto">
              Community governance is coming soon. Subscribers will vote on platform decisions
              with sealed ballots -- nobody sees how you voted.
            </p>
          </div>
        </Container>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                How Private Voting Works
              </h2>
              <p className="text-white/80 max-w-xl mx-auto">
                A three-phase process ensures your vote is private until the results are
                published.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-3xl mx-auto grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon
              return (
                <ScrollReveal key={step.step} delay={i * 0.1}>
                  <GlassCard className="!p-6 text-center">
                    <div
                      className={`w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-${step.color}-500/10 border border-${step.color}-500/20`}
                    >
                      <Icon className={`w-5 h-5 text-${step.color}-400`} aria-hidden="true" />
                    </div>
                    <div
                      className={`text-xs font-bold uppercase tracking-wider text-${step.color}-400 mb-1`}
                    >
                      Step {step.step}
                    </div>
                    <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                    <p className="text-xs text-white/80 leading-relaxed">{step.description}</p>
                  </GlassCard>
                </ScrollReveal>
              )
            })}
          </div>

          {/* Technical detail callout */}
          <ScrollReveal delay={0.3}>
            <div className="max-w-3xl mx-auto mt-8 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-start gap-3">
                <Hash className="w-5 h-5 text-white/60 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-white/70 mb-1">
                    How sealed voting works
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Each vote is sealed using your choice plus a random secret code.
                    The secret code is stored only in your browser. Even with full
                    access to the blockchain, an observer cannot determine your vote without
                    your secret code -- reversing the seal is mathematically impossible.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Your Voice, Your Secret
              </h2>
              <p className="text-white/80 mb-8">
                Private governance is the foundation of a fair protocol. Explore the rest of the
                VeilSub ecosystem.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/explore">
                  <Button variant="accent" size="lg" className="rounded-full shadow-accent-lg">
                    Explore Creators
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>
    </PageTransition>
  )
}
