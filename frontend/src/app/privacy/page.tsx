'use client'

import { motion } from 'framer-motion'
import {
  Shield,
  EyeOff,
  Eye,
  Lock,
  Fingerprint,
  Server,
  FileCode,
  ShieldCheck,
  Database,
  Layers,
} from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import FloatingOrbs from '@/components/FloatingOrbs'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function PrivacyPage() {
  return (
    <PageTransition>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <FloatingOrbs />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
                <Shield className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-violet-300">Zero-Knowledge Privacy</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-white via-violet-200 to-purple-300 bg-clip-text text-transparent">
                  How VeilSub Protects You
                </span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Built on Aleo&apos;s zero-knowledge proof system. Your subscription
                identity is mathematically impossible to expose.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ZK Explainer */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">What Are Zero-Knowledge Proofs?</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                A ZK proof lets you prove something is true without revealing the underlying data.
                Like proving you&apos;re over 21 without showing your ID.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              <GlassCard shimmer delay={0}>
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                  <Fingerprint className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Prove Without Revealing</h3>
                <p className="text-sm text-slate-400">
                  When you subscribe, a ZK proof confirms your payment is valid without exposing
                  your wallet address, amount, or any identifying information to the public ledger.
                </p>
              </GlassCard>

              <GlassCard shimmer delay={0.1}>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Encrypted Records</h3>
                <p className="text-sm text-slate-400">
                  Your AccessPass is a private record encrypted with your wallet key. Only you
                  can see or use it. Not even the creator, not even Aleo validators.
                </p>
              </GlassCard>

              <GlassCard shimmer delay={0.2}>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Mathematically Guaranteed</h3>
                <p className="text-sm text-slate-400">
                  Privacy isn&apos;t a policy — it&apos;s enforced by cryptographic math.
                  The Leo program physically cannot leak your identity. There&apos;s no backdoor.
                </p>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Private vs Public */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">What&apos;s Private vs. Public</h2>
              <p className="text-slate-400">
                Full transparency on what stays hidden and what&apos;s verifiable.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Private Column */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                    <EyeOff className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Private Data</h3>
                    <p className="text-xs text-slate-500">ZK Records — only you can see</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Subscriber Identity',
                      desc: 'Your wallet address never enters the finalize scope. It is physically impossible for it to appear in any public mapping.',
                      icon: Fingerprint,
                    },
                    {
                      title: 'Subscription Relationship',
                      desc: 'Creators cannot enumerate who subscribes. They only see a total count — never individual addresses.',
                      icon: Layers,
                    },
                    {
                      title: 'Payment Amount Per Subscriber',
                      desc: 'All payments use credits.aleo/transfer_private. Individual payment amounts are hidden on-chain.',
                      icon: Lock,
                    },
                    {
                      title: 'AccessPass Ownership',
                      desc: 'Your AccessPass record is encrypted with your wallet key. Only your wallet can decrypt and display it.',
                      icon: Shield,
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.title}
                        className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-violet-400" />
                          <span className="text-sm font-medium text-white">{item.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>

              {/* Public Column */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-slate-500/15 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Public Data</h3>
                    <p className="text-xs text-slate-500">Mappings — verifiable by everyone</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Creator Tier Price',
                      desc: 'Set by the creator and publicly visible so subscribers can see pricing before connecting.',
                      icon: Database,
                    },
                    {
                      title: 'Total Subscriber Count',
                      desc: 'An aggregate counter only. Shows "47 subscribers" — not which addresses subscribed.',
                      icon: Server,
                    },
                    {
                      title: 'Total Revenue',
                      desc: 'Aggregate ALEO earned. No per-subscriber breakdown. Proves payments are real.',
                      icon: Database,
                    },
                    {
                      title: 'Program Source Code',
                      desc: 'The Leo program is fully open-source and deployed on-chain. Anyone can audit it.',
                      icon: FileCode,
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.title}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-white">{item.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Trust Model */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Trust Model</h2>
              <p className="text-slate-400">Who trusts what, and why it works.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              <GlassCard delay={0}>
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <EyeOff className="w-7 h-7 text-green-400" />
                  </div>
                  <h3 className="text-white font-semibold">Subscribers Trust</h3>
                </div>
                <p className="text-sm text-slate-400 text-center">
                  Aleo&apos;s ZK proving system ensures your identity never leaks. The Leo
                  program has no pathway for subscriber addresses to enter finalize
                  scope or public mappings. This is verified in the source code.
                </p>
              </GlassCard>

              <GlassCard delay={0.1}>
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold">Creators Trust</h3>
                </div>
                <p className="text-sm text-slate-400 text-center">
                  Real <code className="px-1 py-0.5 rounded bg-white/10 text-violet-300 text-xs">credits.aleo/transfer_private</code> transfers
                  guarantee payment arrives. Aggregate stats are provably correct via
                  on-chain mappings.
                </p>
              </GlassCard>

              <GlassCard delay={0.2}>
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                    <FileCode className="w-7 h-7 text-violet-400" />
                  </div>
                  <h3 className="text-white font-semibold">Auditors Verify</h3>
                </div>
                <p className="text-sm text-slate-400 text-center">
                  All code is open-source. The deployed program is visible on the Aleo
                  explorer. Transactions are verifiable. No private data appears in any
                  public scope.
                </p>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Threat Model */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Privacy Threat Model</h2>
              <p className="text-slate-400">
                Honest analysis of what an adversary could and cannot learn.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <GlassCard delay={0}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-white font-semibold">What an Adversary Could Learn</h3>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      title: 'Timing Correlation',
                      desc: 'When subscriber_count increments, an observer can correlate the timestamp — narrowing down when a subscription occurred.',
                    },
                    {
                      title: 'Amount Inference',
                      desc: 'If total_revenue jumps by exactly 5x the base price, an observer may infer a VIP subscription. Mitigated by overlapping transactions adding noise.',
                    },
                    {
                      title: 'Network Metadata',
                      desc: 'Aleo gossip does not provide IP anonymity. Users should use VPN/Tor for network-level privacy. This applies to all blockchains.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <p className="text-sm font-medium text-amber-300 mb-1">{item.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard delay={0.1}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <EyeOff className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-white font-semibold">What an Adversary Cannot Learn</h3>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      title: 'Subscriber Identity',
                      desc: 'Wallet addresses never enter finalize scope. The Leo compiler enforces this — there is no code path to leak identity.',
                    },
                    {
                      title: 'Subscription Relationships',
                      desc: 'There is no on-chain mapping from subscriber → creator. Even with full chain access, relationships are unknowable.',
                    },
                    {
                      title: 'Individual Payment Amounts',
                      desc: 'All payments use credits.aleo/transfer_private. Per-subscriber amounts are hidden in the ZK proof.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                      <p className="text-sm font-medium text-green-300 mb-1">{item.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <GlassCard delay={0.2}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="text-white font-semibold">What We Mitigate</h3>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      title: 'API Proxy',
                      desc: 'All mapping reads go through Next.js rewrites, preventing browser→Provable IP correlation.',
                    },
                    {
                      title: 'No Subscriber Data in Finalize',
                      desc: 'Finalize only receives creator address, amount, and tier. Subscriber identity has no pathway to public state.',
                    },
                    {
                      title: 'Finalize Parameter Tradeoff',
                      desc: 'Tier and amount are public in finalize — this is required for on-chain payment validation (validators must enforce correct pricing). The subscriber ADDRESS is the privacy-critical value and it never touches finalize. Skipping validation would allow paying base price for VIP access.',
                    },
                    {
                      title: 'Zero-Footprint Access Verification',
                      desc: 'verify_access has NO finalize block. When proving access, zero public state changes occur — no mapping writes, no counters, no on-chain evidence. This prevents timing correlation attacks from tracking when access was verified.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                      <p className="text-sm font-medium text-violet-300 mb-1">{item.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard delay={0.3}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-white font-semibold">Honest Limitations</h3>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      title: 'Wallet Key Loss',
                      desc: 'AccessPasses are unrecoverable without your private key. This is the fundamental privacy/recoverability tradeoff in ZK systems.',
                    },
                    {
                      title: 'No Subscription Expiry',
                      desc: 'AccessPasses are permanent. Time-based expiry would require adding finalize to verify_access, breaking its zero-public-footprint property.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-sm font-medium text-slate-300 mb-1">{item.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Code Proof */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Privacy in the Code</h2>
              <p className="text-slate-400">How each transition protects your identity.</p>
            </motion.div>

            <div className="space-y-4">
              {[
                {
                  fn: 'subscribe()',
                  guarantee: 'Finalize receives only creator address and amount — subscriber address is never passed to any public scope.',
                },
                {
                  fn: 'verify_access()',
                  guarantee: 'Pure transition with no finalize — no public state change when proving access. Zero on-chain footprint.',
                },
                {
                  fn: 'tip()',
                  guarantee: 'Finalize only updates aggregate total_revenue — tipper address stays completely private.',
                },
                {
                  fn: 'All payments',
                  guarantee: 'Use credits.aleo/transfer_private — not public transfers. Amount and sender are hidden on-chain.',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.fn}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/20 transition-colors"
                >
                  <code className="shrink-0 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-mono">
                    {item.fn}
                  </code>
                  <p className="text-sm text-slate-400 pt-1">{item.guarantee}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">VeilSub vs. Traditional Platforms</h2>
            </motion.div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Feature</th>
                    <th className="text-center py-3 px-4 text-red-400 font-medium">Patreon / Ko-fi</th>
                    <th className="text-center py-3 px-4 text-green-400 font-medium">VeilSub</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {[
                    ['Subscriber identity', 'Public', 'Private (ZK)'],
                    ['Transaction history', 'Permanent & visible', 'Hidden on-chain'],
                    ['Creator sees who subscribes', 'Yes — full list', 'No — aggregate only'],
                    ['Payment privacy', 'Bank/card linked', 'Private credit transfer'],
                    ['Third-party data access', 'Platform sells data', 'No data to sell'],
                    ['Censorship resistance', 'Platform can ban', 'On-chain, unstoppable'],
                  ].map(([feature, trad, veilsub]) => (
                    <tr key={feature} className="border-b border-white/5">
                      <td className="py-3 px-4 text-white">{feature}</td>
                      <td className="py-3 px-4 text-center text-red-300/70">{trad}</td>
                      <td className="py-3 px-4 text-center text-green-300">{veilsub}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
