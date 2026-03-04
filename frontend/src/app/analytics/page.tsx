'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  CreditCard,
  Coins,
  FileCode,
  ShieldCheck,
  EyeOff,
  Lock,
  GitBranch,
  Activity,
  Layers,
  Database,
  Code,
} from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import { formatCredits } from '@/lib/utils'

interface GlobalStats {
  totalCreators: number
  totalSubscriptions: number
  totalRevenue: number
  activePrograms: number
}

const CONTRACT_VERSIONS = [
  {
    version: 'v4',
    description: 'Core subscriptions with AccessPass records and tier-based pricing',
  },
  {
    version: 'v5',
    description: 'Token-based payments and creator tipping support',
  },
  {
    version: 'v6',
    description: 'Content publishing with on-chain metadata hashes',
  },
  {
    version: 'v7',
    description: 'CreatorReceipt and AuditToken record types added',
  },
  {
    version: 'v8',
    description: 'Walletless explorer, content hashes, mobile navigation',
  },
  {
    version: 'v12',
    description: 'Encrypted content delivery, access revocation, dispute resolution',
  },
  {
    version: 'v15',
    description: 'Subscription transfer, revocation enforcement, 28 transitions, 22 mappings, 1380 lines',
  },
]

export default function AnalyticsPage() {
  const [stats, setStats] = useState<GlobalStats>({
    totalCreators: 0,
    totalSubscriptions: 0,
    totalRevenue: 0,
    activePrograms: 1,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/analytics?global_stats=true')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch {
        // Silently fail — show zeros
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <PageTransition>
      <main className="min-h-screen bg-[rgb(2,0,5)] pt-28 pb-20">
        <div className="max-w-[1120px] mx-auto px-6">
          {/* Hero */}
          <div className="mb-16">
            <h1 className="text-3xl font-semibold text-white tracking-tight mb-3">
              Platform Analytics
            </h1>
            <p className="text-[#a1a1aa] text-base max-w-2xl leading-relaxed">
              Aggregate statistics from on-chain mappings. All data is public — no subscriber
              identities exposed.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            <StatsCard
              icon={Users}
              label="Total Creators"
              value={loading ? '...' : stats.totalCreators.toString()}
              delay={0}
            />
            <StatsCard
              icon={CreditCard}
              label="Total Subscriptions"
              value={loading ? '...' : stats.totalSubscriptions.toString()}
              delay={0.05}
            />
            <StatsCard
              icon={Coins}
              label="Platform Revenue"
              value={loading ? '...' : `${formatCredits(stats.totalRevenue)} ALEO`}
              delay={0.1}
            />
            <StatsCard
              icon={FileCode}
              label="Contract Version"
              value="v15"
              delay={0.15}
            />
          </div>

          {/* Protocol Stats */}
          <section className="mb-16">
            <h2 className="text-lg font-medium text-white mb-6">Protocol Stats</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ProtocolStat icon={Activity} value="31" label="Transitions" delay={0} />
              <ProtocolStat icon={Layers} value="7" label="Record Types" delay={0.05} />
              <ProtocolStat icon={Database} value="25" label="Mappings" delay={0.1} />
              <ProtocolStat icon={Code} value="1,517" label="Lines of Leo" delay={0.15} />
            </div>
          </section>

          {/* Privacy Guarantees */}
          <section className="mb-16">
            <h2 className="text-lg font-medium text-white mb-6">Privacy Guarantees</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <GlassCard delay={0}>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-[8px] bg-[#8b5cf6]/10">
                    <EyeOff className="w-5 h-5 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white mb-1">0</p>
                    <p className="text-sm font-medium text-[#fafafa] mb-1">Identity Leaks</p>
                    <p className="text-sm text-[#71717a] leading-relaxed">
                      Subscriber addresses never appear in finalize blocks. On-chain state reveals
                      nothing about who subscribes to whom.
                    </p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard delay={0.05}>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-[8px] bg-[#8b5cf6]/10">
                    <ShieldCheck className="w-5 h-5 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white mb-1">0</p>
                    <p className="text-sm font-medium text-[#fafafa] mb-1">
                      Footprint Verifications
                    </p>
                    <p className="text-sm text-[#71717a] leading-relaxed">
                      verify_access has no finalize block. Checking your subscription leaves
                      zero trace on-chain.
                    </p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard delay={0.1}>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-[8px] bg-[#8b5cf6]/10">
                    <Lock className="w-5 h-5 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white mb-1">100%</p>
                    <p className="text-sm font-medium text-[#fafafa] mb-1">Private Payments</p>
                    <p className="text-sm text-[#71717a] leading-relaxed">
                      All payments use transfer_private. Transaction amounts and participants
                      are never publicly visible.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Contract Versions Timeline */}
          <section>
            <h2 className="text-lg font-medium text-white mb-6">Contract Versions</h2>
            <GlassCard hover={false}>
              <div className="space-y-0">
                {CONTRACT_VERSIONS.map((item, i) => (
                  <motion.div
                    key={item.version}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className={`flex items-start gap-4 py-4 ${
                      i < CONTRACT_VERSIONS.length - 1
                        ? 'border-b border-[rgba(255,255,255,0.06)]'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 shrink-0">
                      <GitBranch className="w-4 h-4 text-[#71717a]" />
                      <span
                        className={`text-sm font-mono font-medium ${
                          item.version === 'v15' ? 'text-[#8b5cf6]' : 'text-[#a1a1aa]'
                        }`}
                      >
                        {item.version}
                      </span>
                    </div>
                    <p className="text-sm text-[#71717a] leading-relaxed">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </section>
        </div>
      </main>
    </PageTransition>
  )
}

function StatsCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: typeof Users
  label: string
  value: string
  delay: number
}) {
  return (
    <GlassCard delay={delay}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-4 h-4 text-[#71717a]" />
        <span className="text-xs text-[#71717a] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </GlassCard>
  )
}

function ProtocolStat({
  icon: Icon,
  value,
  label,
  delay,
}: {
  icon: typeof Activity
  value: string
  label: string
  delay: number
}) {
  return (
    <GlassCard delay={delay}>
      <div className="text-center">
        <Icon className="w-5 h-5 text-[#a1a1aa] mx-auto mb-3" />
        <p className="text-2xl font-semibold text-white mb-1">{value}</p>
        <p className="text-sm text-[#71717a]">{label}</p>
      </div>
    </GlassCard>
  )
}
