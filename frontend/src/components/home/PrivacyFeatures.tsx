'use client'

import { m } from 'framer-motion'
import { EyeOff, KeyRound, FileText, Lock, Coins, Globe, Layers, Gift } from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import SpotlightCard from '@/components/ui/SpotlightCard'

const FEATURES_LARGE = [
  {
    icon: EyeOff,
    title: 'Zero-Address Finalize',
    desc: 'All 25 on-chain mappings are keyed by Poseidon2 field hashes, not raw addresses. Even if someone watches the blockchain, they cannot correlate mapping keys with wallet addresses.',
  },
  {
    icon: KeyRound,
    title: 'Blind Subscription Protocol',
    desc: 'Each renewal uses a fresh cryptographic nonce. Your wallet subscribed in Month 1 with nonce₁, renews in Month 2 with nonce₂—the creator cannot link these as the same person.',
  },
]

const FEATURES_SMALL = [
  { icon: FileText, title: 'Scoped Audit Tokens', desc: 'Bitfield mask controls which fields verifiers see: tier, expiry, or nothing—you choose' },
  { icon: Layers, title: 'Dynamic Creator Tiers', desc: 'Flexible pricing via create_custom_tier—creators define their own tier names and prices' },
  { icon: Gift, title: 'Private Gift Subscriptions', desc: 'gift_subscription + redeem_gift—send AccessPasses to friends without revealing yourself' },
  { icon: Coins, title: 'Commit-Reveal Tipping', desc: 'BHP256 hash commitment hides tip amount until you reveal—tips stay private' },
  { icon: Lock, title: 'Six Private Records', desc: 'AccessPass, AuditToken, GiftToken, and 3 more—each with independent privacy scope' },
  { icon: Globe, title: 'verify_access Proofs', desc: 'Verify subscription status using only pass_id—no address exposure on-chain' },
]

export default function PrivacyFeatures() {
  return (
    <section className="py-24 lg:py-36 section-divider">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="Privacy Stack"
            title="How your identity stays hidden"
            subtitle="Three-layer privacy: zero-address finalize, nonce-rotated hashing, and selective disclosure."
          />
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-14">
          {FEATURES_LARGE.map((feature) => {
            const Icon = feature.icon
            return (
              <m.div
                key={feature.title}
                variants={staggerItemVariants}
                className="sm:col-span-2"
              >
                <SpotlightCard
                  className="group relative p-8 sm:p-10 rounded-3xl glass glass-accent h-full transition-all duration-300 overflow-hidden"
                  spotlightSize={400}
                >
                  {/* Subtle corner glow */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-violet-500/[0.04] blur-2xl pointer-events-none group-hover:bg-violet-500/[0.08] transition-all duration-500" />
                  <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/[0.06] border border-violet-500/[0.1] flex items-center justify-center mb-6 group-hover:bg-violet-500/[0.1] group-hover:border-violet-500/[0.2] transition-all">
                    <Icon className="w-6 h-6 text-violet-400/60 group-hover:text-violet-400 transition-colors" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                  </div>
                </SpotlightCard>
              </m.div>
            )
          })}
          {FEATURES_SMALL.map((feature) => {
            const Icon = feature.icon
            return (
              <m.div key={feature.title} variants={staggerItemVariants}>
                <SpotlightCard className="group p-6 sm:p-8 rounded-3xl glass glass-accent h-full transition-all duration-300">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/[0.06] border border-violet-500/[0.1] flex items-center justify-center mb-4 group-hover:bg-violet-500/[0.1] group-hover:border-violet-500/[0.2] transition-all">
                    <Icon className="w-4 h-4 text-violet-400/60 group-hover:text-violet-400 transition-colors" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-white/80 leading-relaxed">
                    {feature.desc}
                  </p>
                </SpotlightCard>
              </m.div>
            )
          })}
        </StaggerContainer>
      </Container>
    </section>
  )
}
