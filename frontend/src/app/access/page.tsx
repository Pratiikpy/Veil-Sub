'use client'

import { useState, useCallback } from 'react'
import { m } from 'framer-motion'
import { spring } from '@/lib/motion'
import {
  KeyRound,
  Shield,
  Lock,
  Unlock,
  CheckCircle2,
  Loader2,
  Hash,
  Code,
  Copy,
  Check,
  Layers,
  ArrowRight,
  Ban,
  AlertCircle,
  Globe,
  Cpu,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import ScrollReveal from '@/components/ScrollReveal'
import Badge from '@/components/ui/Badge'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import { useContractExecute } from '@/hooks/useContractExecute'
import { HERO_GLOW_STYLE, TITLE_STYLE as LETTER_SPACING_STYLE } from '@/lib/styles'
import { FEES } from '@/lib/config'

// ─── Program constants ─────────────────────────────────────────────────────
const ACCESS_PROGRAM = 'veilsub_access_v2.aleo'

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

// ─── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
}

// ─── Helper: query mapping ──────────────────────────────────────────────────
async function queryMapping(mapping: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/aleo/program/${encodeURIComponent(ACCESS_PROGRAM)}/mapping/${encodeURIComponent(mapping)}/${encodeURIComponent(key)}`
    )
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text === 'null' || text === '""') return null
    return text.replace(/"/g, '')
  } catch {
    return null
  }
}

// ─── Interactive Demo ───────────────────────────────────────────────────────
function InteractiveDemo() {
  const [step, setStep] = useState(0)

  const steps = [
    {
      label: 'User subscribes on VeilSub',
      detail: 'Gets an AccessPass record (private, encrypted to owner)',
      icon: Users,
      color: 'violet',
    },
    {
      label: 'Relay AccessPass to AccessProof',
      detail: 'Same fields, different record type -- proof relay pattern',
      icon: ArrowRight,
      color: 'blue',
    },
    {
      label: 'Third-party calls verify_membership()',
      detail: 'Checks: correct creator, tier >= min, not expired, not revoked',
      icon: Shield,
      color: 'emerald',
    },
    {
      label: 'Access granted -- user never identified',
      detail: 'The app only sees a ZK proof. No address, no identity.',
      icon: Unlock,
      color: 'amber',
    },
  ]

  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
        <Globe className="w-4 h-4 text-violet-400" />
        How &quot;Login with VeilSub&quot; Works
      </h3>

      <div className="space-y-3">
        {steps.map((s, i) => {
          const Icon = s.icon
          const active = i <= step
          return (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                active
                  ? `bg-${s.color}-500/[0.06] border-${s.color}-500/15`
                  : 'bg-transparent border-border/30 opacity-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                active ? `bg-${s.color}-500/10` : 'bg-white/[0.03]'
              }`}>
                <Icon className={`w-4 h-4 ${active ? `text-${s.color}-400` : 'text-white/50'}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${active ? 'text-white' : 'text-white/60'}`}>
                  {i + 1}. {s.label}
                </p>
                {active && (
                  <p className="text-xs text-white/50 mt-0.5">{s.detail}</p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-lg"
        >
          Back
        </Button>
        <Button
          variant="accent"
          size="sm"
          disabled={step === steps.length - 1}
          onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          className="rounded-lg"
        >
          Next
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </GlassCard>
  )
}

