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
  Fingerprint,
  ChevronDown,
  Eye,
  KeyRound,
  FileText,
  Globe,
} from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import PageTransition from '@/components/PageTransition'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import Button from '@/components/ui/Button'
import GlassCard from '@/components/GlassCard'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import CountUp from '@/components/CountUp'
import { FEATURED_CREATORS } from '@/lib/config'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { shortenAddress, formatCredits } from '@/lib/utils'

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
      className="block p-6 rounded-[24px] bg-[#111113] border border-[rgba(255,255,255,0.06)] shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.4),0_16px_48px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-[12px] bg-[rgba(139,92,246,0.08)] flex items-center justify-center">
          <Shield className="w-4.5 h-4.5 text-[#8b5cf6]" />
        </div>
        <div>
          <p className="text-[#fafafa] font-medium text-sm">{label}</p>
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
      <div className="mt-3 text-xs text-[#a1a1aa] group-hover:text-[#fafafa] flex items-center gap-1 transition-colors">
        View creator <ArrowRight className="w-3 h-3" />
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
    <section className="py-28">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="Creators"
            title="Explore a Creator"
            subtitle="Enter any creator's Aleo address to view their page and subscription tiers."
          />
        </ScrollReveal>

        {FEATURED_CREATORS.length > 0 && (
          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
            {FEATURED_CREATORS.map((fc) => (
              <motion.div key={fc.address} variants={staggerItemVariants}>
                <FeaturedCreatorCard address={fc.address} label={fc.label} />
              </motion.div>
            ))}
          </StaggerContainer>
        )}

        <ScrollReveal delay={0.2} className="max-w-xl mx-auto mt-10">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by Aleo address..."
                aria-label="Enter creator Aleo address"
                className="w-full pl-10 pr-4 py-3 rounded-[12px] bg-[#111113] border border-[rgba(255,255,255,0.06)] text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[rgba(255,255,255,0.12)] focus:ring-2 focus:ring-[rgba(139,92,246,0.2)] transition-all text-sm"
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
          <p className="text-xs text-[#71717a] mt-2 text-center">
            Know a creator&apos;s address? Paste it above to visit their page.
          </p>
        </ScrollReveal>
      </Container>
    </section>
  )
}

/* ─── Trust Ticker Items ─── */
const TICKER_ITEMS = [
  { icon: Shield, text: 'Built on Aleo' },
  { icon: Lock, text: 'Zero-Knowledge Proofs' },
  { icon: Zap, text: 'Testnet Live' },
  { icon: EyeOff, text: 'Private Subscriptions' },
  { icon: Layers, text: '28 Transitions' },
  { icon: Fingerprint, text: 'Zero Public Footprint' },
  { icon: Coins, text: 'Pedersen Commitments' },
  { icon: Shield, text: '7 Record Types' },
]

/* ─── Features Grid Items ─── */
const FEATURES = [
  { icon: EyeOff, title: 'Private Payments', desc: 'Subscriber identity never exposed on-chain' },
  { icon: KeyRound, title: 'Zero-Knowledge Proofs', desc: 'Cryptographic verification without revealing data' },
  { icon: Shield, title: 'Private AccessPass', desc: 'Encrypted records only you can decrypt' },
  { icon: Lock, title: 'Blind Renewals', desc: 'Renew subscriptions without linking to original' },
  { icon: Eye, title: 'Selective Disclosure', desc: 'Prove access without exposing identity' },
  { icon: FileText, title: 'Encrypted Content', desc: 'Creator content encrypted at the protocol level' },
  { icon: Coins, title: 'Pedersen Tipping', desc: 'Commit-reveal tips with cryptographic privacy' },
  { icon: Globe, title: 'On-Chain Verification', desc: 'Anyone can verify proofs, nobody sees who' },
  { icon: Layers, title: 'Custom Tiers', desc: 'Creators set flexible pricing and access levels' },
]

