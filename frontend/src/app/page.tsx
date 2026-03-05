'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Wallet,
  UserCheck,
  Lock,
  Zap,
  ArrowRight,
  Search,
  Users,
  Coins,
  Shield,
  EyeOff,
  Check,
  X as XIcon,
  Github,
  Code,
  Layers,
  KeyRound,
  FileText,
  Globe,
  ChevronDown,
  Gift,
  RefreshCw,
  ArrowLeftRight,
  Eye,
} from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import PageTransition from '@/components/PageTransition'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import Button from '@/components/ui/Button'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import CountUp from '@/components/CountUp'
import { FEATURED_CREATORS } from '@/lib/config'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { shortenAddress, formatCredits } from '@/lib/utils'

/* ─── Animated Background Orbs ─── */
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Violet orb — top right */}
      <div
        className="absolute -top-[300px] -right-[200px] w-[700px] h-[700px] rounded-full animate-float"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
        }}
      />
      {/* White orb — top left */}
      <div
        className="absolute -top-[200px] -left-[300px] w-[600px] h-[600px] rounded-full animate-float-delayed"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)',
        }}
      />
      {/* Subtle violet glow — center */}
      <div
        className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full animate-float-slow"
        style={{
          background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.03) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}

/* ─── Featured Creator Card ─── */
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
      className="group block p-6 rounded-3xl bg-[#0a0a0a]/70 backdrop-blur-xl border border-white/[0.08] hover:border-violet-500/[0.2] transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)]"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-violet-500/[0.06] border border-violet-500/[0.1] flex items-center justify-center group-hover:border-violet-500/[0.2] transition-colors">
          <Shield className="w-4.5 h-4.5 text-violet-400/60" />
        </div>
        <div>
          <p className="text-white font-medium text-sm">{label}</p>
          <p className="text-xs text-[#71717a] font-mono">{shortenAddress(address)}</p>
        </div>
      </div>
      {stats && stats.tierPrice !== null && (
        <div className="flex gap-4 text-xs text-[#71717a]">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {stats.subscriberCount} subscribers
          </span>
          <span className="flex items-center gap-1">
            <Coins className="w-3 h-3" />
            {formatCredits(stats.tierPrice)} ALEO
          </span>
        </div>
      )}
      <div className="mt-3 text-xs text-[#71717a] group-hover:text-violet-300 flex items-center gap-1 transition-colors">
        View creator <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  )
}

/* ─── Explore Creator Section ─── */
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
    <section className="py-32">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="Creators"
            title="Explore a Creator"
            subtitle="Enter any creator's Aleo address to view their page and subscription tiers."
          />
        </ScrollReveal>

        {FEATURED_CREATORS.length > 0 && (
          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
            {FEATURED_CREATORS.map((fc) => (
              <motion.div key={fc.address} variants={staggerItemVariants}>
                <FeaturedCreatorCard address={fc.address} label={fc.label} />
              </motion.div>
            ))}
          </StaggerContainer>
        )}

        <ScrollReveal delay={0.2} className="max-w-xl mx-auto mt-10">
          <div className="flex gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a] group-focus-within:text-violet-400 transition-colors" />
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by Aleo address..."
                aria-label="Enter creator Aleo address"
                className="w-full pl-11 pr-4 py-3 rounded-full bg-[#0a0a0a]/70 backdrop-blur-xl border border-white/[0.08] text-white placeholder-[#71717a] focus:outline-none focus:border-violet-500/[0.3] focus:shadow-[0_0_20px_rgba(139,92,246,0.08)] transition-all duration-300 text-sm"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!searchAddress.trim().startsWith('aleo1')}
              size="md"
            >
              Go
            </Button>
          </div>
          <p className="text-xs text-[#71717a] mt-3 text-center">
            Know a creator&apos;s address? Paste it above to visit their page.
          </p>
        </ScrollReveal>
      </Container>
    </section>
  )
}

