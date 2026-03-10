'use client'

import { m } from 'framer-motion'
import { EyeOff, KeyRound, FileText, Lock, Coins, Globe } from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import SpotlightCard from '@/components/ui/SpotlightCard'

const FEATURES_LARGE = [
  {
    icon: EyeOff,
    title: 'Private Payments',
    desc: 'Subscribe with ALEO credits. Your identity is cryptographically hidden—no subscriber lists, no transaction links, no public record of who pays whom.',
  },
  {
    icon: KeyRound,
    title: 'Zero-Knowledge Proofs',
    desc: 'Prove you have a valid subscription without revealing who you are, what tier you hold, or when you subscribed.',
  },
]

const FEATURES_SMALL = [
  { icon: FileText, title: 'Encrypted Content', desc: 'Content encrypted at the protocol level' },
  { icon: Lock, title: 'Blind Renewals', desc: 'Renew without linking to original purchase' },
  { icon: Coins, title: 'Commit-Reveal Tipping', desc: 'BHP256 commitments hide tip amounts until reveal' },
  { icon: Globe, title: 'On-Chain Verification', desc: 'Verify proofs publicly, identity stays hidden' },
]

export default function PrivacyFeatures() {
  return (
    <section className="py-24 lg:py-36 section-divider">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="Privacy Stack"
            title="How your identity stays hidden"
            subtitle="Six cryptographic techniques keep subscriber identity private at every layer."
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
                  className="group relative p-10 rounded-3xl glass glass-accent h-full transition-all duration-300 overflow-hidden"
                  spotlightSize={400}
                >
                  {/* Subtle corner glow */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-violet-500/[0.04] blur-2xl pointer-events-none group-hover:bg-violet-500/[0.08] transition-all duration-500" />
                  <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/[0.06] border border-violet-500/[0.1] flex items-center justify-center mb-6 group-hover:bg-violet-500/[0.1] group-hover:border-violet-500/[0.2] transition-all">
                    <Icon className="w-6 h-6 text-violet-400/60 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">
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
                <SpotlightCard className="group p-7 rounded-3xl glass glass-accent h-full transition-all duration-300">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/[0.06] border border-violet-500/[0.1] flex items-center justify-center mb-4 group-hover:bg-violet-500/[0.1] group-hover:border-violet-500/[0.2] transition-all">
                    <Icon className="w-4 h-4 text-violet-400/60 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-subtle leading-relaxed">
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
