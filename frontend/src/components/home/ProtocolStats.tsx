'use client'

import { Shield, CheckCircle2 } from 'lucide-react'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ScrollReveal from '@/components/ScrollReveal'
import Odometer from '@/components/Odometer'
import SpotlightCard from '@/components/ui/SpotlightCard'
import { useProtocolStats } from '@/hooks/useProtocolStats'

// Extracted style constant to prevent re-renders
const QUOTE_STYLE = { letterSpacing: '-0.02em' } as const

const STATS = [
  { key: 'privacy', value: 100, suffix: '%', label: 'Private', sublabel: 'No addresses stored on-chain' },
  { key: 'transitions', value: 27, suffix: '', label: 'Transitions', sublabel: 'Leo smart contract functions' },
  { key: 'records', value: 6, suffix: '', label: 'Record Types', sublabel: 'Subscription pass, audit token, etc.' },
  { key: 'versions', value: 27, suffix: '', label: 'Versions', sublabel: 'Iterative testnet deploys', prefix: 'v' },
]

export default function ProtocolStats() {
  const { stats, loading } = useProtocolStats()

  return (
    <section className="py-12 sm:py-24 lg:py-36 section-divider">
      <Container>
        <ScrollReveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Quote card */}
            <div className="col-span-2 sm:row-span-2 relative rounded-3xl p-[1px] overflow-hidden">
              <div className="absolute inset-[-100%] opacity-50 animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(255,255,255,0.5)_90deg,rgba(59,130,246,0.5)_180deg,rgba(16,185,129,0.4)_220deg,rgba(59,130,246,0.5)_270deg,rgba(255,255,255,0.5)_330deg,transparent_360deg)]" />
            <div className="relative h-full rounded-[23px] glass p-6 sm:p-8 flex flex-col justify-between transition-all duration-300">
              <div>
                <Badge variant="accent">Protocol Stats</Badge>
                <p
                  className="mt-6 text-2xl sm:text-3xl font-serif italic text-white leading-snug"
                  style={QUOTE_STYLE}
                >
                  <span className="text-white/60">&ldquo;</span>No addresses stored on-chain — even the smart contract
                  never learns who subscribes to whom.<span className="text-white/60">&rdquo;</span>
                </p>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white/50" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">VeilSub Protocol</p>
                    <p className="text-xs text-white/60">Built on Aleo</p>
                  </div>
                </div>
                {!loading && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20">
                    <CheckCircle2 className={`w-4 h-4 ${stats.programDeployed ? 'text-emerald-400 animate-pulse' : 'text-white/50'}`} aria-hidden="true" />
                    <span className={`text-xs font-semibold ${stats.programDeployed ? 'text-emerald-400' : 'text-white/50'}`}>
                      {stats.programDeployed ? 'Live on Testnet' : 'Checking...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            </div>

            {/* Stat cards */}
            {STATS.map((stat) => (
              <SpotlightCard
                key={stat.label}
                className="rounded-3xl glass p-6 sm:p-8 flex flex-col justify-between hover:border-white/[0.08] transition-all duration-300"
                tiltMax={6}
              >
                <Odometer
                  end={stat.value}
                  prefix={stat.prefix || ''}
                  suffix={stat.suffix}
                  className="text-4xl font-bold tracking-tight text-white"
                />
                <div className="mt-4">
                  <p className="text-sm text-white/80 font-medium">{stat.label}</p>
                  <p className="text-xs text-white/70 mt-1">{stat.sublabel}</p>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </ScrollReveal>
      </Container>
    </section>
  )
}