/* ─── Trust Ticker ─── */
const TICKER_ITEMS = [
  { icon: Shield, text: 'Built on Aleo' },
  { icon: Lock, text: 'Zero-Knowledge Proofs' },
  { icon: Zap, text: 'Testnet Live' },
  { icon: EyeOff, text: 'Private Subscriptions' },
  { icon: Layers, text: '31 Transitions' },
  { icon: Shield, text: 'Zero Public Footprint' },
  { icon: Coins, text: 'Pedersen Commitments' },
  { icon: Shield, text: '8 Record Types' },
  { icon: Layers, text: '30 Mappings' },
  { icon: Code, text: '1,750+ Lines of Leo' },
]

/* ─── Bento Features ─── */
const FEATURES_LARGE = [
  {
    icon: EyeOff,
    title: 'Private Payments',
    desc: 'Subscribe with ALEO credits. Your identity is cryptographically hidden — no subscriber lists, no transaction links, no public record of who pays whom.',
  },
  {
    icon: KeyRound,
    title: 'Zero-Knowledge Proofs',
    desc: 'Prove you have a valid subscription without revealing who you are, what tier you hold, or when you subscribed. Mathematical certainty, zero exposure.',
  },
]

const FEATURES_SMALL = [
  { icon: FileText, title: 'Encrypted Content', desc: 'Content encrypted at the protocol level' },
  { icon: Lock, title: 'Blind Renewals', desc: 'Renew without linking to original purchase' },
  { icon: Coins, title: 'Pedersen Tipping', desc: 'Commit-reveal tips with cryptographic privacy' },
  { icon: Globe, title: 'On-Chain Verification', desc: 'Verify proofs publicly, identity stays hidden' },
]

/* ─── Contract Features Showcase ─── */
const CONTRACT_FEATURES = [
  { icon: EyeOff, title: 'Pedersen Subscriber Proofs', desc: 'Homomorphic commitments hide subscriber count', version: 'v17' },
  { icon: Users, title: 'Privacy-Preserving Referrals', desc: 'Earn rewards without seeing who subscribed', version: 'v17' },
  { icon: RefreshCw, title: 'Blind Renewal', desc: 'Unlinkable identity rotation per renewal', version: 'v11' },
  { icon: ArrowLeftRight, title: 'Pass Transfer', desc: 'Transfer subscriptions on-chain', version: 'v15' },
  { icon: Eye, title: 'Zero-Footprint Verify', desc: 'No finalize, no public trace', version: 'v8' },
  { icon: Shield, title: 'Sybil-Protected Disputes', desc: 'Only subscribers can dispute', version: 'v15' },
  { icon: Lock, title: 'Commit-Reveal Tipping', desc: 'BHP256 commitment hidden tip amounts', version: 'v14' },
  { icon: Gift, title: 'Subscription Gifting', desc: 'Gift an AccessPass to any Aleo address', version: 'v10' },
  { icon: Zap, title: 'Poseidon2 Optimization', desc: 'Deep Poseidon2 hashing in all finalize blocks', version: 'v19' },
]

