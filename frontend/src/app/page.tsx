'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Eye,
  EyeOff,
  Wallet,
  UserCheck,
  Lock,
  ArrowRight,
  Zap,
  ChevronRight,
  Code,
  Github,
  User,
  Search,
  Users,
  Coins,
} from 'lucide-react'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import PageTransition from '@/components/PageTransition'
import FloatingOrbs from '@/components/FloatingOrbs'
import AnimatedCounter from '@/components/AnimatedCounter'
import UseCaseCard from '@/components/UseCaseCard'
import { FEATURED_CREATORS } from '@/lib/config'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { shortenAddress, formatCredits } from '@/lib/utils'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

function FeaturedCreatorCard({ address, label }: { address: string; label: string }) {
  const { fetchCreatorStats } = useCreatorStats()
  const [stats, setStats] = useState<{ subscriberCount: number; tierPrice: number | null } | null>(null)

  useEffect(() => {
    fetchCreatorStats(address).then((s) => setStats(s))
  }, [address, fetchCreatorStats])

  return (
    <Link
      href={`/creator/${address}`}
      className="block p-5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-violet-500/30 transition-all group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-medium text-sm">{label}</p>
          <p className="text-xs text-slate-500 font-mono">{shortenAddress(address)}</p>
        </div>
      </div>
      {stats && stats.tierPrice !== null && (
        <div className="flex gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-violet-400" />
            {stats.subscriberCount} subscribers
          </span>
          <span className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-green-400" />
            {formatCredits(stats.tierPrice)} ALEO base
          </span>
        </div>
      )}
      <div className="mt-3 text-xs text-violet-400 group-hover:text-violet-300 flex items-center gap-1">
        View creator page <ArrowRight className="w-3 h-3" />
      </div>
    </Link>
  )
}

