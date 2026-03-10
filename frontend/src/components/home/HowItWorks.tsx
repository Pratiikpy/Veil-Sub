'use client'

import { m } from 'framer-motion'
import { Wallet, UserCheck, Lock, Zap } from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import SpotlightCard from '@/components/ui/SpotlightCard'

const STEPS = [
  { icon: Wallet, title: 'Connect Wallet', desc: 'Link your Shield or Leo Wallet. Your address stays private.' },
  { icon: UserCheck, title: 'Find a Creator', desc: 'Browse creators and see public stats: price and subscriber count.' },
  { icon: Lock, title: 'Subscribe Privately', desc: 'Pay with ALEO credits. A private AccessPass appears in your wallet.' },
  { icon: Zap, title: 'Prove Access', desc: 'Show your AccessPass to unlock content—without revealing your identity.' },
]

export default function HowItWorks() {
  return (
    <section className="py-24 lg:py-36 section-divider">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="How It Works"
            title="Four steps to private subscriptions"
          />
        </ScrollReveal>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-14">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <m.div
                key={step.title}
                variants={staggerItemVariants}
              >
                <SpotlightCard className="group p-8 rounded-3xl glass glass-accent transition-all duration-300 h-full">
                  <span className="text-4xl font-bold leading-none text-violet-500/20 select-none">
                    0{i + 1}
                  </span>
                  <div className="mt-4 mb-3 w-10 h-10 rounded-xl bg-violet-500/[0.06] border border-violet-500/[0.1] flex items-center justify-center group-hover:bg-violet-500/[0.1] group-hover:border-violet-500/[0.2] transition-all">
                    <Icon className="w-5 h-5 text-violet-400/60 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <h3 className="text-white font-medium mb-2">{step.title}</h3>
                  <p className="text-sm text-subtle leading-relaxed">{step.desc}</p>
                </SpotlightCard>
              </m.div>
            )
          })}
        </StaggerContainer>
      </Container>
    </section>
  )
}
