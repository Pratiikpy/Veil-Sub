'use client'

import { m } from 'framer-motion'
import { Wallet, UserCheck, Lock, Zap } from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import SpotlightCard from '@/components/ui/SpotlightCard'

const STEPS = [
  { icon: Wallet, title: 'Connect Wallet', desc: 'Connect your Aleo wallet. Your address stays on your device—the blockchain never sees who you are.' },
  { icon: UserCheck, title: 'Find a Creator', desc: 'Browse creators by tier pricing and subscriber counts. All stats are anonymized—no individual addresses visible.' },
  { icon: Lock, title: 'Subscribe Privately', desc: 'Payment happens privately. You receive an encrypted AccessPass that only your wallet can decrypt.' },
  { icon: Zap, title: 'Prove Access', desc: 'Verify your subscription without revealing identity. The proof confirms access, not who you are.' },
]

export default function HowItWorks() {
  return (
    <section className="py-20 lg:py-28 section-divider">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="How It Works"
            title="Four steps to zero-footprint subscriptions"
          />
        </ScrollReveal>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 sm:mt-14">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <m.div
                key={step.title}
                variants={staggerItemVariants}
              >
                <SpotlightCard className="group p-5 sm:p-8 rounded-3xl glass glass-accent transition-all duration-300 h-full relative">
                  <div className="absolute top-6 right-6">
                    <span className="text-5xl font-black leading-none text-white/50 select-none group-hover:text-white/60 group-hover:scale-110 transition-all duration-300 inline-block">
                      0{i + 1}
                    </span>
                  </div>
                  <div className="mb-4 w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.03] border border-white/10 flex items-center justify-center group-hover:from-white/10 group-hover:to-white/[0.08] group-hover:border-white/15 transition-all shadow-lg shadow-white/[0.04]">
                    <Icon className="w-6 h-6 text-white/60 group-hover:text-white/70 transition-colors" aria-hidden="true" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-white/80 leading-relaxed">{step.desc}</p>
                </SpotlightCard>
              </m.div>
            )
          })}
        </StaggerContainer>
      </Container>
    </section>
  )
}
