'use client'

import { m } from 'framer-motion'
import { spring } from '@/lib/motion'
import {
  Store,
  Shield,
  Star,
  Gavel,
  Hash,
  EyeOff,
  ArrowRight,
  Award,
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

// ─── How Reputation Works ───────────────────────────────────────────────────

const REPUTATION_STEPS = [
  {
    step: 1,
    title: 'Aggregate Ratings',
    description:
      'Subscribers rate creators privately. Individual ratings are hidden; only the overall score is visible.',
    icon: Star,
    color: 'amber',
  },
  {
    step: 2,
    title: 'Threshold Proofs',
    description:
      'Creators prove they meet a subscriber threshold -- without revealing the exact count.',
    icon: Shield,
    color: 'violet',
  },
  {
    step: 3,
    title: 'Reputation Tiers',
    description:
      'Tiers (Bronze/Silver/Gold/Diamond) are assigned by verified blockchain proofs. No manual curation or gaming.',
    icon: Award,
    color: 'emerald',
  },
]

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  return (
    <PageTransition className="min-h-screen">
      {/* ── BETA Banner ──────────────────────────────────────────────────── */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-center">
        <p className="text-sm text-amber-300 font-medium">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mr-2">Beta</span>
          The marketplace is not yet live on-chain. This page describes how it will work.
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
                <Store className="w-4 h-4" aria-hidden="true" />
                Creator Marketplace
              </Badge>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
              style={LETTER_SPACING_STYLE}
            >
              Creator Marketplace
            </h1>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Discover creators by reputation. Bid on premium content. All ratings are
              privacy-preserving -- individual reviews are never visible.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400">
                <Shield className="w-3 h-3" aria-hidden="true" />
                Privacy-preserving ratings
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <EyeOff className="w-3 h-3" aria-hidden="true" />
                Sealed-bid auctions
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* ── Empty State: No Auctions ─────────────────────────────────────── */}
      <section className="py-12 sm:py-20">
        <Container>
          <div className="text-center py-16">
            <Gavel className="w-12 h-12 text-white/20 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-white mb-2">No auctions yet</h3>
            <p className="text-sm text-white/50 max-w-sm mx-auto">
              The creator marketplace is coming soon. Sealed-bid auctions where nobody
              sees other bids until reveal.
            </p>
          </div>
        </Container>
      </section>

      {/* ── How Reputation Works ─────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                How Reputation Works
              </h2>
              <p className="text-white/80 max-w-xl mx-auto">
                Private ratings, public trust. Individual reviews are combined mathematically
                without revealing any single rating.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-3xl mx-auto grid gap-4 sm:grid-cols-3">
            {REPUTATION_STEPS.map((step, i) => {
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

          {/* Technical detail */}
          <ScrollReveal delay={0.3}>
            <div className="max-w-3xl mx-auto mt-8 p-5 rounded-2xl bg-violet-500/[0.06] border border-violet-500/15">
              <div className="flex items-start gap-3">
                <Hash className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-violet-300 mb-1">
                    Privacy-Preserving Ratings
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Each review is encrypted with a hidden counter so that ratings can be
                    added together on-chain to produce an overall score, without anyone being
                    able to see any individual rating. Your specific review remains permanently
                    private -- only the combined result is visible.
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
                Join the Marketplace
              </h2>
              <p className="text-white/80 mb-8">
                Build your reputation privately. Discover creators by trust, not by identity.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/explore">
                  <Button variant="accent" size="lg" className="rounded-full shadow-accent-lg">
                    Explore Creators
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/governance">
                  <Button variant="secondary" size="lg" className="rounded-full">
                    Governance
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
