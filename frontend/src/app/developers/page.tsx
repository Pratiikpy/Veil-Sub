'use client'

import { useState, useCallback } from 'react'
import { m } from 'framer-motion'
import { spring } from '@/lib/motion'
import {
  Code,
  Terminal,
  Shield,
  ArrowRight,
  Copy,
  Check,
  Layers,
  Database,
  Users,
  Lock,
  Key,
  Fingerprint,
  Activity,
  ExternalLink,
  Cpu,
  Zap,
  Eye,
  Bot,
  Package,
  BookOpen,
  GitBranch,
} from 'lucide-react'
import Link from 'next/link'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import ScrollReveal from '@/components/ScrollReveal'
import Badge from '@/components/ui/Badge'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import { DEPLOYED_PROGRAM_ID } from '@/lib/config'

// ─── Static styles ──────────────────────────────────────────────────────────
import { HERO_GLOW_STYLE, TITLE_STYLE as LETTER_SPACING_STYLE } from '@/lib/styles'

// ─── Code snippets ──────────────────────────────────────────────────────────

const INSTALL_SNIPPET = 'npm install @veilsub/sdk'

const QUICKSTART_SNIPPET = `import { VeilSubClient } from '@veilsub/sdk'

const client = new VeilSubClient({
  network: 'testnet',
  programId: '${DEPLOYED_PROGRAM_ID}',
})

// Query creator stats (no wallet needed)
const stats = await client.getCreatorStats(creatorHash)
// stats.subscriberCount, stats.tierPrice available

// Verify subscriber access (zero-finalize)
const hasAccess = await client.verifyAccess(accessPass)
// ^ Leaves ZERO on-chain footprint`

const INTEGRATION_STEPS = [
  {
    step: 1,
    title: 'Install SDK',
    code: 'npm install @veilsub/sdk',
    description: 'Add the VeilSub SDK to your project. Works with any Aleo-compatible frontend.',
  },
  {
    step: 2,
    title: 'Import VeilSub Access',
    code: `import { VeilSubClient } from '@veilsub/sdk'
import { verifyAccess } from '@veilsub/sdk/access'

const client = new VeilSubClient({ network: 'testnet' })`,
    description: 'Initialize the client and import the access verification module.',
  },
  {
    step: 3,
    title: 'Gate Your Resource',
    code: `// In your API route or server action
const pass = await getAccessPass(userAddress, creatorHash)
if (!pass) {
  return { error: 'No active subscription' }
}

// Verify on-chain (zero finalize footprint)
const verified = await verifyAccess(pass)
if (!verified) {
  return { error: 'Subscription expired or revoked' }
}

// Grant access to protected content
return { content: await fetchProtectedContent(contentId) }`,
    description: 'Check the user\'s AccessPass record and verify it on-chain. The verification leaves zero public trace.',
  },
  {
    step: 4,
    title: 'Verify On-Chain',
    code: `// Direct mapping query (no wallet needed)
const tierPrice = await client.queryMapping(
  'tier_prices',
  creatorHash
)

// Subscribe a user (requires wallet)
const tx = await client.subscribe({
  creatorHash,
  tier: 2,
  amount: tierPrice,
  duration: 864_000, // ~30 days
})`,
    description: 'Query on-chain mappings for public data, or build transactions for wallet-connected users.',
  },
]

// ─── SDK Features ───────────────────────────────────────────────────────────

const SDK_FEATURES = [
  {
    icon: Users,
    title: 'Subscribe',
    description: 'Credits, USDCx, or USAD. Standard, blind, or trial modes. Privacy level chosen per-transaction.',
    tag: 'subscribe / subscribe_blind / subscribe_trial',
  },
  {
    icon: Shield,
    title: 'Verify Access',
    description: 'Zero-finalize proof from local AccessPass record. The chain never learns who verified or what.',
    tag: 'verify_access / verify_tier_access',
  },
  {
    icon: Database,
    title: 'Query Mappings',
    description: '30 on-chain mappings queryable without a wallet. All keys are Poseidon2 field hashes.',
    tag: '30 field-keyed mappings',
  },
  {
    icon: Zap,
    title: 'Build Transactions',
    description: 'Wallet-agnostic transaction builder. Works with Leo Wallet, Puzzle, Fox, Soter, and Shield.',
    tag: 'buildTransaction()',
  },
  {
    icon: Key,
    title: 'Creator Management',
    description: 'Register, create tiers, publish content, manage subscriptions. Full creator lifecycle.',
    tag: 'register / create_tier / publish',
  },
  {
    icon: Fingerprint,
    title: 'Audit Tokens',
    description: 'Selective disclosure with scope_mask bitfields. Prove specific claims without revealing identity.',
    tag: 'create_audit_token (scope_mask)',
  },
]

