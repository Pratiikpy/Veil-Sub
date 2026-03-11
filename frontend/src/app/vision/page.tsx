'use client'

import { m } from 'framer-motion'
import Link from 'next/link'
import {
  Newspaper,
  Palette,
  GraduationCap,
  Vote,
  Ticket,
  Code2,
  ArrowRight,
  Shield,
} from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'

const USE_CASES = [
  {
    icon: Newspaper,
    title: 'Anonymous Journalism',
    description:
      'Protect whistleblower supporters and investigative journalism backers. Subscribers fund critical reporting without fear of retaliation—their identity never appears on-chain.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Palette,
    title: 'Private Creator Monetization',
    description:
      'Content creators in sensitive niches—adult content, political commentary, controversial art—monetize without exposing their supporters to social stigma.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  {
    icon: GraduationCap,
    title: 'Research Access',
    description:
      'Institutional researchers subscribe anonymously to journals, datasets, and knowledge bases. Competitor intelligence stays private. No subscription metadata leaks.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Vote,
    title: 'DAO Membership',
    description:
      'AccessPass records as private governance tokens. Prove DAO membership and vote without revealing your wallet address or voting history to other members.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: Ticket,
    title: 'Event Ticketing',
    description:
      'ZK-proven event access without identity exposure. Prove you hold a valid ticket at the door without revealing who purchased it or what else you attend.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Code2,
    title: 'Developer SDK',
    description:
      'Embeddable privacy subscription primitive for any Aleo dApp. Any program can call verify_access to gate features behind private AccessPass ownership—zero integration friction.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
]

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function VisionPage() {
  return (
    <PageTransition>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            <m.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/[0.08] border border-violet-500/[0.15] mb-6">
                <Code2 className="w-4 h-4 text-violet-400" aria-hidden="true" />
                <span className="text-sm text-violet-300/90">Beyond Subscriptions</span>
              </div>
              <h1
                className="text-4xl sm:text-6xl font-serif italic text-white mb-6"
                style={{ letterSpacing: '-0.03em' }}
              >
                Vision &amp; Use Cases
              </h1>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                VeilSub is more than a subscription platform—it&apos;s a composable zero-knowledge access
                control primitive using Aleo records. Any program can call verify_access to gate features
                behind AccessPass ownership. v27&apos;s minimal-footprint finalize is a single access_revoked
                mapping read keyed by pass_id (a field, never an address). Third-party integrations inherit
                VeilSub&apos;s guarantee: subscriber addresses are cryptographically impossible to reach any
                finalize block.
              </p>
            </m.div>
          </div>
        </section>

        {/* Use Cases Grid */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {USE_CASES.map((useCase, i) => {
                const Icon = useCase.icon
                return (
                  <GlassCard key={useCase.title} shimmer delay={i * 0.08}>
                    <div className={`w-12 h-12 rounded-xl ${useCase.bg} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${useCase.color}`} aria-hidden="true" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">{useCase.title}</h3>
                    <p className="text-sm text-white/70 leading-relaxed">
                      {useCase.description}
                    </p>
                  </GlassCard>
                )
              })}
            </div>
          </div>
        </section>

        {/* Composability Section */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <m.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">Composable Privacy Primitive</h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                Any Aleo program can verify AccessPass ownership via <code className="px-1 py-0.5 rounded bg-white/10 text-white/70 text-xs">verify_access</code> —
                a minimal-footprint transition whose finalize only checks revocation—subscriber identity never enters public state.
              </p>
            </m.div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { stat: '27', label: 'Transitions', desc: 'Complete subscription lifecycle' },
                { stat: '25', label: 'Mappings', desc: 'Aggregate-only public state' },
                { stat: '0', label: 'Identity Leaks', desc: 'Subscriber addresses never in finalize' },
              ].map((item, i) => (
                <m.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-4 rounded-xl glass hover:border-border-accent transition-colors"
                >
                  <p className="text-3xl font-bold text-white">
                    {item.stat}
                  </p>
                  <p className="text-sm font-medium text-white mt-1">{item.label}</p>
                  <p className="text-xs text-white/60 mt-0.5">{item.desc}</p>
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <m.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">Roadmap</h2>
              <p className="text-white/70">From buildathon to production.</p>
            </m.div>

            <div className="space-y-4">
              {[
                { phase: 'Wave 2', status: 'done', items: 'v8 multi-token, CreatorReceipt, AuditToken, content hashes, walletless explorer, mobile nav' },
                { phase: 'Wave 3', status: 'current', items: 'v27 on testnet (27 transitions, 25 mappings, 6 records, 5 structs): scoped audit tokens, trial rate-limiting, gift revocation fix, ZERO addresses in finalize, Poseidon2 field-hashed mapping keys, commit-reveal tipping, blind renewal, gifting, disputes, subscription transfer, trial passes, content auth, expiry enforcement, prove_subscriber_threshold' },
                { phase: 'Wave 4', status: 'next', items: 'Private tier selection, decoy subscriber hashes, creator analytics dashboard, batch subscriptions, TypeScript SDK' },
                { phase: 'Mainnet', status: 'future', items: 'Production deployment, TypeScript SDK, DAO governance, mobile wallet support' },
              ].map((item, i) => (
                <m.div
                  key={item.phase}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-surface-1 border border-border"
                >
                  <div className={`shrink-0 mt-0.5 w-3 h-3 rounded-full ${
                    item.status === 'done' ? 'bg-green-400' :
                    item.status === 'current' ? 'bg-violet-400 animate-pulse' :
                    item.status === 'next' ? 'bg-white/30' : 'bg-white/15'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{item.phase}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        item.status === 'done' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        item.status === 'current' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                        item.status === 'next' ? 'bg-white/[0.05] text-white/60 border border-border' :
                        'bg-white/[0.02] text-white/60 border border-border'
                      }`}>
                        {item.status === 'done' ? 'Complete' : item.status === 'current' ? 'In Progress' : item.status === 'next' ? 'Planned' : 'Future'}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 mt-0.5">{item.items}</p>
                  </div>
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative rounded-3xl glass p-8 sm:p-12 text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] to-transparent pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/[0.08] border border-violet-500/[0.15] mb-4">
                  <Shield className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-violet-300/90">Privacy by Default</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3">
                  Ready to explore?
                </h2>
                <p className="text-white/70 max-w-lg mx-auto mb-6">
                  Try VeilSub on Aleo Testnet—connect a wallet, subscribe to a creator, and verify your privacy guarantees on-chain.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 transition-all active:scale-[0.98] btn-shimmer"
                  >
                    Explore Creators
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/docs"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/[0.05] border border-border text-white text-sm hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                  >
                    Read the Docs
                  </Link>
                </div>
              </div>
            </m.div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
