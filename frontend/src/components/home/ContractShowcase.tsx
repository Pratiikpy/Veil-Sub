'use client'

import { m } from 'framer-motion'
import {
  EyeOff,
  Users,
  RefreshCw,
  ArrowLeftRight,
  Eye,
  Shield,
  Lock,
  Gift,
  Zap,
  BarChart3,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import SpotlightCard from '@/components/ui/SpotlightCard'

type Feature = {
  icon: LucideIcon
  title: string
  desc: string
  version: string
}

type FeatureGroup = {
  category: string
  badge: string
  description: string
  icon: LucideIcon
  colorClass: string
  features: Feature[]
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    category: 'Privacy Layers',
    badge: '5 cryptographic innovations',
    description: 'Identity separation, commitment schemes, and zero-knowledge proofs prevent subscriber tracking.',
    icon: Lock,
    colorClass: 'from-violet-600 to-violet-400',
    features: [
      { icon: EyeOff, title: 'Zero Addresses in Finalize', desc: 'All mapping keys are Poseidon2 field hashes', version: 'v23' },
      { icon: Eye, title: 'Minimal-Footprint Verify', desc: 'Revocation check only—subscriber identity never in finalize', version: 'v8' },
      { icon: Lock, title: 'Commit-Reveal Tipping', desc: 'BHP256 commitment hides tip amounts until reveal', version: 'v14' },
      { icon: BarChart3, title: 'Threshold Reputation', desc: 'Prove N+ subscribers without revealing exact count', version: 'v25' },
      { icon: Eye, title: 'Scoped Audit Tokens', desc: 'Bitfield-controlled selective disclosure for verifiers', version: 'v27' },
    ],
  },
  {
    category: 'Subscription Mechanics',
    badge: '5 operational features',
    description: 'Complete lifecycle management—from encrypted onboarding to transferable, renewable passes.',
    icon: RefreshCw,
    colorClass: 'from-blue-500 to-blue-400',
    features: [
      { icon: Users, title: 'Encrypted Content Delivery', desc: 'On-chain encryption commitments for gated content', version: 'v12' },
      { icon: RefreshCw, title: 'Blind Renewal', desc: 'Unlinkable identity rotation per renewal', version: 'v11' },
      { icon: ArrowLeftRight, title: 'Pass Transfer', desc: 'Transfer subscriptions on-chain', version: 'v15' },
      { icon: Gift, title: 'Subscription Gifting', desc: 'Gift an AccessPass to any Aleo address', version: 'v10' },
      { icon: Clock, title: 'Trial Passes', desc: 'Ephemeral access at 20% of tier price, ~12hr expiry', version: 'v26' },
    ],
  },
  {
    category: 'Smart Economics',
    badge: '2 incentive mechanisms',
    description: 'Sybil resistance and gas optimization ensure sustainable creator economics.',
    icon: Zap,
    colorClass: 'from-amber-500 to-amber-400',
    features: [
      { icon: Shield, title: 'Sybil-Protected Disputes', desc: 'Only subscribers can dispute via on-chain proof', version: 'v15' },
      { icon: Zap, title: 'Poseidon2 Optimization', desc: 'Deep Poseidon2 hashing in all finalize blocks', version: 'v19' },
    ],
  },
]

export default function ContractShowcase() {
  return (
    <section className="py-20 lg:py-28 section-divider">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="v8 → v27 Evolution"
            title="What changed across twenty deploys"
            subtitle="Each iteration adds novel cryptographic features. Built in public, deployed on testnet."
          />
        </ScrollReveal>

        <div className="mt-14 space-y-12">
          {FEATURE_GROUPS.map((group, groupIdx) => {
            const CategoryIcon = group.icon
            const isLastInGroup = (idx: number) => idx === group.features.length - 1 && group.category === 'Privacy Layers'

            return (
              <div key={group.category}>
                {/* Group Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${group.colorClass} flex items-center justify-center shadow-lg`}>
                    <CategoryIcon className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 flex-wrap">
                      <h3 className="text-lg font-semibold text-white">{group.category}</h3>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/50 bg-white/[0.04] px-2 py-1 rounded-full">
                        {group.badge}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 mt-0.5 line-clamp-1">{group.description}</p>
                  </div>
                </div>

                {/* Features Grid */}
                <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.features.map((feature, idx) => {
                    const Icon = feature.icon
                    const isHero = isLastInGroup(idx)

                    return (
                      <m.div
                        key={feature.title}
                        variants={staggerItemVariants}
                        className={isHero ? 'sm:col-span-2 lg:col-span-1' : ''}
                      >
                        <SpotlightCard
                          className={`group relative p-8 rounded-2xl transition-all duration-300 h-full ${
                            isHero
                              ? 'ring-1 ring-violet-400/40 bg-gradient-to-br from-violet-950/30 to-violet-900/10'
                              : 'glass glass-accent'
                          }`}
                        >
                          {isHero && (
                            <div className="absolute -top-2.5 left-4 text-[10px] font-medium text-violet-300 bg-violet-600/30 px-3 py-1 rounded-full border border-violet-400/30">
                              Latest
                            </div>
                          )}

                          <div className="flex items-center justify-between mb-4">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                isHero
                                  ? 'bg-violet-500/20 border border-violet-400/40'
                                  : 'bg-violet-500/[0.06] border border-violet-500/[0.1] group-hover:bg-violet-500/[0.1]'
                              }`}
                            >
                              <Icon
                                className={`text-violet-400 transition-colors ${isHero ? 'w-5 h-5' : 'w-4 h-4'}`}
                                aria-hidden="true"
                              />
                            </div>
                            <span className="text-[11px] font-mono text-violet-400 bg-violet-500/[0.06] px-2.5 py-1 rounded-full border border-violet-500/[0.12]">
                              {feature.version}
                            </span>
                          </div>

                          <h4 className={`font-medium text-white mb-1 ${isHero ? 'text-sm' : 'text-sm'}`}>
                            {feature.title}
                          </h4>
                          <p className={`leading-relaxed text-white/70 ${isHero ? 'text-xs' : 'text-xs'}`}>
                            {feature.desc}
                          </p>
                        </SpotlightCard>
                      </m.div>
                    )
                  })}
                </StaggerContainer>

                {/* Timeline Divider — between groups */}
                {groupIdx < FEATURE_GROUPS.length - 1 && (
                  <div className="flex items-center gap-4 mt-10" aria-hidden="true">
                    <div className="h-px flex-1 bg-gradient-to-r from-violet-500/20 via-white/5 to-transparent" />
                    <span className="text-[10px] font-mono text-white/40 px-3 py-1 rounded-full bg-white/[0.02] border border-white/5">
                      Evolution ↓
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-blue-500/20 via-white/5 to-transparent" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
