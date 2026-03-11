'use client'

import { m } from 'framer-motion'
import { Wallet, UserCheck, Lock, Zap } from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import SpotlightCard from '@/components/ui/SpotlightCard'

const STEPS = [
  { icon: Wallet, title: 'Connect Wallet', desc: 'Link Shield or Leo Wallet. Your address is held client-side only—finalize never sees raw addresses.' },
  { icon: UserCheck, title: 'Find a Creator', desc: 'Browse creators with Poseidon2-hashed aggregate stats: tier prices and subscriber counts.' },
  { icon: Lock, title: 'Subscribe Privately', desc: 'Pay via credits.aleo/transfer_private. AccessPass record encrypted to your wallet key.' },
  { icon: Zap, title: 'Prove Access', desc: 'verify_access checks only pass_id + revocation—zero subscriber address exposure.' },
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
                <SpotlightCard className="group p-8 rounded-3xl glass glass-accent transition-all duration-300 h-full relative">
                  <div className="absolute top-6 right-6">
                    <span className="text-5xl font-black leading-none text-violet-500/50 select-none group-hover:text-violet-400 group-hover:scale-110 transition-all duration-300 inline-block">
                      0{i + 1}
                    </span>
                  </div>
                  <div className="mb-4 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center group-hover:from-violet-500/30 group-hover:to-violet-600/20 group-hover:border-violet-500/30 transition-all shadow-lg shadow-violet-500/10">
                    <Icon className="w-6 h-6 text-violet-400 group-hover:text-violet-300 transition-colors" aria-hidden="true" />
                  </div>
                  <h3 className="text-white font-medium mb-2">{step.title}</h3>
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
