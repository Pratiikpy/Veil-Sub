'use client'

import { m } from 'framer-motion'
import { Check, Minus, Shield, TrendingUp } from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import SpotlightCard from '@/components/ui/SpotlightCard'

// Categorized comparison data
const PRIVACY_FEATURES = [
  { feature: 'Subscriber identity hidden', veilsub: true, patreon: false, substack: false },
  { feature: 'Payment history private', veilsub: true, patreon: false, substack: false },
  { feature: 'Zero-knowledge verification', veilsub: true, patreon: false, substack: false },
  { feature: 'No platform data collection', veilsub: true, patreon: false, substack: false },
  { feature: 'On-chain proof of access', veilsub: true, patreon: false, substack: false },
  { feature: 'Blind renewal (unlinkable)', veilsub: true, patreon: false, substack: false },
  { feature: 'Open-source smart contract', veilsub: true, patreon: false, substack: false },
]

const FEATURE_PARITY = [
  { feature: 'Custom creator tiers', veilsub: true, patreon: true, substack: false },
  { feature: 'Subscription gifting', veilsub: true, patreon: true, substack: false },
]

// Calculate scores
const calculateScore = (platform: 'veilsub' | 'patreon' | 'substack') => {
  const allFeatures = [...PRIVACY_FEATURES, ...FEATURE_PARITY]
  const total = allFeatures.length
  const wins = allFeatures.filter(f => f[platform] === true).length
  return { wins, total, percentage: Math.round((wins / total) * 100) }
}

const PLATFORM_SCORES = {
  veilsub: calculateScore('veilsub'),
  patreon: calculateScore('patreon'),
  substack: calculateScore('substack'),
}

