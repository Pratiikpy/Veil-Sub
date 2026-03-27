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
    title: 'Hidden From the Blockchain',
    desc: 'All 25 on-chain records use anonymized keys instead of wallet addresses. Even if someone watches every transaction, they cannot determine who subscribed to whom.',
  },
  {
    icon: KeyRound,
    title: 'Unlinkable Renewals',
    desc: 'Each renewal looks like a completely new subscription. Month 1 and Month 2 payments cannot be connected—creators only see total subscribers, never individual identities.',
  },
]

const FEATURES_SMALL = [
  { icon: FileText, title: 'Selective Disclosure', desc: 'You control what verifiers see: just your tier, just expiry date, or nothing at all—your choice' },
  { icon: Layers, title: 'Custom Creator Tiers', desc: 'Creators set their own pricing tiers—flexible monetization with full privacy for subscribers' },
  { icon: Gift, title: 'Anonymous Gifting', desc: 'Gift subscriptions to friends without revealing yourself—they receive access, you stay hidden' },
  { icon: Coins, title: 'Private Tips', desc: 'Tip creators with hidden amounts. The tip stays secret until you choose to reveal it' },
  { icon: Lock, title: 'Six Private Records', desc: 'Subscription pass, audit token, gift token and more—each encrypted independently for maximum privacy' },
  { icon: Globe, title: 'Zero-Knowledge Verification', desc: 'Prove you have access without revealing your identity. The proof confirms subscription, not who you are' },
]

export default function PrivacyFeatures() {
  return (
    <section className="py-20 lg:py-28 section-divider">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="Privacy Stack"
            title="How your identity stays hidden"
            subtitle="Three layers of protection: anonymized blockchain records, unlinkable renewals, and you control what anyone can verify."
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
                  {/* Corner glow - enhanced visibility */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/[0.04] blur-2xl pointer-events-none group-hover:bg-white/[0.15] transition-all duration-500" />
                  <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mb-6 group-hover:bg-white/[0.1] group-hover:border-white/10 transition-all">
                    <Icon className="w-6 h-6 text-white/50 group-hover:text-white/60 transition-colors" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-4">
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
                  <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mb-4 group-hover:bg-white/[0.1] group-hover:border-white/10 transition-all">
                    <Icon className="w-4 h-4 text-white/50 group-hover:text-white/60 transition-colors" aria-hidden="true" />
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
