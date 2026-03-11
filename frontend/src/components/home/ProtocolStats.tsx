'use client'

import { Shield, CheckCircle2 } from 'lucide-react'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ScrollReveal from '@/components/ScrollReveal'
import Odometer from '@/components/Odometer'
import SpotlightCard from '@/components/ui/SpotlightCard'
import { useProtocolStats } from '@/hooks/useProtocolStats'

const STATS = [
  { key: 'privacy', value: 100, suffix: '%', label: 'Private', sublabel: 'Zero-address finalize scope' },
  { key: 'transitions', value: 27, suffix: '', label: 'Transitions', sublabel: 'Leo smart contract functions' },
  { key: 'records', value: 6, suffix: '', label: 'Record Types', sublabel: 'AccessPass, AuditToken, etc.' },
  { key: 'versions', value: 27, suffix: '', label: 'Versions', sublabel: 'Iterative testnet deploys', prefix: 'v' },
]

export default function ProtocolStats() {
  const { stats, loading } = useProtocolStats()

  return (
    <section className="py-24 lg:py-36 section-divider">
      <Container>
        <ScrollReveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Quote card */}
            <div className="col-span-2 sm:row-span-2 rounded-3xl glass p-6 sm:p-8 flex flex-col justify-between hover:border-violet-500/[0.15] transition-all duration-300">
              <div>
                <Badge variant="accent">Protocol Stats</Badge>
                <p
                  className="mt-6 text-2xl sm:text-3xl font-serif italic text-white leading-snug"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  <span className="text-violet-400">&ldquo;</span>Zero addresses in finalize—even the smart contract
                  never learns who subscribes to whom.<span className="text-violet-400">&rdquo;</span>
                </p>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet-500/[0.08] border border-violet-500/[0.12] flex items-center justify-center">
                    <Shield className="w-5 h-5 text-violet-400/60" aria-hidden="true" />
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

            {/* Stat cards */}
            {STATS.map((stat) => (
              <SpotlightCard
                key={stat.label}
                className="rounded-3xl glass p-6 sm:p-8 flex flex-col justify-between hover:border-violet-500/[0.15] transition-all duration-300"
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
