'use client'

import { m } from 'framer-motion'
import { Check, Minus, Shield } from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import SpotlightCard from '@/components/ui/SpotlightCard'

const COMPARISON_ROWS: { feature: string; veilsub: boolean | string; patreon: boolean | string; substack: boolean | string }[] = [
  { feature: 'Subscriber identity hidden', veilsub: true, patreon: false, substack: false },
  { feature: 'Payment history private', veilsub: true, patreon: false, substack: false },
  { feature: 'Zero-knowledge verification', veilsub: true, patreon: false, substack: false },
  { feature: 'No platform data collection', veilsub: true, patreon: false, substack: false },
  { feature: 'Custom creator tiers', veilsub: true, patreon: true, substack: false },
  { feature: 'On-chain proof of access', veilsub: true, patreon: false, substack: false },
  { feature: 'Blind renewal (unlinkable)', veilsub: true, patreon: false, substack: false },
  { feature: 'Subscription gifting', veilsub: true, patreon: true, substack: false },
  { feature: 'Open-source smart contract', veilsub: true, patreon: false, substack: false },
  { feature: 'Platform fee', veilsub: '5%', patreon: '8-12%', substack: '10%' },
]

function CellValue({ val, accent }: { val: boolean | string; accent: boolean }) {
  if (val === true) return <Check className="w-4 h-4 text-emerald-400 mx-auto" />
  if (val === false) return <Minus className="w-4 h-4 text-white/60 mx-auto" />
  return <span className={accent ? 'text-emerald-400 font-medium' : 'text-white/60'}>{val}</span>
}

export default function PlatformComparison() {
  return (
    <section className="py-24 lg:py-36 section-divider">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="Why VeilSub"
            title="Privacy by Default"
            subtitle="How VeilSub compares to traditional creator platforms."
          />
        </ScrollReveal>

        {/* Desktop: Feature cards grid */}
        <StaggerContainer className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-16">
          {COMPARISON_ROWS.map((row) => {
            const veilsubWins = row.veilsub === true && row.patreon !== true
            return (
              <m.div key={row.feature} variants={staggerItemVariants}>
                <SpotlightCard className={`p-6 rounded-2xl glass transition-all duration-300 h-full ${veilsubWins ? 'glass-accent' : ''}`}>
                  <p className="text-[15px] font-medium text-white mb-4">{row.feature}</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'VeilSub', val: row.veilsub, accent: true },
                      { label: 'Patreon', val: row.patreon, accent: false },
                      { label: 'Substack', val: row.substack, accent: false },
                    ].map((col) => (
                      <div key={col.label} className="flex flex-col items-center gap-1.5">
                        <CellValue val={col.val} accent={col.accent} />
                        <span className={`text-[10px] ${col.accent ? 'text-violet-400/80 font-medium' : 'text-white/60'}`}>
                          {col.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>
              </m.div>
            )
          })}
        </StaggerContainer>

        {/* Desktop: Summary stat */}
        <ScrollReveal delay={0.3}>
          <div className="hidden sm:flex items-center justify-center gap-3 mt-10 py-4 px-6 rounded-2xl glass mx-auto max-w-md">
            <Shield className="w-5 h-5 text-violet-400/60" aria-hidden="true" />
            <p className="text-sm text-white/70">
              <span className="text-emerald-400 font-semibold">9 of 10</span> privacy features exclusive to VeilSub
            </p>
          </div>
        </ScrollReveal>

        {/* Mobile cards */}
        <div className="mt-16 space-y-3 sm:hidden">
          {COMPARISON_ROWS.map((row) => {
            const veilsubWinsMobile = row.veilsub === true && row.patreon !== true
            return (
              <div key={row.feature} className={`p-4 rounded-2xl glass ${veilsubWinsMobile ? 'glass-accent' : ''}`}>
                <p className="text-sm text-white font-medium mb-2">{row.feature}</p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    { label: 'VeilSub', val: row.veilsub, accent: true },
                    { label: 'Patreon', val: row.patreon, accent: false },
                    { label: 'Substack', val: row.substack, accent: false },
                  ].map((col) => (
                    <div key={col.label} className="flex flex-col items-center gap-1">
                      <span className={col.accent ? 'text-violet-400 font-medium' : 'text-white/60'}>{col.label}</span>
                      <CellValue val={col.val} accent={col.accent} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