// ─── Register Gate Form ─────────────────────────────────────────────────────
function RegisterGateForm() {
  const { address, connected, execute } = useContractExecute()
  const [creatorHash, setCreatorHash] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)

  const handleRegister = useCallback(async () => {
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!creatorHash || !resourceId) {
      toast.error('Both fields are required')
      return
    }

    setSubmitting(true)
    setTxId(null)
    try {
      const result = await execute(
        'register_gate',
        [creatorHash, resourceId],
        FEES.REGISTER,
        ACCESS_PROGRAM
      )
      if (result) {
        setTxId(result)
        toast.success('Resource gate registered on-chain!')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transaction failed')
    } finally {
      setSubmitting(false)
    }
  }, [connected, creatorHash, resourceId, execute])

  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <Lock className="w-4 h-4 text-violet-400" />
        Register Gated Resource
      </h3>
      <p className="text-xs text-white/60 mb-5">
        Declare a resource that requires VeilSub subscription access.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Creator Hash (field)</label>
          <input
            type="text"
            value={creatorHash}
            onChange={(e) => setCreatorHash(e.target.value)}
            placeholder="Poseidon2 hash of creator address"
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Resource ID (field)</label>
          <input
            type="text"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            placeholder="Hash of API endpoint, content ID, or feature name"
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
          />
        </div>

        <Button
          variant="accent"
          className="w-full rounded-xl"
          disabled={!connected || submitting || !creatorHash || !resourceId}
          onClick={handleRegister}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Registering...
            </>
          ) : !connected ? (
            'Connect Wallet'
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Register Gate
            </>
          )}
        </Button>

        {txId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-emerald-400 font-medium">Gate registered!</p>
              <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ─── Revoke Pass Form ───────────────────────────────────────────────────────
function RevokePassForm() {
  const { address, connected, execute } = useContractExecute()
  const [passId, setPassId] = useState('')
  const [callerHash, setCallerHash] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)

  const handleRevoke = useCallback(async () => {
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!passId || !callerHash) {
      toast.error('Both fields are required')
      return
    }

    setSubmitting(true)
    setTxId(null)
    try {
      const result = await execute(
        'revoke_pass',
        [passId, callerHash],
        FEES.REGISTER,
        ACCESS_PROGRAM
      )
      if (result) {
        setTxId(result)
        toast.success('Pass revoked!')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transaction failed')
    } finally {
      setSubmitting(false)
    }
  }, [connected, passId, callerHash, execute])

  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <Ban className="w-4 h-4 text-red-400" />
        Revoke Access Pass
      </h3>
      <p className="text-xs text-white/60 mb-5">
        Mark a pass as revoked in this program&apos;s local revocation mapping.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Pass ID (field)</label>
          <input
            type="text"
            value={passId}
            onChange={(e) => setPassId(e.target.value)}
            placeholder="The pass_id to revoke"
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Your Identity Hash (field)</label>
          <input
            type="text"
            value={callerHash}
            onChange={(e) => setCallerHash(e.target.value)}
            placeholder="Poseidon2 hash of your address"
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all font-mono"
          />
        </div>

        <Button
          variant="secondary"
          className="w-full rounded-xl !border-red-500/20 !text-red-400 hover:!bg-red-500/5"
          disabled={!connected || submitting || !passId || !callerHash}
          onClick={handleRevoke}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Revoking...
            </>
          ) : !connected ? (
            'Connect Wallet'
          ) : (
            <>
              <Ban className="w-4 h-4" />
              Revoke Pass
            </>
          )}
        </Button>

        {txId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-emerald-400 font-medium">Pass revoked!</p>
              <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ─── Resource Access Counter ────────────────────────────────────────────────
function ResourceLookup() {
  const [resourceId, setResourceId] = useState('')
  const [count, setCount] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLookup = useCallback(async () => {
    if (!resourceId) return
    setLoading(true)
    try {
      const val = await queryMapping('resource_access_count', resourceId)
      setCount(val ? val.replace('u64', '') : '0')
    } catch {
      toast.error('Query failed')
    } finally {
      setLoading(false)
    }
  }, [resourceId])

  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <Cpu className="w-4 h-4 text-blue-400" />
        Resource Access Counter
      </h3>
      <p className="text-xs text-white/60 mb-4">
        Query aggregate access count for any resource (no wallet needed).
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
          placeholder="resource_id (field)"
          className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
        />
        <Button
          variant="secondary"
          onClick={handleLookup}
          disabled={loading || !resourceId}
          className="rounded-xl"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Query'}
        </Button>
      </div>

      {count !== null && (
        <div className="p-4 rounded-xl bg-black/30 border border-border/30 text-center">
          <p className="text-3xl font-bold text-white">{count}</p>
          <p className="text-xs text-white/60 mt-1">total accesses (aggregate, no per-user tracking)</p>
        </div>
      )}
    </GlassCard>
  )
}

// ─── Integration Code Examples ──────────────────────────────────────────────
const VERIFY_CODE = `// 1. User provides their AccessProof data
const proof = {
  creator: userCreatorAddress,
  tier: 2,
  pass_id: passIdField,
  expires_at: expiresAtBlock,
  privacy_level: 0,
}

// 2. Call verify_membership on veilsub_access_v2.aleo
const tx = await programManager.execute(
  'veilsub_access_v2.aleo',
  'verify_membership',
  [proofRecord, creatorHash, '1u8'], // min_tier = 1
  150_000
)

// 3. If tx succeeds, user has valid subscription
// The verifying app NEVER sees the user's address`