// ─── 7 Programs Overview ────────────────────────────────────────────────────

const PROGRAMS = [
  {
    name: DEPLOYED_PROGRAM_ID,
    transitions: 31,
    mappings: 30,
    features: 'Core subscriptions, tipping, content, access verification, stablecoin support',
    status: 'deployed' as const,
    explorerUrl: `https://testnet.aleoscan.io/program?id=${DEPLOYED_PROGRAM_ID}`,
  },
  {
    name: 'veilsub_governance_v1.aleo',
    transitions: 8,
    mappings: 5,
    features: 'Private voting, proposal lifecycle, BHP256 commit-reveal',
    status: 'planned' as const,
    explorerUrl: null,
  },
  {
    name: 'veilsub_marketplace_v1.aleo',
    transitions: 10,
    mappings: 6,
    features: 'Sealed-bid auctions, reputation scores, Pedersen aggregated ratings',
    status: 'planned' as const,
    explorerUrl: null,
  },
  {
    name: 'veilsub_reputation_v1.aleo',
    transitions: 6,
    mappings: 4,
    features: 'Threshold proofs, tier badges, subscriber count commitments',
    status: 'planned' as const,
    explorerUrl: null,
  },
  {
    name: 'veilsub_oracle_v1.aleo',
    transitions: 4,
    mappings: 3,
    features: 'Price feeds, exchange rate proofs, compliance attestations',
    status: 'planned' as const,
    explorerUrl: null,
  },
  {
    name: 'test_usdcx_stablecoin.aleo',
    transitions: 5,
    mappings: 3,
    features: 'USDCx token with transfer_private, mint, burn, compliance hooks',
    status: 'deployed' as const,
    explorerUrl: 'https://testnet.aleoscan.io/program?id=test_usdcx_stablecoin.aleo',
  },
  {
    name: 'test_usad_stablecoin.aleo',
    transitions: 5,
    mappings: 3,
    features: 'USAD token with transfer_private, mint, burn, compliance hooks',
    status: 'deployed' as const,
    explorerUrl: 'https://testnet.aleoscan.io/program?id=test_usad_stablecoin.aleo',
  },
]

// ─── CopyButton ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/[0.06] border border-border/50 text-white/50 hover:text-white/70 hover:bg-white/[0.1] transition-all"
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
      ) : (
        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
      )}
    </button>
  )
}

// ─── CodeBlock ──────────────────────────────────────────────────────────────