/* ─── Home Page ─── */
export default function HomePage() {
  const { connected } = useWallet()

  return (
    <PageTransition className="min-h-screen">
      <BackgroundOrbs />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.04) 0%, transparent 70%)',
          }}
        />

        <Container className="relative pt-28 sm:pt-44 pb-20 sm:pb-36">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center"
          >
            <div className="flex justify-center mb-10">
              <Badge variant="accent">Privacy-First Protocol</Badge>
            </div>

            <h1 style={{ lineHeight: 1.05 }}>
              <span
                className="block text-5xl sm:text-7xl lg:text-[88px] font-semibold text-white"
                style={{ letterSpacing: '-3px' }}
              >
                Subscribe
              </span>
              <span
                className="block text-5xl sm:text-7xl lg:text-[88px] font-serif italic text-white/90"
                style={{ letterSpacing: '-2px' }}
              >
                Privately.
              </span>
            </h1>

            <p className="mt-8 text-base sm:text-lg text-[#a1a1aa] max-w-[520px] mx-auto leading-relaxed">
              The private access layer for the creator economy. Zero-footprint
              verification powered by zero-knowledge proofs on Aleo.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap mt-12">
              {connected ? (
                <>
                  <Link href="/dashboard">
                    <Button size="lg">
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href={`/creator/${FEATURED_CREATORS[0]?.address || ''}`}>
                    <Button variant="secondary" size="lg">
                      Try as Subscriber
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href={`/creator/${FEATURED_CREATORS[0]?.address || ''}`}>
                    <Button size="lg">
                      Start Subscribing
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <a
                    href="https://github.com/Pratiikpy/Veil-Sub"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="secondary" size="lg">
                      <Code className="w-4 h-4" />
                      View Source
                    </Button>
                  </a>
                </>
              )}
            </div>

            <p className="mt-6 text-xs text-[#71717a]">
              Built on Aleo · Zero-Knowledge Proofs · v20 Deployed
            </p>
          </motion.div>

          <div className="flex justify-center mt-16">
            <ChevronDown className="w-5 h-5 text-violet-400/30 animate-scroll-bounce" />
          </div>
        </Container>
      </section>

      {/* ── Trust Ticker ── */}
      <div className="relative overflow-hidden border-y border-white/[0.06] py-5">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10" />
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, dupeIdx) => (
            <div key={dupeIdx} className="flex items-center gap-10 mx-6">
              {TICKER_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <span
                    key={`${dupeIdx}-${item.text}`}
                    className="inline-flex items-center gap-2 text-sm text-[#71717a] font-medium tracking-wide"
                  >
                    <Icon className="w-3.5 h-3.5 text-violet-400/30" />
                    {item.text}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem / Solution ── */}
      <section className="py-32">
        <Container>
          <div className="grid md:grid-cols-2 gap-20 items-start">
            <ScrollReveal>
              <Badge>The Problem</Badge>
              <h2
                className="mt-6 text-3xl sm:text-4xl lg:text-[44px] font-serif italic text-white"
                style={{ letterSpacing: '-1.5px', lineHeight: 1.1 }}
              >
                Every Platform
                <br />
                Exposes You.
              </h2>
              <p className="mt-6 text-[#a1a1aa] leading-relaxed">
                Every major platform — Patreon, Ko-fi, YouTube memberships —
                publicly links subscribers to creators. Fans fear judgment.
                Creators lose privacy-conscious supporters.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="space-y-3">
                {[
                  { traditional: 'Subscriber lists are public', veilsub: 'Subscriber identity is never exposed' },
                  { traditional: 'Transaction history is permanent', veilsub: 'Payments are cryptographically hidden' },
                  { traditional: 'Everyone knows who pays whom', veilsub: 'Zero subscription graph exists' },
                ].map((row) => (
                  <div
                    key={row.traditional}
                    className="rounded-2xl bg-[#0a0a0a]/70 backdrop-blur-xl border border-white/[0.08] overflow-hidden hover:border-white/[0.12] transition-colors duration-300"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
                      <div className="flex items-start gap-2.5 p-5">
                        <XIcon className="w-4 h-4 text-red-400/50 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-red-400/40 font-medium">
                            Traditional
                          </span>
                          <p className="text-sm text-[#71717a] mt-0.5">{row.traditional}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-5">
                        <Check className="w-4 h-4 text-emerald-400/50 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-emerald-400/40 font-medium">
                            VeilSub
                          </span>
                          <p className="text-sm text-white mt-0.5">{row.veilsub}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* ── How It Works ── */}
      <section className="py-32">
        <Container>
          <ScrollReveal>
            <SectionHeader
              badge="How It Works"
              title="Four steps to private subscriptions"
            />
          </ScrollReveal>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-14">
            {[
              { icon: Wallet, title: 'Connect Wallet', desc: 'Link your Shield or Leo Wallet. Your address stays private.' },
              { icon: UserCheck, title: 'Find a Creator', desc: 'Browse creators and see public stats: price and subscriber count.' },
              { icon: Lock, title: 'Subscribe Privately', desc: 'Pay with ALEO credits. A private AccessPass appears in your wallet.' },
              { icon: Zap, title: 'Prove Access', desc: 'Show your AccessPass to unlock content — without revealing your identity.' },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  variants={staggerItemVariants}
                  className="group relative p-8 rounded-3xl bg-[#0a0a0a]/70 backdrop-blur-xl border border-white/[0.08] hover:border-violet-500/[0.2] transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)]"
                >
                  <span className="text-4xl font-bold text-violet-500/[0.08] leading-none">
                    0{i + 1}
                  </span>
                  <Icon className="w-6 h-6 text-violet-400/40 mt-4 mb-3 group-hover:text-violet-400/60 transition-colors" />
                  <h3 className="text-white font-medium mb-2">{step.title}</h3>
                  <p className="text-sm text-[#71717a] leading-relaxed">{step.desc}</p>
                </motion.div>
              )
            })}
          </StaggerContainer>
        </Container>
      </section>

      {/* ── Privacy Features — Bento ── */}
      <section className="py-32">
        <Container>
          <ScrollReveal>
            <SectionHeader
              badge="Privacy Stack"
              title="Built for zero exposure"
              subtitle="Every layer of VeilSub is designed to protect subscriber identity."
            />
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-14">
            {FEATURES_LARGE.map((feature) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  variants={staggerItemVariants}
                  className="sm:col-span-2"
                >
                  <div className="group p-10 rounded-3xl bg-[#0a0a0a]/70 backdrop-blur-xl border border-white/[0.08] h-full hover:border-violet-500/[0.2] transition-all duration-300 hover:shadow-[0_0_40px_rgba(139,92,246,0.06)]">
                    <Icon className="w-7 h-7 text-violet-400/40 mb-6 group-hover:text-violet-400/60 transition-colors" />
                    <h3 className="text-xl font-medium text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-[#a1a1aa] text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              )
            })}
            {FEATURES_SMALL.map((feature) => {
              const Icon = feature.icon
              return (
                <motion.div key={feature.title} variants={staggerItemVariants}>
                  <div className="group p-7 rounded-3xl bg-[#0a0a0a]/70 backdrop-blur-xl border border-white/[0.08] h-full hover:border-violet-500/[0.2] transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)]">
                    <Icon className="w-5 h-5 text-violet-400/40 mb-4 group-hover:text-violet-400/60 transition-colors" />
                    <h3 className="text-sm font-medium text-white mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-[#71717a] leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </StaggerContainer>
        </Container>
      </section>

      {/* ── Contract Features Showcase (NEW — WOW factor) ── */}
      <section className="py-32">
        <Container>
          <ScrollReveal>
            <SectionHeader
              badge="v8 → v20 Evolution"
              title="Twelve versions of privacy innovation"
              subtitle="Each iteration adds novel cryptographic features. Built in public, deployed on testnet."
            />
          </ScrollReveal>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
            {CONTRACT_FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <motion.div key={feature.title} variants={staggerItemVariants}>
                  <div className="group relative p-7 rounded-3xl bg-[#0a0a0a]/70 backdrop-blur-xl border border-white/[0.08] hover:border-violet-500/[0.2] transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)]">
                    <div className="flex items-center justify-between mb-4">
                      <Icon className="w-5 h-5 text-violet-400/50 group-hover:text-violet-400/70 transition-colors" />
                      <span className="text-[10px] font-mono text-violet-400/40 bg-violet-500/[0.06] px-2 py-0.5 rounded-full border border-violet-500/[0.1]">
                        {feature.version}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-[#71717a] leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </StaggerContainer>
        </Container>
      </section>

      {/* ── Explore Creators ── */}
      <ExploreCreatorSection />

      {/* ── Stats — Bento Grid ── */}
      <section className="py-32">
        <Container>
          <ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Quote card */}
              <div className="sm:col-span-2 sm:row-span-2 rounded-3xl bg-[#0a0a0a]/70 backdrop-blur-xl border border-white/[0.08] p-6 sm:p-10 flex flex-col justify-between hover:border-violet-500/[0.15] transition-all duration-300">
                <div>
                  <Badge variant="accent">Protocol Stats</Badge>
                  <p
                    className="mt-6 text-2xl sm:text-3xl font-serif italic text-white leading-snug"
                    style={{ letterSpacing: '-0.5px' }}
                  >
                    &ldquo;The only subscription platform where nobody — not
                    even us — knows who subscribes to whom.&rdquo;
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/[0.08] border border-violet-500/[0.12] flex items-center justify-center">
                    <Shield className="w-5 h-5 text-violet-400/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">VeilSub Protocol</p>
                    <p className="text-xs text-[#71717a]">Built on Aleo</p>
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              {[
                { value: 100, suffix: '%', label: 'Private', sublabel: 'Subscriber identity hidden' },
                { value: 31, suffix: '', label: 'Transitions', sublabel: 'On-chain smart contract' },
                { value: 8, suffix: '', label: 'Record Types', sublabel: 'Private data structures' },
                { value: 20, suffix: '', label: 'Versions', sublabel: 'Iterative testnet deploys', prefix: 'v' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl bg-[#0a0a0a]/70 backdrop-blur-xl border border-white/[0.08] p-7 flex flex-col justify-between hover:border-violet-500/[0.15] transition-all duration-300"
                >
                  <CountUp
                    end={stat.value}
                    prefix={stat.prefix || ''}
                    suffix={stat.suffix}
                    className="text-4xl font-bold text-white tracking-tight"
                  />
                  <div className="mt-4">
                    <p className="text-sm text-[#a1a1aa] font-medium">{stat.label}</p>
                    <p className="text-xs text-[#71717a] mt-0.5">{stat.sublabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── CTA ── */}
      <section className="py-32">
        <Container className="text-center">
          <ScrollReveal>
            <h2
              className="text-4xl sm:text-5xl font-serif italic text-white"
              style={{ letterSpacing: '-1.5px' }}
            >
              Ready to Own Your Privacy?
            </h2>
            <p className="mt-6 text-[#a1a1aa] max-w-lg mx-auto leading-relaxed">
              Join creators and subscribers who value privacy. Built on Aleo,
              verified by zero-knowledge proofs.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap mt-10">
              <Link href="/dashboard">
                <Button size="lg">
                  Become a Creator
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a
                href="https://github.com/Pratiikpy/Veil-Sub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" size="lg">
                  <Github className="w-4 h-4" />
                  View on GitHub
                </Button>
              </a>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] pt-16 pb-12">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-14">
            <div className="col-span-2 md:col-span-1">
              <p className="font-serif italic text-white text-xl mb-2">VeilSub</p>
              <p className="text-sm text-[#71717a] leading-relaxed">
                Private creator subscriptions on Aleo.
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/[0.15] text-xs text-emerald-400 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Testnet Live
              </span>
            </div>

            <div>
              <p className="text-xs font-medium text-white uppercase tracking-widest mb-4">
                Product
              </p>
              <div className="space-y-2.5">
                {[
                  { href: '/explore', label: 'Explore Creators' },
                  { href: '/verify', label: 'Verify Access' },
                  { href: '/dashboard', label: 'Dashboard' },
                  { href: '/docs', label: 'Documentation' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-sm text-[#71717a] hover:text-violet-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-white uppercase tracking-widest mb-4">
                Resources
              </p>
              <div className="space-y-2.5">
                {[
                  { href: '/privacy', label: 'Privacy Model' },
                  { href: '/vision', label: 'Vision' },
                  { href: '/explorer', label: 'On-Chain Explorer' },
                  { href: '/analytics', label: 'Analytics' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-sm text-[#71717a] hover:text-violet-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-white uppercase tracking-widest mb-4">
                Connect
              </p>
              <div className="space-y-2.5">
                {[
                  { href: 'https://github.com/Pratiikpy/Veil-Sub', label: 'GitHub', icon: Github },
                  { href: 'https://testnet.aleoscan.io/program?id=veilsub_v20.aleo', label: 'Aleoscan', icon: Code },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#71717a] hover:text-violet-300 transition-colors"
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[#71717a]">
              2026 VeilSub. Built on Aleo.
            </p>
            <a
              href="https://testnet.explorer.provable.com/program/veilsub_v20.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#71717a] font-mono hover:text-violet-300 transition-colors"
            >
              veilsub_v20.aleo
            </a>
          </div>
        </Container>
      </footer>
    </PageTransition>
  )
}
