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

// Static styles to prevent re-renders
const LETTER_SPACING_STYLE = { letterSpacing: '-0.03em' } as const

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
      'Subscription passes as private governance tokens. Prove DAO membership and vote without revealing your wallet address or voting history to other members.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: Ticket,
    title: 'Event Ticketing',
    description:
      'Private event access without identity exposure. Prove you hold a valid ticket at the door without revealing who purchased it or what else you attend.',
    color: 'text-white/60',
    bg: 'bg-white/[0.04]',
  },
  {
    icon: Code2,
    title: 'Developer SDK',
    description:
      'Embeddable privacy subscription for any Aleo app. Any program can verify subscription access to gate features behind private pass ownership — zero integration friction.',
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
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-8 sm:pb-16">
            <m.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6">
                <Code2 className="w-4 h-4 text-white/60" aria-hidden="true" />
                <span className="text-sm text-white/60">Beyond Subscriptions</span>
              </div>
              <h1
                className="text-3xl sm:text-4xl font-serif italic text-white mb-6"
                style={LETTER_SPACING_STYLE}
              >
                Vision &amp; Use Cases
              </h1>
              <p className="text-lg text-white/60 max-w-2xl mx-auto">
                VeilSub is more than a subscription platform — it&apos;s a building block for private
                access control on Aleo. Any app can verify subscription access to gate features
                behind private pass ownership. Verification checks only whether a pass has been
                revoked — your wallet address is never stored publicly. Third-party integrations
                inherit VeilSub&apos;s guarantee: subscriber identities are mathematically impossible
                to recover.
              </p>
            </m.div>
          </div>
        </section>

        {/* Use Cases Grid */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {USE_CASES.map((useCase, i) => {
                const Icon = useCase.icon
                return (
                  <GlassCard key={useCase.title} shimmer delay={i * 0.08}>
                    <div className={`w-12 h-12 rounded-xl ${useCase.bg} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${useCase.color}`} aria-hidden="true" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">{useCase.title}</h3>
                    <p className="text-sm text-white/60 leading-relaxed">
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
            <m.div {...fadeUp} animate="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">Composable Privacy Primitive</h2>
              <p className="text-white/60 max-w-2xl mx-auto">
                Any Aleo app can verify subscription access — a private check that only looks up
                whether a pass has been revoked. Your identity never enters public state.
              </p>
            </m.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { stat: '27', label: 'Actions', desc: 'Complete subscription lifecycle' },
                { stat: '25', label: 'On-Chain Records', desc: 'Aggregate-only public data' },
                { stat: '0', label: 'Identity Leaks', desc: 'Subscriber addresses never stored publicly' },
              ].map((item, i) => (
                <m.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center p-4 rounded-xl glass hover:border-border-accent transition-colors"
                >
                  <p className="text-3xl font-bold text-white">
                    {item.stat}
                  </p>
                  <p className="text-sm font-medium text-white mt-1">{item.label}</p>
                  <p className="text-xs text-white/60 mt-1">{item.desc}</p>
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <m.div {...fadeUp} animate="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">Roadmap</h2>
              <p className="text-white/70">From buildathon to production.</p>
            </m.div>

            <div className="space-y-4">
              {[
                {
                  phase: 'Wave 2',
                  status: 'done',
                  summary: 'Core infrastructure',
                  items: ['Multi-token support (v8)', 'CreatorReceipt + AuditToken records', 'Content hash storage', 'Walletless explorer', 'Mobile navigation']
                },
                {
                  phase: 'Wave 3',
                  status: 'current',
                  summary: 'v27 deployed on testnet',
                  highlight: '27 actions • 25 on-chain records • 6 private data types • 866 lines of logic',
                  items: ['Scoped verification tokens (selective sharing)', 'Trial passes with rate-limiting', 'ZERO wallet addresses stored publicly', 'All data indexed by one-way hashes', 'Sealed commit-reveal tipping', 'Blind renewal + subscription transfer']
                },
                {
                  phase: 'Wave 4',
                  status: 'next',
                  summary: 'Enhanced privacy',
                  items: ['Private tier selection', 'Decoy subscriber hashes', 'Batch subscriptions', 'TypeScript SDK']
                },
                {
                  phase: 'Mainnet',
                  status: 'future',
                  summary: 'Production ready',
                  items: ['Production deployment', 'DAO governance', 'Mobile wallet support']
                },
              ].map((item, i) => (
                <m.div
                  key={item.phase}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-start gap-4 p-8 rounded-xl border ${
                    item.status === 'current'
                      ? 'bg-white/[0.04] border-white/15'
                      : 'bg-surface-1 border-border'
                  }`}
                >
                  <div className={`shrink-0 mt-1 w-4 h-4 rounded-full ${
                    item.status === 'done' ? 'bg-green-400' :
                    item.status === 'current' ? 'bg-white animate-pulse ring-4 ring-white/20' :
                    item.status === 'next' ? 'bg-white/30' : 'bg-white/15'
                  }`} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="text-base font-semibold text-white">{item.phase}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.status === 'done' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        item.status === 'current' ? 'bg-white/[0.08] text-white/70 border border-white/15' :
                        item.status === 'next' ? 'bg-white/[0.05] text-white/60 border border-border' :
                        'bg-white/[0.02] text-white/50 border border-border'
                      }`}>
                        {item.status === 'done' ? 'Complete' : item.status === 'current' ? 'In Progress' : item.status === 'next' ? 'Planned' : 'Future'}
                      </span>
                      <span className="text-sm text-white/60">— {item.summary}</span>
                    </div>
                    {'highlight' in item && item.highlight && (
                      <p className="text-xs font-mono text-white/70 bg-white/[0.04] px-2 py-1 rounded mb-2 inline-block">
                        {item.highlight}
                      </p>
                    )}
                    <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                      {item.items.map((feature) => (
                        <li key={feature} className="text-sm text-white/60 flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-white/40" />
                          {feature}
                        </li>
                      ))}
                    </ul>
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
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl glass p-8 sm:p-12 text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-4">
                  <Shield className="w-3.5 h-3.5 text-white/60" aria-hidden="true" />
                  <span className="text-xs text-white/60">Privacy by Default</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-4">
                  Ready to explore?
                </h2>
                <p className="text-white/60 max-w-lg mx-auto mb-6">
                  Try VeilSub on Aleo Testnet—connect a wallet, subscribe to a creator, and verify your privacy guarantees on-chain.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 transition-all active:scale-[0.98] btn-shimmer"
                  >
                    Explore Creators
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
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