/* ─── Home Page ─── */
export default function HomePage() {
  const { connected } = useWallet()

  return (
    <PageTransition className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Radial glow — Cortado-inspired */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[800px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.10) 0%, transparent 55%)',
          }}
        />
        <Container className="relative pt-40 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center"
          >
            {/* Hero badge */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-[100px] bg-[rgba(139,92,246,0.06)] border border-[rgba(139,92,246,0.12)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-pulse" />
                <span className="text-xs uppercase tracking-wider font-medium text-[#a78bfa]">
                  Privacy-First Protocol
                </span>
              </div>
            </div>

            {/* Main heading — tight, dramatic */}
            <h1
              className="text-5xl sm:text-6xl lg:text-[80px] font-medium text-[#fafafa]"
              style={{ letterSpacing: '-2px', lineHeight: 1.1 }}
            >
              Subscribe Privately.
            </h1>

            <p className="mt-8 text-base sm:text-lg text-[#a1a1aa] max-w-[520px] mx-auto leading-relaxed">
              The private access layer for the creator economy. Zero-footprint verification powered by zero-knowledge proofs on Aleo.
            </p>

            {/* CTAs */}
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

            {/* Sub-CTA text */}
            <p className="mt-6 text-xs text-[#52525b]">
              Built on Aleo · Zero-Knowledge Proofs · v15 Deployed
            </p>
          </motion.div>

          {/* Scroll indicator */}
          <div className="flex justify-center mt-16">
            <ChevronDown className="w-5 h-5 text-[#52525b] animate-scroll-bounce" />
          </div>
        </Container>
      </section>

      {/* ── Trust Ticker ── */}
      <div className="relative overflow-hidden border-y border-[rgba(255,255,255,0.04)] py-5">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[rgb(2,0,5)] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[rgb(2,0,5)] to-transparent z-10" />
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, dupeIdx) => (
            <div key={dupeIdx} className="flex items-center gap-10 mx-6">
              {TICKER_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <span key={`${dupeIdx}-${item.text}`} className="inline-flex items-center gap-2 text-sm text-[#71717a] font-medium tracking-wide">
                    <Icon className="w-3.5 h-3.5 text-[#52525b]" />
                    {item.text}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem / Solution ── */}
      <section className="py-28">
        <Container>
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <ScrollReveal>
              <Badge>The Problem</Badge>
              <h2 className="mt-5 text-3xl sm:text-4xl font-medium text-[#fafafa]" style={{ letterSpacing: '-1px' }}>
                Every Platform Exposes You.
              </h2>
              <p className="mt-5 text-[#a1a1aa] leading-relaxed">
                Every major platform — Patreon, Ko-fi, YouTube memberships — publicly links subscribers to creators. Fans fear judgment. Creators lose privacy-conscious supporters.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="space-y-4">
                {[
                  { traditional: 'Subscriber lists are public', veilsub: 'Subscriber identity is never exposed' },
                  { traditional: 'Transaction history is permanent', veilsub: 'Payments are cryptographically hidden' },
                  { traditional: 'Everyone knows who pays whom', veilsub: 'Zero subscription graph exists' },
                ].map((row) => (
                  <div key={row.traditional} className="rounded-[16px] bg-[#111113] border border-[rgba(255,255,255,0.06)] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.2)]">
                    <div className="grid grid-cols-2 divide-x divide-[rgba(255,255,255,0.06)]">
                      <div className="flex items-start gap-2.5 p-5">
                        <XIcon className="w-4 h-4 text-red-400/60 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-red-400/50 font-medium">Traditional</span>
                          <p className="text-sm text-[#a1a1aa] mt-0.5">{row.traditional}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-5">
                        <Check className="w-4 h-4 text-emerald-400/60 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-emerald-400/50 font-medium">VeilSub</span>
                          <p className="text-sm text-[#fafafa] mt-0.5">{row.veilsub}</p>
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
      <section className="py-28">
        <Container>
          <ScrollReveal>
            <SectionHeader
              badge="How It Works"
              title="Four steps to private subscriptions"
            />
          </ScrollReveal>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
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
                  className="relative p-8 rounded-[24px] bg-[#111113] border border-[rgba(255,255,255,0.06)] shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.4),0_16px_48px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300"
                >
                  <span className="text-4xl font-bold text-[rgba(139,92,246,0.10)] leading-none">
                    0{i + 1}
                  </span>
                  <Icon className="w-6 h-6 text-[#a1a1aa] mt-4 mb-3" />
                  <h3 className="text-[#fafafa] font-medium mb-2">{step.title}</h3>
                  <p className="text-sm text-[#71717a] leading-relaxed">{step.desc}</p>
                </motion.div>
              )
            })}
          </StaggerContainer>
        </Container>
      </section>

      {/* ── Privacy Features — compact 3x3 grid ── */}
      <section className="py-28">
        <Container>
          <ScrollReveal>
            <SectionHeader
              badge="Privacy Stack"
              title="Built for zero exposure"
              subtitle="Every layer of VeilSub is designed to protect subscriber identity."
            />
          </ScrollReveal>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[rgba(255,255,255,0.04)] rounded-[24px] overflow-hidden mt-14 border border-[rgba(255,255,255,0.04)]">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  variants={staggerItemVariants}
                  className="flex items-start gap-4 p-7 bg-[rgb(2,0,5)] hover:bg-[#0a0a0e] transition-colors duration-300"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-[rgba(139,92,246,0.06)] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-[#8b5cf6]/70" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#fafafa]">{feature.title}</h3>
                    <p className="text-xs text-[#71717a] mt-1 leading-relaxed">{feature.desc}</p>
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
      <section className="relative py-28">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.04) 0%, transparent 70%)',
          }}
        />
        <Container className="relative">
          <ScrollReveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Tall testimonial card */}
              <div className="col-span-2 row-span-2 rounded-[24px] bg-[#111113] border border-[rgba(255,255,255,0.06)] p-10 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.2)]">
                <div>
                  <Badge>Protocol Stats</Badge>
                  <p className="mt-6 text-2xl sm:text-3xl font-medium text-[#fafafa] leading-snug" style={{ letterSpacing: '-0.5px' }}>
                    &ldquo;The only subscription platform where nobody — not even us — knows who subscribes to whom.&rdquo;
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[rgba(139,92,246,0.1)] flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#fafafa]">VeilSub Protocol</p>
                    <p className="text-xs text-[#71717a]">Built on Aleo</p>
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              {[
                { value: 100, suffix: '%', label: 'Private', sublabel: 'Subscriber identity hidden' },
                { value: 31, suffix: '', label: 'Transitions', sublabel: 'On-chain smart contract' },
                { value: 7, suffix: '', label: 'Record Types', sublabel: 'Private data structures' },
                { value: 15, suffix: '', label: 'Versions', sublabel: 'Iterative testnet deploys', prefix: 'v' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] bg-[#111113] border border-[rgba(255,255,255,0.06)] p-7 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.2)]"
                >
                  <CountUp
                    end={stat.value}
                    prefix={stat.prefix || ''}
                    suffix={stat.suffix}
                    className="text-4xl font-bold text-[#fafafa] tracking-tight"
                  />
                  <div className="mt-4">
                    <p className="text-sm text-[#a1a1aa] font-medium">{stat.label}</p>
                    <p className="text-xs text-[#52525b] mt-0.5">{stat.sublabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── CTA ── */}
      <section className="py-28">
        <Container>
          <ScrollReveal>
            <div className="relative rounded-[32px] bg-[#111113] border border-[rgba(255,255,255,0.06)] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.2)]">
              {/* Smoke effect behind CTA */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] animate-smoke-1"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                  }}
                />
              </div>

              <div className="relative text-center px-8 py-20">
                <h2 className="text-3xl sm:text-4xl font-medium text-[#fafafa]" style={{ letterSpacing: '-1px' }}>
                  Ready to Own Your Privacy?
                </h2>
                <p className="mt-5 text-[#a1a1aa] max-w-lg mx-auto leading-relaxed">
                  Join creators and subscribers who value privacy. Built on Aleo, verified by zero-knowledge proofs.
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
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] pt-16 pb-12">
        <Container>
          <div className="grid sm:grid-cols-4 gap-10 mb-14">
            {/* Brand */}
            <div className="sm:col-span-1">
              <p className="font-semibold text-[#fafafa] text-lg mb-2">VeilSub</p>
              <p className="text-sm text-[#71717a] leading-relaxed">
                Private creator subscriptions on Aleo.
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[100px] bg-emerald-500/8 border border-emerald-500/15 text-xs text-emerald-400 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Testnet Live
              </span>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold text-[#fafafa] uppercase tracking-widest mb-4">Product</p>
              <div className="space-y-2.5">
                {[
                  { href: '/explore', label: 'Explore Creators' },
                  { href: '/verify', label: 'Verify Access' },
                  { href: '/dashboard', label: 'Dashboard' },
                  { href: '/docs', label: 'Documentation' },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-sm text-[#71717a] hover:text-[#fafafa] transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <p className="text-xs font-semibold text-[#fafafa] uppercase tracking-widest mb-4">Resources</p>
              <div className="space-y-2.5">
                {[
                  { href: '/privacy', label: 'Privacy Model' },
                  { href: '/vision', label: 'Vision' },
                  { href: '/explorer', label: 'On-Chain Explorer' },
                  { href: '/analytics', label: 'Analytics' },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-sm text-[#71717a] hover:text-[#fafafa] transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Connect */}
            <div>
              <p className="text-xs font-semibold text-[#fafafa] uppercase tracking-widest mb-4">Connect</p>
              <div className="space-y-2.5">
                {[
                  { href: 'https://github.com/Pratiikpy/Veil-Sub', label: 'GitHub', icon: Github },
                  { href: 'https://testnet.aleoscan.io/program?id=veilsub_v15.aleo', label: 'Aleoscan', icon: Code },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#71717a] hover:text-[#fafafa] transition-colors"
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[rgba(255,255,255,0.06)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[#71717a]">
              © 2026 VeilSub. Built on Aleo.
            </p>
            <a
              href="https://testnet.explorer.provable.com/program/veilsub_v15.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#52525b] font-mono hover:text-[#a1a1aa] transition-colors"
            >
              veilsub_v15.aleo
            </a>
          </div>
        </Container>
      </footer>
    </PageTransition>
  )
}