const GATE_CODE = `// Gate a premium API endpoint
const tx = await programManager.execute(
  'veilsub_access_v2.aleo',
  'gate_resource_tiered',
  [
    proofRecord,      // user's AccessProof
    resourceIdField,  // hash of endpoint path
    creatorHash,      // which creator's subscription
    '2u8',            // min_tier = 2 (premium)
  ],
  150_000
)

// On-chain: access_log records the event (hashed)
// On-chain: resource_access_count incremented`

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function AccessPage() {
  return (
    <PageTransition className="min-h-screen">
      {/* Hero */}
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
                <KeyRound className="w-4 h-4" aria-hidden="true" />
                Access Control
              </Badge>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
              style={LETTER_SPACING_STYLE}
            >
              Login with VeilSub
            </h1>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Gate any resource behind VeilSub subscriptions. Users prove membership
              via zero-knowledge proofs -- the verifying app never learns their identity.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400">
                <Shield className="w-3 h-3" aria-hidden="true" />
                Zero-knowledge access
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <Layers className="w-3 h-3" aria-hidden="true" />
                5 transitions
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <Cpu className="w-3 h-3" aria-hidden="true" />
                4 mappings
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* Interactive Demo + Forms */}
      <section className="py-12 sm:py-20">
        <Container>
          <div className="max-w-3xl mx-auto space-y-6">
            <ScrollReveal>
              <InteractiveDemo />
            </ScrollReveal>

            <div className="grid sm:grid-cols-2 gap-6">
              <ScrollReveal delay={0.1}>
                <RegisterGateForm />
              </ScrollReveal>
              <ScrollReveal delay={0.15}>
                <RevokePassForm />
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.2}>
              <ResourceLookup />
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Code Examples */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-2xl sm:text-3xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Integration Examples
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                Add VeilSub access control to your Aleo application with just a few lines.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-3xl mx-auto space-y-6">
            <ScrollReveal delay={0.1}>
              <div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-t-xl bg-white/[0.03] border border-border/50 border-b-0">
                  <Code className="w-3.5 h-3.5 text-white/50" aria-hidden="true" />
                  <span className="text-xs text-white/50 font-medium">verify_membership.ts</span>
                </div>
                <CodeBlock code={VERIFY_CODE} className="!rounded-t-none [&>pre]:!rounded-t-none" />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-t-xl bg-white/[0.03] border border-border/50 border-b-0">
                  <Code className="w-3.5 h-3.5 text-white/50" aria-hidden="true" />
                  <span className="text-xs text-white/50 font-medium">gate_resource.ts</span>
                </div>
                <CodeBlock code={GATE_CODE} className="!rounded-t-none [&>pre]:!rounded-t-none" />
              </div>
            </ScrollReveal>
          </div>

          {/* Transitions overview */}
          <ScrollReveal delay={0.2}>
            <div className="max-w-3xl mx-auto mt-12">
              <GlassCard hover={false} className="!p-0 overflow-hidden">
                <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-white/50">
                  <div className="col-span-4">Transition</div>
                  <div className="col-span-6">Purpose</div>
                  <div className="col-span-2">Finalize</div>
                </div>
                {[
                  { name: 'verify_membership', purpose: 'Core "Login with VeilSub" -- proves subscription without revealing identity', finalize: 'revocation + expiry' },
                  { name: 'gate_resource', purpose: 'Gate any resource with access logging and aggregate counter', finalize: 'revocation + expiry + log' },
                  { name: 'gate_resource_tiered', purpose: 'Same as gate_resource but enforces minimum tier level', finalize: 'revocation + expiry + log' },
                  { name: 'register_gate', purpose: 'Register a new gated resource (admin)', finalize: 'increment creator_gates' },
                  { name: 'revoke_pass', purpose: 'Mark a pass as revoked locally', finalize: 'set pass_revoked' },
                ].map((t, i) => (
                  <div
                    key={t.name}
                    className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-3 ${
                      i < 4 ? 'border-b border-border/30' : ''
                    } hover:bg-white/[0.02] transition-colors`}
                  >
                    <div className="sm:col-span-4">
                      <code className="text-xs font-mono text-violet-400">{t.name}</code>
                    </div>
                    <div className="sm:col-span-6">
                      <p className="text-xs text-white/55">{t.purpose}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-white/60">{t.finalize}</p>
                    </div>
                  </div>
                ))}
              </GlassCard>
            </div>
          </ScrollReveal>

          {/* Program badge */}
          <ScrollReveal delay={0.25}>
            <div className="flex items-center justify-center gap-2 mt-8">
              <code className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-border/50 text-xs text-white/50 font-mono">
                {ACCESS_PROGRAM}
              </code>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                deployed
              </span>
            </div>
          </ScrollReveal>
        </Container>
      </section>
    </PageTransition>
  )
}
