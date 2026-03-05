'use client'

import { motion } from 'framer-motion'
import {
  Newspaper,
  Palette,
  GraduationCap,
  Vote,
  Ticket,
  Code2,
} from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'

const USE_CASES = [
  {
    icon: Newspaper,
    title: 'Anonymous Journalism',
    description:
      'Protect whistleblower supporters and investigative journalism backers. Subscribers fund critical reporting without fear of retaliation — their identity never appears on-chain.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Palette,
    title: 'Private Creator Monetization',
    description:
      'Content creators in sensitive niches — adult content, political commentary, controversial art — monetize without exposing their supporters to social stigma.',
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
      'Embeddable privacy subscription primitive for any Aleo dApp. Any program can call verify_access to gate features behind private AccessPass ownership — zero integration friction.',
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
            <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/[0.08] border border-violet-500/[0.15] mb-6">
                <Code2 className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-violet-300/90">Beyond Subscriptions</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight mb-6">
                <span className="text-white">
                  Vision & Use Cases
                </span>
              </h1>
              <p className="text-lg text-[#a1a1aa] max-w-2xl mx-auto">
                VeilSub is more than a subscription platform — it&apos;s a reusable
                zero-knowledge access control primitive. The AccessPass record can gate
                anything.
              </p>
            </motion.div>
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
                    <div className={`w-12 h-12 rounded-[12px] ${useCase.bg} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${useCase.color}`} />
                    </div>
                    <h3 className="text-white font-semibold mb-2">{useCase.title}</h3>
                    <p className="text-sm text-[#a1a1aa] leading-relaxed">
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
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">Composable Privacy Primitive</h2>
              <p className="text-[#a1a1aa] max-w-2xl mx-auto">
                Any Aleo program can verify AccessPass ownership via <code className="px-1 py-0.5 rounded bg-white/10 text-[#a1a1aa] text-xs">verify_access</code> —
                a zero-footprint transition with no finalize, no public state change, and no on-chain evidence.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { stat: '31', label: 'Transitions', desc: 'Complete subscription lifecycle' },
                { stat: '24', label: 'Mappings', desc: 'Aggregate-only public state' },
                { stat: '0', label: 'Identity Leaks', desc: 'Subscriber addresses never in finalize' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-4 rounded-[12px] bg-[#0a0a0a]/70 backdrop-blur-xl border border-violet-500/[0.12] hover:border-violet-500/[0.25] transition-colors"
                >
                  <p className="text-3xl font-bold text-white">
                    {item.stat}
                  </p>
                  <p className="text-sm font-medium text-white mt-1">{item.label}</p>
                  <p className="text-xs text-[#71717a] mt-0.5">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">Roadmap</h2>
              <p className="text-[#a1a1aa]">From buildathon to production.</p>
            </motion.div>

            <div className="space-y-4">
              {[
                { phase: 'Wave 2', status: 'done', items: 'v8 multi-token, CreatorReceipt, AuditToken, content hashes, walletless explorer, mobile nav' },
                { phase: 'Wave 3', status: 'current', items: 'v20 deployed — 31 transitions, 8 records, 30 mappings, deep Poseidon2 optimization, Pedersen commitments, zero-footprint proofs, referral system, analytics epochs, content versioning' },
                { phase: 'Wave 4', status: 'next', items: 'Private tier selection, decoy subscriber hashes, creator analytics dashboard, batch subscriptions, TypeScript SDK' },
                { phase: 'Mainnet', status: 'future', items: 'Production deployment, TypeScript SDK, DAO governance, mobile wallet support' },
              ].map((item, i) => (
                <motion.div
                  key={item.phase}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-[12px] bg-[#0a0a0a] border border-white/[0.08]"
                >
                  <div className={`shrink-0 mt-0.5 w-3 h-3 rounded-full ${
                    item.status === 'done' ? 'bg-green-400' :
                    item.status === 'current' ? 'bg-violet-400 animate-pulse' :
                    item.status === 'next' ? 'bg-slate-500' : 'bg-slate-700'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-white">{item.phase}</p>
                    <p className="text-xs text-[#a1a1aa] mt-0.5">{item.items}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