function ExploreCreatorSection() {
  const [searchAddress, setSearchAddress] = useState('')
  const router = useRouter()

  const handleSearch = () => {
    const trimmed = searchAddress.trim()
    if (trimmed.startsWith('aleo1') && trimmed.length > 10) {
      router.push(`/creator/${trimmed}`)
    }
  }

  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            Explore a Creator
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Enter any creator&apos;s Aleo address to view their page, subscription tiers, and exclusive content.
          </p>
        </motion.div>

        {/* Featured Creators */}
        {FEATURED_CREATORS.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {FEATURED_CREATORS.map((fc) => (
              <FeaturedCreatorCard key={fc.address} address={fc.address} label={fc.label} />
            ))}
          </div>
        )}

        {/* Search Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="aleo1..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchAddress.trim().startsWith('aleo1')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium text-sm hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Go
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Know a creator&apos;s address? Paste it above to visit their page.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

export default function HomePage() {
  const { connected } = useWallet()

  return (
    <PageTransition className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <FloatingOrbs />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20">
                <Shield className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-violet-300">
                  Powered by Aleo Zero-Knowledge Proofs
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">
                  Built for the Aleo Privacy Buildathon
                </span>
              </div>
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-violet-200 to-purple-300 bg-clip-text text-transparent">
                Subscribe Privately.
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
                Prove Access.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Support your favorite creators without revealing your identity.
              Powered by Aleo&apos;s programmable privacy.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              {connected ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm">
                  Connect wallet to get started
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                The Problem with Public Subscriptions
              </h2>
              <p className="text-slate-400 leading-relaxed">
                Every major subscription platform exposes who supports whom.
                Your Patreon pledges, your Ko-fi supporters, your YouTube memberships
                — all publicly linked to your identity. Fans fear judgment for what
                they support. Creators lose subscribers who value privacy.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                <Eye className="w-5 h-5 text-red-400 mt-1 shrink-0" />
                <div>
                  <p className="text-white font-medium mb-1">
                    Traditional Platforms
                  </p>
                  <p className="text-sm text-slate-400">
                    Subscriber lists are public. Transaction history is permanent.
                    Everyone knows who pays whom.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <EyeOff className="w-5 h-5 text-green-400 mt-1 shrink-0" />
                <div>
                  <p className="text-white font-medium mb-1">VeilSub</p>
                  <p className="text-sm text-slate-400">
                    Subscriber identity is never exposed. Creators see aggregate
                    revenue, not individual supporters. Privacy by design.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-slate-400">
              Four steps to private subscriptions.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Wallet,
                title: 'Connect Wallet',
                desc: 'Link your Shield Wallet with one click. Your address stays private.',
              },
              {
                icon: UserCheck,
                title: 'Find a Creator',
                desc: 'Browse creators and see public stats: price and subscriber count.',
              },
              {
                icon: Lock,
                title: 'Subscribe Privately',
                desc: 'Pay with ALEO credits. A private AccessPass record appears in your wallet.',
              },
              {
                icon: Zap,
                title: 'Prove Access',
                desc: 'Show your AccessPass to unlock content — without revealing your identity. Subscriptions last ~30 days with private renewal.',
              },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative p-6 rounded-xl bg-white/[0.02] border border-white/5 hover:border-violet-500/20 transition-all group"
                >
                  <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-violet-300">
                      {i + 1}
                    </span>
                  </div>
                  <Icon className="w-8 h-8 text-violet-400 mb-4 group-hover:text-violet-300 transition-colors" />
                  <h3 className="text-white font-semibold mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-400">{step.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Privacy Architecture */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Privacy Architecture
            </h2>
            <p className="text-slate-400">
              What stays hidden vs. what&apos;s publicly verifiable.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-xl bg-violet-500/5 border border-violet-500/20"
            >
              <div className="flex items-center gap-2 mb-4">
                <EyeOff className="w-5 h-5 text-violet-400" />
                <h3 className="text-white font-semibold">
                  Private (ZK Records)
                </h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Subscriber identity — never exposed on-chain',
                  'Subscription relationship — creator cannot enumerate subscribers',
                  'Payment details — hidden in private credit transfers (95% creator, 5% platform)',
                  'AccessPass with expiry — only your wallet can see it',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-slate-300"
                  >
                    <Shield className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-xl bg-white/[0.02] border border-white/10"
            >
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-slate-400" />
                <h3 className="text-white font-semibold">
                  Public (Verifiable Mappings)
                </h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Creator tier price — set by creator, publicly visible',
                  'Total subscriber count — aggregate only, no individual IDs',
                  'Total revenue + platform revenue — aggregate only',
                  'Content metadata — existence and tier, not content body',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-slate-300"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Privacy in Action — Stats */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Privacy in Action
            </h2>
            <p className="text-slate-400">
              Protocol guarantees enforced by the Leo smart contract.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter target={100} suffix="%" />
              </div>
              <p className="text-sm text-slate-400">
                Subscriber Identity Hidden
              </p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter target={6} />
              </div>
              <p className="text-sm text-slate-400">
                On-Chain Transitions
              </p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter target={0} suffix=" data leaks" />
              </div>
              <p className="text-sm text-slate-400">
                Zero Public Subscriber Data
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore a Creator */}
      <ExploreCreatorSection />

      {/* Who Uses VeilSub? */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Who Uses VeilSub?
            </h2>
            <p className="text-slate-400">
              Privacy matters for everyone — from creators to supporters.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            <UseCaseCard
              persona="The Whistleblower"
              avatar="W"
              quote="I support investigative journalists without fear of retaliation."
              useCase="Anonymously funds watchdog creators."
              delay={0}
            />
            <UseCaseCard
              persona="The Digital Artist"
              avatar="A"
              quote="My fans subscribe without their boss knowing what art they enjoy."
              useCase="NSFW-safe creator monetization."
              delay={0.1}
            />
            <UseCaseCard
              persona="The Researcher"
              avatar="R"
              quote="I share paid analysis without revealing who funds my work."
              useCase="Independent research funding."
              delay={0.2}
            />
            <UseCaseCard
              persona="The Activist"
              avatar="X"
              quote="Supporting human rights organizations in restrictive regimes."
              useCase="Censorship-resistant donations."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            {...fadeUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Build or Subscribe?
            </h2>
            <p className="text-slate-400 mb-8">
              Join as a creator to monetize privately, or subscribe to support
              creators without revealing your identity.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
              >
                Become a Creator
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/Pratiikpy/VeilSub"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
              >
                <Code className="w-4 h-4" />
                View Source
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Built By */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            {...fadeUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Built By</h2>
            <div className="inline-flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Prateek</p>
                <p className="text-sm text-slate-400">Full-stack developer + creator (6.4K followers)</p>
                <p className="text-xs text-slate-500 mt-1">New entry for Aleo Privacy Buildathon — Wave 2</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-slate-400">
                VeilSub — Private Creator Subscriptions
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Built on Aleo</span>
              <span>|</span>
              <a
                href="https://explorer.aleo.org/testnet/program/veilsub_v4.aleo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300"
              >
                Explorer
              </a>
              <span>|</span>
              <a
                href="https://github.com/Pratiikpy/VeilSub"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
              >
                <Github className="w-3 h-3" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </PageTransition>
  )
}