// Progress bar component
function ProgressBar({ percentage, label, color, delay = 0 }: {
  percentage: number
  label: string
  color: string
  delay?: number
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/90 font-medium">{label}</span>
        <span className={`font-semibold ${color}`}>{percentage}%</span>
      </div>
      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
        <m.div
          initial={{ width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay, ease: [0.4, 0, 0.2, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
        />
      </div>
    </div>
  )
}

// Score card component
function ScoreCard({
  platform,
  score,
  highlight = false
}: {
  platform: string
  score: { wins: number; total: number; percentage: number }
  highlight?: boolean
}) {
  return (
    <SpotlightCard
      className={`p-4 sm:p-8 rounded-2xl glass transition-all duration-300 ${
        highlight ? 'glass-accent ring-1 ring-violet-500/20' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className={`font-semibold ${highlight ? 'text-violet-300' : 'text-white/80'}`}>
          {platform}
        </h4>
        {highlight && <Shield className="w-5 h-5 text-emerald-400" aria-hidden="true" />}
      </div>

      <div className="mb-4">
        <div className="text-4xl font-bold mb-1">
          <span className={highlight ? 'text-emerald-400' : 'text-white/60'}>
            {score.wins}
          </span>
          <span className="text-white/50 text-2xl">/{score.total}</span>
        </div>
        <p className="text-xs text-white/50">privacy features</p>
      </div>

      <ProgressBar
        percentage={score.percentage}
        label="Score"
        color={highlight ? 'text-emerald-400' : 'text-white/60'}
        delay={0.2}
      />
    </SpotlightCard>
  )
}

function CellValue({ val, accent }: { val: boolean | string; accent: boolean }) {
  if (val === true) return <Check className="w-4 h-4 text-emerald-400 mx-auto" aria-hidden="true" />
  if (val === false) return <Minus className="w-4 h-4 text-white/60 mx-auto" aria-hidden="true" />
  return <span className={accent ? 'text-emerald-400 font-medium' : 'text-white/60'}>{val}</span>
}

export default function PlatformComparison() {
  return (
    <section className="py-12 sm:py-24 lg:py-36 section-divider">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="Why VeilSub"
            title="Privacy by Default"
            subtitle="Zero-knowledge proof-of-subscription without compromising your identity."
          />
        </ScrollReveal>

        {/* Overall Score Comparison */}
        <ScrollReveal delay={0.1}>
          <div className="mt-8 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ScoreCard platform="VeilSub" score={PLATFORM_SCORES.veilsub} highlight />
            <ScoreCard platform="Patreon" score={PLATFORM_SCORES.patreon} />
            <ScoreCard platform="Substack" score={PLATFORM_SCORES.substack} />
          </div>
        </ScrollReveal>

        {/* Privacy Features - Hero Grid */}
        <div className="mt-16 space-y-4">
          <ScrollReveal delay={0.2}>
            <div className="flex items-center gap-4 mb-6">
              <Shield className="w-5 h-5 text-violet-400/60" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-white">Privacy-First Features</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-violet-500/20 to-transparent" />
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRIVACY_FEATURES.map((row) => (
              <m.div key={row.feature} variants={staggerItemVariants}>
                <SpotlightCard className="p-4 rounded-2xl glass-accent h-full">
                  <p className="text-sm font-medium text-white mb-4 leading-snug">{row.feature}</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: 'VeilSub', val: row.veilsub, accent: true },
                      { label: 'Patreon', val: row.patreon, accent: false },
                      { label: 'Substack', val: row.substack, accent: false },
                    ].map((col) => (
                      <div key={col.label} className="flex flex-col items-center gap-1.5">
                        <CellValue val={col.val} accent={col.accent} />
                        <span className={`text-[10px] ${col.accent ? 'text-violet-400/80 font-medium' : 'text-white/50'}`}>
                          {col.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>
              </m.div>
            ))}
          </StaggerContainer>
        </div>

        {/* Feature Parity */}
        <div className="mt-12 space-y-4">
          <ScrollReveal delay={0.3}>
            <div className="flex items-center gap-4 mb-6">
              <TrendingUp className="w-5 h-5 text-emerald-400/60" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-white">Feature Parity</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURE_PARITY.map((row) => (
              <m.div key={row.feature} variants={staggerItemVariants}>
                <SpotlightCard className="p-4 rounded-2xl glass">
                  <p className="text-sm font-medium text-white mb-4">{row.feature}</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: 'VeilSub', val: row.veilsub, accent: true },
                      { label: 'Patreon', val: row.patreon, accent: false },
                      { label: 'Substack', val: row.substack, accent: false },
                    ].map((col) => (
                      <div key={col.label} className="flex flex-col items-center gap-1.5">
                        <CellValue val={col.val} accent={col.accent} />
                        <span className={`text-[10px] ${col.accent ? 'text-violet-400/80 font-medium' : 'text-white/50'}`}>
                          {col.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>
              </m.div>
            ))}
          </StaggerContainer>
        </div>

        {/* Platform Fee Comparison */}
        <ScrollReveal delay={0.4}>
          <div className="mt-12">
            <SpotlightCard className="p-4 sm:p-8 rounded-2xl glass max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-white mb-6 text-center">Platform Fee Comparison</h3>
              <div className="space-y-4">
                <ProgressBar percentage={50} label="VeilSub (5%)" color="text-emerald-400" delay={0} />
                <ProgressBar percentage={100} label="Patreon (8-12%)" color="text-orange-400" delay={0.1} />
                <ProgressBar percentage={100} label="Substack (10%)" color="text-red-400" delay={0.2} />
              </div>
              <p className="text-xs text-white/50 text-center mt-6">
                Lower fees = more revenue for creators
              </p>
            </SpotlightCard>
          </div>
        </ScrollReveal>

        {/* Summary Stats */}
        <ScrollReveal delay={0.5}>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="p-4 sm:p-8 rounded-2xl glass text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-2">7</div>
              <p className="text-xs text-white/60">Exclusive privacy features</p>
            </div>
            <div className="p-4 sm:p-8 rounded-2xl glass text-center">
              <div className="text-3xl font-bold text-violet-400 mb-2">100%</div>
              <p className="text-xs text-white/60">On-chain verification</p>
            </div>
            <div className="p-4 sm:p-8 rounded-2xl glass text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-2">50%</div>
              <p className="text-xs text-white/60">Lower fees than competitors</p>
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  )
}
