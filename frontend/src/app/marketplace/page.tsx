'use client'

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
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
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import ScrollReveal from '@/components/ScrollReveal'
import Badge from '@/components/ui/Badge'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import { useContractExecute } from '@/hooks/useContractExecute'
import { HERO_GLOW_STYLE, TITLE_STYLE as LETTER_SPACING_STYLE } from '@/lib/styles'
import { MARKETPLACE_PROGRAM_ID } from '@/components/marketplace/constants'
import SubmitReviewSection from '@/components/marketplace/SubmitReviewSection'
import ReputationLookupSection from '@/components/marketplace/ReputationLookupSection'
import ProveReputationSection from '@/components/marketplace/ProveReputationSection'
import VerifyBadgeSection from '@/components/marketplace/VerifyBadgeSection'
import CreateAuctionSection from '@/components/marketplace/CreateAuctionSection'
import PlaceBidSection from '@/components/marketplace/PlaceBidSection'
import AuctionManagementSection from '@/components/marketplace/AuctionManagementSection'
import SealedBidExplainer from '@/components/marketplace/SealedBidExplainer'

// ─── How Reputation Works Steps ──────────────────────────────────────────────

const REPUTATION_STEPS = [
  {
    step: 1,
    title: 'Aggregate Ratings',
    description:
      'Subscribers rate creators privately. Each rating becomes a Pedersen commitment: rating * G + blinding * H. Individual ratings are hidden.',
    icon: Star,
    color: 'amber',
  },
  {
    step: 2,
    title: 'Threshold Proofs',
    description:
      'Creators prove they meet a minimum average rating on-chain. The proof verifies Pedersen commitment integrity without revealing the exact score.',
    icon: Shield,
    color: 'violet',
  },
  {
    step: 3,
    title: 'Discovery Badges',
    description:
      'Bronze (10+ reviews), Silver (25+), Gold (50+). Badges are awarded via threshold proofs -- no manual curation or gaming possible.',
    icon: Award,
    color: 'emerald',
  },
]

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const { connected } = useContractExecute()
  const [activeTab, setActiveTab] = useState<'reputation' | 'auctions'>('reputation')

  return (
    <PageTransition className="min-h-screen">
      {/* ── Live Banner ──────────────────────────────────────────────────── */}
      <div className="bg-violet-500/10 border-b border-violet-500/20 px-4 py-3 text-center">
        <p className="text-sm text-violet-300 font-medium">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider mr-2">
            <Zap className="w-3 h-3" aria-hidden="true" />
            Live
          </span>
          Deployed on Aleo Testnet as <code className="font-mono text-xs bg-white/[0.06] px-1.5 py-0.5 rounded">{MARKETPLACE_PROGRAM_ID}</code>
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
              className="text-3xl sm:text-5xl font-bold text-white mb-6"
              style={LETTER_SPACING_STYLE}
            >
              Creator Marketplace
            </h1>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Privacy-preserving reputation and sealed-bid auctions. Rate creators via Pedersen
              commitments. Bid on premium content slots with BHP256 sealed bids.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-white/60">
                <Shield className="w-3 h-3" aria-hidden="true" />
                Pedersen Reputation
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <EyeOff className="w-3 h-3" aria-hidden="true" />
                BHP256 Sealed Bids
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <Hash className="w-3 h-3" aria-hidden="true" />
                Nullifier Anti-Sybil
              </div>
            </div>

            {!connected && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6"
              >
                <p className="text-sm text-amber-400/70">
                  Connect your wallet to interact with the marketplace
                </p>
              </m.div>
            )}
          </m.div>
        </Container>
      </section>

      {/* ── Tab Navigation ──────────────────────────────────────────────── */}
      <section className="border-b border-border/50 sticky top-16 z-20 bg-black/80 backdrop-blur-xl">
        <Container>
          <div className="flex items-center gap-1">
            {[
              { key: 'reputation' as const, label: 'Reputation', icon: Star },
              { key: 'auctions' as const, label: 'Sealed-Bid Auctions', icon: Gavel },
            ].map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors ${
                    active ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {tab.label}
                  {active && (
                    <m.div
                      layoutId="marketplace-tab"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-violet-500 rounded-full"
                      transition={spring.snappy}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </Container>
      </section>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'reputation' && (
          <m.div
            key="reputation"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={spring.gentle}
          >
            {/* How Reputation Works */}
            <section className="py-12 sm:py-16">
              <Container>
                <ScrollReveal>
                  <div className="text-center mb-12">
                    <h2
                      className="text-2xl sm:text-3xl font-bold text-white mb-4"
                      style={LETTER_SPACING_STYLE}
                    >
                      Homomorphic Pedersen Reputation
                    </h2>
                    <p className="text-white/60 max-w-xl mx-auto text-sm">
                      Private ratings, public trust. Individual reviews are combined via additive homomorphism
                      without revealing any single rating.
                    </p>
                  </div>
                </ScrollReveal>

                <div className="max-w-3xl mx-auto grid gap-4 sm:grid-cols-3 mb-8">
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
                          <p className="text-xs text-white/60 leading-relaxed">{step.description}</p>
                        </GlassCard>
                      </ScrollReveal>
                    )
                  })}
                </div>

                {/* Cryptographic detail */}
                <ScrollReveal delay={0.3}>
                  <div className="max-w-3xl mx-auto p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="flex items-start gap-3">
                      <Hash className="w-5 h-5 text-white/60 mt-0.5 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-white/70 mb-1">
                          Cryptographic Properties
                        </p>
                        <p className="text-sm text-white/60 leading-relaxed">
                          commit(rating, blinding) = rating * G + blinding * H where G is the group generator
                          and H = Poseidon2::hash_to_group(0). Commitments are perfectly hiding and computationally
                          binding. The aggregate commitment equals the sum of individual commitments via additive
                          homomorphism: commit(a,r1) + commit(b,r2) = commit(a+b, r1+r2).
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </Container>
            </section>

            {/* Interactive reputation sections */}
            <section className="py-8 sm:py-12 border-t border-border/50">
              <Container>
                <div className="grid gap-6 lg:grid-cols-2">
                  <SubmitReviewSection />
                  <ReputationLookupSection />
                </div>

                <div className="grid gap-6 lg:grid-cols-2 mt-6">
                  <ProveReputationSection />
                  <VerifyBadgeSection />
                </div>
              </Container>
            </section>
          </m.div>
        )}

        {activeTab === 'auctions' && (
          <m.div
            key="auctions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={spring.gentle}
          >
            {/* How Sealed Bids Work */}
            <section className="py-12 sm:py-16">
              <Container>
                <ScrollReveal>
                  <div className="text-center mb-8">
                    <h2
                      className="text-2xl sm:text-3xl font-bold text-white mb-4"
                      style={LETTER_SPACING_STYLE}
                    >
                      Sealed-Bid Content Auctions
                    </h2>
                    <p className="text-white/60 max-w-xl mx-auto text-sm">
                      BHP256 commitment scheme with Vickrey (second-price) settlement. Bid amounts are hidden
                      on-chain until the reveal phase. Losing bids stay private forever.
                    </p>
                  </div>
                </ScrollReveal>

                <div className="max-w-3xl mx-auto mb-8">
                  <SealedBidExplainer />
                </div>
              </Container>
            </section>

            {/* Interactive auction sections */}
            <section className="py-8 sm:py-12 border-t border-border/50">
              <Container>
                <div className="grid gap-6 lg:grid-cols-2">
                  <CreateAuctionSection />
                  <PlaceBidSection />
                </div>

                <div className="mt-6">
                  <AuctionManagementSection />
                </div>
              </Container>
            </section>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2
                className="text-2xl sm:text-3xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Build Your Reputation
              </h2>
              <p className="text-white/60 mb-8 text-sm">
                Rate creators privately. Prove your reputation on-chain. Bid on premium content slots.
                All backed by Pedersen commitments and BHP256 sealed bids on Aleo.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/explore">
                  <Button variant="accent" size="lg" className="rounded-full shadow-accent-lg">
                    Explore Creators
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/docs">
                  <Button variant="secondary" size="lg" className="rounded-full">
                    Technical Docs
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── Contract Details Footer ──────────────────────────────────────── */}
      <section className="py-8 border-t border-border/50">
        <Container>
          <div className="grid gap-4 sm:grid-cols-3 text-center">
            <div>
              <p className="text-2xl font-bold text-white">9</p>
              <p className="text-xs text-white/40">Transitions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">14</p>
              <p className="text-xs text-white/40">Mappings</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">3</p>
              <p className="text-xs text-white/40">Record Types</p>
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-xs text-white/30 font-mono">{MARKETPLACE_PROGRAM_ID}</p>
          </div>
        </Container>
      </section>
    </PageTransition>
  )
}