function CodeBlock({ code, className = '' }: { code: string; className?: string }) {
  return (
    <div className={`relative group ${className}`}>
      <pre className="p-4 rounded-xl bg-black/60 border border-border/50 overflow-x-auto">
        <code className="text-xs sm:text-sm font-mono text-white/80 leading-relaxed whitespace-pre">
          {code}
        </code>
      </pre>
      <CopyButton text={code} />
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DevelopersPage() {
  return (
    <PageTransition className="min-h-screen">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] sm:w-[1100px] h-[350px] sm:h-[700px] pointer-events-none"
          style={HERO_GLOW_STYLE}
        />
        <Container className="relative pt-12 sm:pt-20 pb-8 sm:pb-16">
          <m.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.gentle}
            className="text-center"
          >
            <div className="flex justify-center mb-8">
              <Badge variant="accent">
                <Code className="w-4 h-4" aria-hidden="true" />
                Developer Platform
              </Badge>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
              style={LETTER_SPACING_STYLE}
            >
              Build on VeilSub
            </h1>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Add privacy-preserving access control to any Aleo application. 7 composable programs,
              31+ transitions, 30+ mappings -- all field-hashed, zero addresses in finalize.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <Package className="w-3 h-3" aria-hidden="true" />
                @veilsub/sdk
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400">
                <Layers className="w-3 h-3" aria-hidden="true" />
                7 programs
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <Shield className="w-3 h-3" aria-hidden="true" />
                BSP privacy guarantees
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* ── Quick Start ──────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-10">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Quick Start
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                Get started in under a minute. Install the SDK and start querying on-chain data.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-2xl mx-auto space-y-4">
            {/* Install command */}
            <ScrollReveal delay={0.05}>
              <div className="relative">
                <div className="flex items-center gap-2 px-4 py-3 rounded-t-xl bg-white/[0.03] border border-border/50 border-b-0">
                  <Terminal className="w-3.5 h-3.5 text-white/50" aria-hidden="true" />
                  <span className="text-xs text-white/50 font-medium">Terminal</span>
                </div>
                <CodeBlock code={INSTALL_SNIPPET} className="!rounded-t-none [&>pre]:!rounded-t-none" />
              </div>
            </ScrollReveal>

            {/* Usage example */}
            <ScrollReveal delay={0.1}>
              <div className="relative">
                <div className="flex items-center gap-2 px-4 py-3 rounded-t-xl bg-white/[0.03] border border-border/50 border-b-0">
                  <Code className="w-3.5 h-3.5 text-white/50" aria-hidden="true" />
                  <span className="text-xs text-white/50 font-medium">app.ts</span>
                </div>
                <CodeBlock code={QUICKSTART_SNIPPET} className="!rounded-t-none [&>pre]:!rounded-t-none" />
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* ── SDK Features Grid ────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                SDK Features
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                Everything you need to add private subscriptions, access control, and creator
                economics to your dApp.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {SDK_FEATURES.map((feature, i) => {
              const Icon = feature.icon
              return (
                <ScrollReveal key={feature.title} delay={i * 0.05}>
                  <GlassCard className="!p-5">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
                        <Icon className="w-5 h-5 text-violet-400" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold text-sm mb-1">{feature.title}</h3>
                        <p className="text-xs text-white/55 leading-relaxed mb-2">
                          {feature.description}
                        </p>
                        <code className="px-2 py-0.5 rounded bg-white/[0.04] text-xs text-white/50 font-mono">
                          {feature.tag}
                        </code>
                      </div>
                    </div>
                  </GlassCard>
                </ScrollReveal>
              )
            })}
          </div>
        </Container>
      </section>

      {/* ── 7 Programs Overview ──────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                7 Composable Programs
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                VeilSub is a protocol ecosystem, not a single contract. Each program handles a
                specific domain with dedicated privacy guarantees.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="max-w-4xl mx-auto">
              <GlassCard hover={false} className="!p-0 overflow-hidden">
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-white/50">
                  <div className="col-span-4">Program</div>
                  <div className="col-span-1 text-center">Tx</div>
                  <div className="col-span-1 text-center">Maps</div>
                  <div className="col-span-4">Features</div>
                  <div className="col-span-2 text-center">Status</div>
                </div>

                {/* Table rows */}
                {PROGRAMS.map((program, i) => (
                  <div
                    key={program.name}
                    className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 ${
                      i < PROGRAMS.length - 1 ? 'border-b border-border/30' : ''
                    } hover:bg-white/[0.02] transition-colors`}
                  >
                    <div className="sm:col-span-4 flex items-center gap-2">
                      <code className="text-xs font-mono text-white/80 truncate">
                        {program.name}
                      </code>
                      {program.explorerUrl && (
                        <a
                          href={program.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-violet-400 hover:text-violet-300 transition-colors"
                          title="View on Aleoscan"
                        >
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                    <div className="sm:col-span-1 text-center">
                      <span className="text-xs text-white/60 font-mono sm:inline hidden">
                        {program.transitions}
                      </span>
                      <span className="text-xs text-white/50 sm:hidden">
                        {program.transitions} transitions, {program.mappings} mappings
                      </span>
                    </div>
                    <div className="sm:col-span-1 text-center hidden sm:block">
                      <span className="text-xs text-white/60 font-mono">{program.mappings}</span>
                    </div>
                    <div className="sm:col-span-4">
                      <p className="text-xs text-white/55 leading-relaxed">{program.features}</p>
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-start sm:justify-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          program.status === 'deployed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {program.status === 'deployed' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                        {program.status}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Summary row */}
                <div className="px-5 py-3 bg-white/[0.02] border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-white/50">
                    Total: {PROGRAMS.reduce((s, p) => s + p.transitions, 0)} transitions,{' '}
                    {PROGRAMS.reduce((s, p) => s + p.mappings, 0)} mappings across{' '}
                    {PROGRAMS.length} programs
                  </span>
                  <span className="text-xs text-emerald-400">
                    {PROGRAMS.filter((p) => p.status === 'deployed').length} deployed
                  </span>
                </div>
              </GlassCard>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── Integration Guide ────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Integration Guide
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                Add VeilSub access control to your dApp in four steps. Every verification is
                zero-finalize.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-3xl mx-auto space-y-6">
            {INTEGRATION_STEPS.map((step, i) => (
              <ScrollReveal key={step.step} delay={i * 0.08}>
                <div className="flex gap-4">
                  {/* Step number */}
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                      <span className="text-xs font-bold text-violet-400">{step.step}</span>
                    </div>
                    {i < INTEGRATION_STEPS.length - 1 && (
                      <div className="w-px flex-1 bg-border/30 mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <h3 className="text-white font-semibold text-sm mb-1">{step.title}</h3>
                    <p className="text-xs text-white/55 leading-relaxed mb-3">
                      {step.description}
                    </p>
                    <CodeBlock code={step.code} />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── API Reference + Monitor Bot ──────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* API Reference */}
            <ScrollReveal>
              <GlassCard className="!p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-violet-400" aria-hidden="true" />
                  <h3 className="text-white font-semibold">API Reference</h3>
                </div>
                <p className="text-xs text-white/55 leading-relaxed mb-4">
                  Full SDK documentation with method signatures, type definitions, and usage
                  examples.
                </p>
                <div className="space-y-2 mb-5">
                  {[
                    'VeilSubClient(config)',
                    'client.subscribe(params)',
                    'client.verifyAccess(pass)',
                    'client.queryMapping(name, key)',
                    'client.buildTransaction(transition, inputs)',
                    'client.getCreatorStats(hash)',
                  ].map((method) => (
                    <div
                      key={method}
                      className="px-3 py-2 rounded-lg bg-black/30 border border-border/30"
                    >
                      <code className="text-xs font-mono text-white/60">{method}</code>
                    </div>
                  ))}
                </div>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  Full documentation
                </Link>
              </GlassCard>
            </ScrollReveal>

            {/* Monitor Bot */}
            <ScrollReveal delay={0.1}>
              <GlassCard className="!p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                  <h3 className="text-white font-semibold">Monitor Bot</h3>
                </div>
                <p className="text-xs text-white/55 leading-relaxed mb-4">
                  Autonomous monitoring bot that tracks on-chain state, alerts on anomalies, and
                  provides real-time protocol health metrics.
                </p>
                <CodeBlock
                  code={`# Clone and run the monitor
git clone https://github.com/veilsub/monitor
cd monitor && npm install
npm run start -- --network testnet

# Or use Docker
docker run -d veilsub/monitor:latest \\
  --program ${DEPLOYED_PROGRAM_ID} \\
  --alert-webhook $WEBHOOK_URL`}
                />
                <div className="mt-4 flex items-center gap-3 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                    Real-time monitoring
                  </span>
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-violet-400" aria-hidden="true" />
                    Anomaly detection
                  </span>
                </div>
              </GlassCard>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* ── Protocol Architecture ────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Protocol Architecture
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                Privacy at every layer. The Blind Subscription Protocol (BSP) enforces
                data minimization at the compiler level.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Activity, value: '31+', label: 'Transitions', color: 'violet' },
              { icon: Database, value: '30+', label: 'Mappings', color: 'blue' },
              { icon: GitBranch, value: '866+', label: 'Statements', color: 'emerald' },
              { icon: Eye, value: '0', label: 'Addresses in Finalize', color: 'amber' },
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <ScrollReveal key={stat.label} delay={i * 0.05}>
                  <GlassCard className="text-center !p-5">
                    <Icon className={`w-5 h-5 text-${stat.color}-400 mx-auto mb-3`} aria-hidden="true" />
                    <p className="text-2xl font-semibold text-white mb-1">{stat.value}</p>
                    <p className="text-xs text-white/50">{stat.label}</p>
                  </GlassCard>
                </ScrollReveal>
              )
            })}
          </div>

          {/* BSP callout */}
          <ScrollReveal delay={0.2}>
            <div className="max-w-3xl mx-auto mt-8 p-5 rounded-2xl bg-violet-500/[0.06] border border-violet-500/15">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-violet-300 mb-1">
                    Blind Subscription Protocol (BSP)
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Three privacy layers work together:{' '}
                    <strong className="text-violet-300">Layer 1</strong> (Blind Identity Rotation)
                    uses nonce-rotated Poseidon2 hashes.{' '}
                    <strong className="text-violet-300">Layer 2</strong> (Zero-Address Finalize)
                    ensures all 30 mappings are field-keyed.{' '}
                    <strong className="text-violet-300">Layer 3</strong> (Selective Disclosure)
                    enables scoped audit tokens. When you build on VeilSub, your users inherit all
                    three layers automatically.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Start Building
              </h2>
              <p className="text-white/60 mb-8">
                Add privacy-preserving access control to your dApp today. The SDK handles
                wallet integration, transaction building, and on-chain verification.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/explore">
                  <Button variant="accent" size="lg" className="rounded-full shadow-accent-lg">
                    Explore Creators
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
                <a
                  href={`https://testnet.aleoscan.io/program?id=${DEPLOYED_PROGRAM_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="lg" className="rounded-full">
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    View on Aleoscan
                  </Button>
                </a>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>
    </PageTransition>
  )
}
