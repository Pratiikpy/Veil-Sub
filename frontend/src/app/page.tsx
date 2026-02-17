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
  Sparkles,
  Camera,
} from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import PageTransition from '@/components/PageTransition'
import FloatingOrbs from '@/components/FloatingOrbs'
import AnimatedCounter from '@/components/AnimatedCounter'
import UseCaseCard from '@/components/UseCaseCard'
import QRScanner from '@/components/QRScanner'
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
    let cancelled = false
    fetchCreatorStats(address).then((s) => {
      if (!cancelled) setStats(s)
    })
    return () => { cancelled = true }
  }, [address, fetchCreatorStats])

  return (
    <Link
      href={`/creator/${address}`}
      className="block p-5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-violet-500/30 hover:-translate-y-0.5 transition-all group"
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
  const [showQRScanner, setShowQRScanner] = useState(false)
  const router = useRouter()

  const handleSearch = () => {
    const trimmed = searchAddress.trim()
    if (trimmed.startsWith('aleo1') && trimmed.length > 10) {
      router.push(`/creator/${trimmed}`)
    }
  }

  return (
    <section id="featured" className="py-20">
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
                aria-label="Enter creator Aleo address"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm"
              />
            </div>
            <button
              onClick={() => setShowQRScanner(true)}
              className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-[0.98]"
              aria-label="Scan QR Code"
              title="Scan QR Code"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              onClick={handleSearch}
              disabled={!searchAddress.trim().startsWith('aleo1')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium text-sm hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              Go
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Know a creator&apos;s address? Paste it above or scan a QR code.
          </p>
          <QRScanner isOpen={showQRScanner} onClose={() => setShowQRScanner(false)} />
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
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(139, 92, 246, 0.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20">
                <Shield className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-violet-300">
                  Powered by Aleo Zero-Knowledge Proofs
                </span>
              </div>
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-violet-200 to-purple-300 bg-clip-text text-transparent animate-gradient-text">
                Subscribe Privately.
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent animate-gradient-text">
                Prove Access.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-6">
              The private access layer for the creator economy. Zero-footprint verification. Multi-token payments. Built on Aleo.
            </p>

            {/* Proof badges */}
            <div className="flex items-center justify-center gap-3 flex-wrap mb-10">
              <div className="px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
                <span className="font-semibold">9</span> Transitions
              </div>
              <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                <span className="font-semibold">10</span> Mappings
              </div>
              <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-300">
                <span className="font-semibold">Multi-Token</span>
                <span className="text-green-400/60 ml-1">ALEO + USDCx</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              {connected ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/creator/${FEATURED_CREATORS[0]?.address || ''}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4" />
                    Try as Subscriber
                  </Link>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Link
                    href={`/creator/${FEATURED_CREATORS[0]?.address || ''}`}
                    className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-lg hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_40px_rgba(139,92,246,0.35)] hover:-translate-y-0.5 active:scale-[0.98] pulse-glow"
                  >
                    Try Live Demo
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <p className="text-xs text-slate-500">No wallet needed to browse. Connect to subscribe.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Statement */}
      <div className="gradient-divider" />
      <section className="py-16">
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
      <div className="gradient-divider" />
      <section className="py-20">
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
                desc: 'Link your Leo Wallet with one click. Your address stays private.',
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
      <div className="gradient-divider" />
      <section className="py-20">
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
              className="p-6 rounded-xl bg-violet-500/5 border border-violet-500/20 hover:border-violet-500/30 transition-all"
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
              className="p-6 rounded-xl bg-white/[0.02] border border-white/10 hover:border-violet-500/30 transition-all"
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

      {/* Why This Is Impossible on Transparent Chains */}
      <div className="gradient-divider" />
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Why This Is Impossible on Transparent Chains
            </h2>
            <p className="text-slate-400">
              These privacy guarantees are enforced by the Leo compiler — not by policy.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Shield,
                title: 'Subscriber address never enters public state',
                desc: 'On EVM chains, every subscription creates a visible transaction. On Aleo, subscriber addresses never reach finalize scope — enforced by the Leo compiler.',
              },
              {
                icon: EyeOff,
                title: 'Access verification leaves zero on-chain trace',
                desc: 'verify_access has no finalize block. When you prove access, zero public state changes occur.',
              },
              {
                icon: Lock,
                title: 'All payments are cryptographically hidden',
                desc: 'Both ALEO and ARC-20 payments use transfer_private. No transaction graph links subscribers to creators.',
              },
              {
                icon: Sparkles,
                title: 'No subscription graph exists to analyze',
                desc: 'AccessPasses are encrypted records. Even validators cannot see who subscribed to whom.',
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-violet-500/20 transition-all"
                >
                  <Icon className="w-5 h-5 text-violet-400 mb-3" />
                  <p className="text-sm font-semibold text-white mb-1.5">{item.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Privacy in Action — Stats */}
      <div className="gradient-divider" />
      <section className="py-20">
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
            <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 transition-all">
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter target={100} suffix="%" />
              </div>
              <p className="text-sm text-slate-400">
                Subscriber Identity Hidden
              </p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 transition-all">
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter target={9} />
              </div>
              <p className="text-sm text-slate-400">
                On-Chain Transitions
              </p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 transition-all">
              <div className="text-4xl font-bold text-green-400 mb-2">
                Zero
              </div>
              <p className="text-sm text-slate-400">
                Public Subscriber Data
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore a Creator */}
      <div className="gradient-divider" />
      <ExploreCreatorSection />

      {/* Who Uses VeilSub? */}
      <div className="gradient-divider" />
      <section className="py-20">
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
      <div className="gradient-divider" />
      <section className="py-20">
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
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Become a Creator
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/Pratiikpy/Veil-Sub"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors active:scale-[0.98]"
              >
                <Code className="w-4 h-4" />
                View Source
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why This Matters */}
      <div className="gradient-divider" />
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Why This Matters
            </h2>
            <p className="text-slate-400">
              Privacy isn&apos;t a feature — it&apos;s a fundamental right.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Shield,
                persona: 'Political dissident',
                scenario: 'Support independent journalism without your government knowing.',
              },
              {
                icon: EyeOff,
                persona: 'Investigative journalist',
                scenario: 'Accept tips from sources who must stay anonymous.',
              },
              {
                icon: Lock,
                persona: 'DAO governance',
                scenario: 'Vote with your wallet without revealing your identity to other members.',
              },
              {
                icon: UserCheck,
                persona: 'Research supporter',
                scenario: 'Fund controversial research without professional backlash.',
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.persona}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-violet-500/20 transition-all"
                >
                  <Icon className="w-5 h-5 text-violet-400 mb-3" />
                  <p className="text-sm font-medium text-white mb-1.5">{item.persona}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.scenario}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Built By */}
      <div className="gradient-divider" />
      <section className="py-16">
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
      <div className="gradient-divider" />
      <footer className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-white">VeilSub</span>
              </div>
              <p className="text-sm text-slate-500 mb-3">
                Private creator subscriptions powered by zero-knowledge proofs on Aleo.
              </p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Testnet Live
              </span>
            </div>

            {/* Quick Links */}
            <div>
              <p className="text-sm font-medium text-white mb-3">Quick Links</p>
              <div className="space-y-2">
                {[
                  { href: '/privacy', label: 'Privacy Model' },
                  { href: '/docs', label: 'Documentation' },
                  { href: '/explorer', label: 'On-Chain Explorer' },
                  { href: '/verify', label: 'Verify Access' },
                  { href: '/explore', label: 'Explore Creators' },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-sm text-slate-400 hover:text-violet-400 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* External Links */}
            <div>
              <p className="text-sm font-medium text-white mb-3">Resources</p>
              <div className="space-y-2">
                {[
                  { href: 'https://github.com/Pratiikpy/Veil-Sub', label: 'GitHub', icon: true },
                  { href: 'https://testnet.explorer.provable.com/program/veilsub_v6.aleo', label: 'Provable Explorer', icon: false },
                  { href: 'https://testnet.aleoscan.io/program?id=veilsub_v6.aleo', label: 'Aleoscan', icon: false },
                  { href: 'https://www.leo.app/', label: 'Leo Wallet', icon: false },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-violet-400 transition-colors inline-flex items-center gap-1"
                  >
                    {link.icon && <Github className="w-3 h-3" />}
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Built on Aleo by Prateek
            </p>
            <span className="text-xs text-slate-600 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/5">
              v5.0 — Wave 2
            </span>
          </div>
        </div>
      </footer>
    </PageTransition>
  )
}
