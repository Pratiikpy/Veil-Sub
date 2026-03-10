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
  ChevronRight,
} from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import SpotlightCard from '@/components/ui/SpotlightCard'

const CONTRACT_FEATURES = [
  { icon: EyeOff, title: 'Zero Addresses in Finalize', desc: 'All mapping keys are Poseidon2 field hashes', version: 'v23' },
  { icon: Users, title: 'Encrypted Content Delivery', desc: 'On-chain encryption commitments for gated content', version: 'v12' },
  { icon: RefreshCw, title: 'Blind Renewal', desc: 'Unlinkable identity rotation per renewal', version: 'v11' },
  { icon: ArrowLeftRight, title: 'Pass Transfer', desc: 'Transfer subscriptions on-chain', version: 'v15' },
  { icon: Eye, title: 'Minimal-Footprint Verify', desc: 'Revocation check only—subscriber identity never in finalize', version: 'v8' },
  { icon: Shield, title: 'Sybil-Protected Disputes', desc: 'Only subscribers can dispute', version: 'v15' },
  { icon: Lock, title: 'Commit-Reveal Tipping', desc: 'BHP256 commitment hidden tip amounts', version: 'v14' },
  { icon: Gift, title: 'Subscription Gifting', desc: 'Gift an AccessPass to any Aleo address', version: 'v10' },
  { icon: Zap, title: 'Poseidon2 Optimization', desc: 'Deep Poseidon2 hashing in all finalize blocks', version: 'v19' },
  { icon: BarChart3, title: 'Threshold Reputation', desc: 'Prove N+ subscribers without revealing exact count', version: 'v25' },
  { icon: Clock, title: 'Trial Passes', desc: 'Ephemeral access at 20% of tier price, ~12hr expiry', version: 'v26' },
  { icon: Eye, title: 'Scoped Audit Tokens', desc: 'Bitfield-controlled selective disclosure for verifiers', version: 'v27' },
]

export default function ContractShowcase() {
  return (
    <section className="py-24 lg:py-36 section-divider">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="v8 → v27 Evolution"
            title="What changed across nineteen deploys"
            subtitle="Each iteration adds novel cryptographic features. Built in public, deployed on testnet."
          />
        </ScrollReveal>

        {/* Scroll container with mobile swipe indicator */}
        <div className="relative mt-14">
          {/* Right-edge gradient fade — mobile only */}
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-4 w-12 z-10 sm:hidden"
            style={{ background: 'linear-gradient(to right, transparent, #000000)' }}
            aria-hidden="true"
          />

          <StaggerContainer className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
            {CONTRACT_FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <m.div key={feature.title} variants={staggerItemVariants} className="min-w-[260px] shrink-0 snap-start sm:min-w-0 sm:shrink">
                  <SpotlightCard className="group relative p-7 rounded-3xl glass glass-accent transition-all duration-300 h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/[0.06] border border-violet-500/[0.1] flex items-center justify-center group-hover:bg-violet-500/[0.1] group-hover:border-violet-500/[0.2] transition-all">
                        <Icon className="w-4 h-4 text-violet-400/60 group-hover:text-violet-400 transition-colors" />
                      </div>
                      <span className="text-[10px] font-mono text-violet-400/80 bg-violet-500/[0.06] px-2.5 py-1 rounded-full border border-violet-500/[0.12]">
                        {feature.version}
                      </span>
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

          {/* Swipe hint — mobile only */}
          <div className="flex items-center justify-center gap-1.5 mt-3 sm:hidden" aria-hidden="true">
            <span className="text-[11px] text-zinc-500 tracking-wide">Swipe to explore</span>
            <ChevronRight className="w-3 h-3 text-violet-400/60 animate-pulse" />
          </div>
        </div>
      </Container>
    </section>
  )
}
