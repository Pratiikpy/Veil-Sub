'use client'

import { useState, useEffect, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { spring } from '@/lib/motion'
import {
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Database,
  User,
  Users,
  ArrowRight,
  Layers,
  Hash,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Fingerprint,
  GitBranch,
  Activity,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import ScrollReveal from '@/components/ScrollReveal'
import Badge from '@/components/ui/Badge'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import { DEPLOYED_PROGRAM_ID, CREATOR_HASH_MAP } from '@/lib/config'

// ─── Static styles ──────────────────────────────────────────────────────────
import { HERO_GLOW_STYLE, TITLE_STYLE as LETTER_SPACING_STYLE } from '@/lib/styles'

// ─── Transaction privacy data ───────────────────────────────────────────────

interface PrivacyRow {
  id: string
  operation: string
  icon: typeof Shield
  youSee: string[]
  chainSees: string[]
  privacyLevel: 'full' | 'partial' | 'minimal'
  detail: string
  finalize: 'none' | 'hashed' | 'amounts'
}

const PRIVACY_TABLE: PrivacyRow[] = [
  {
    id: 'subscribe',
    operation: 'Subscribe',
    icon: User,
    youSee: ['Creator name', 'Tier name & price', 'Expiry date', 'Your subscription pass'],
    chainSees: [
      'One-way hash of your address (Poseidon2)',
      'Tier number',
      'Amount',
      'Expiry block height',
    ],
    privacyLevel: 'partial',
    detail:
      'Your address is hashed (one-way, using Poseidon2) before any public processing. The blockchain stores hashed identifiers — not your wallet address. Your subscription pass lives only in your wallet.',
    finalize: 'hashed',
  },
  {
    id: 'verify',
    operation: 'Verify Access',
    icon: ShieldCheck,
    youSee: ['"Access granted" or "denied"', 'Tier level confirmed'],
    chainSees: ['NOTHING — no trace left on-chain'],
    privacyLevel: 'full',
    detail:
      'Verification leaves no trace on-chain. The privacy proof is generated on your device from your subscription pass. The blockchain never learns who verified or what they verified.',
    finalize: 'none',
  },
  {
    id: 'audit-token',
    operation: 'Create Audit Token',
    icon: Fingerprint,
    youSee: ['Full verification token', 'Privacy controls', 'Scoped permissions'],
    chainSees: ['NOTHING — no trace left on-chain'],
    privacyLevel: 'full',
    detail:
      'Verification tokens are created entirely on your device (private). Privacy controls let you choose exactly what the verifier can see. No public trace is left on the blockchain.',
    finalize: 'none',
  },
  {
    id: 'tip-commit',
    operation: 'Tip (Commit Phase)',
    icon: Lock,
    youSee: ['Tip amount', 'Salt (random secret)', 'Creator you are tipping'],
    chainSees: ['Encrypted value only (sealed amount + secret)'],
    privacyLevel: 'full',
    detail:
      'The sealed tip stores only an encrypted value. The amount and your identity are hidden. Nobody — not even the creator — knows the tip amount until you reveal it.',
    finalize: 'hashed',
  },
  {
    id: 'tip-reveal',
    operation: 'Tip (Reveal Phase)',
    icon: Unlock,
    youSee: ['Amount revealed to creator', 'Creator receives payment'],
    chainSees: ['Amount', 'Creator identifier (hashed)'],
    privacyLevel: 'partial',
    detail:
      'The reveal step confirms the sealed amount matches, then transfers privately. The creator identifier (not wallet address) and amount become visible, but the tipper identity remains hidden.',
    finalize: 'amounts',
  },
  {
    id: 'publish',
    operation: 'Publish Content',
    icon: Database,
    youSee: ['Title', 'Body text', 'Required tier', 'Content ID'],
    chainSees: ['Content identifier (hashed)', 'Creator identifier (hashed)', 'Minimum tier required'],
    privacyLevel: 'partial',
    detail:
      'Content metadata is stored as mathematical fingerprints. The actual title and body are never on-chain — they live in encrypted off-chain storage. Only hashed references appear publicly.',
    finalize: 'hashed',
  },
  {
    id: 'dispute',
    operation: 'Dispute Content',
    icon: AlertTriangle,
    youSee: ['Content ID', 'Reason for dispute'],
    chainSees: ['Content identifier (hashed)', 'Dispute count increment'],
    privacyLevel: 'partial',
    detail:
      'A dispute increments a counter linked to the content identifier. The disputer identity is never stored — only the fact that a dispute occurred. Your wallet address is never stored publicly.',
    finalize: 'hashed',
  },
  {
    id: 'blind-subscribe',
    operation: 'Blind Subscribe',
    icon: EyeOff,
    youSee: ['Creator name', 'Tier & price', 'Your nonce-rotated identity'],
    chainSees: [
      'Randomized identity hash — different each time',
      'Tier number',
      'Amount',
    ],
    privacyLevel: 'full',
    detail:
      'Maximum privacy mode. Each subscription uses a unique random value, producing a different identity hash every time. Even the creator cannot link two subscriptions to the same person.',
    finalize: 'hashed',
  },
]

// ─── BSP layer data ─────────────────────────────────────────────────────────

const BSP_LAYERS = [
  {
    layer: 1,
    name: 'Blind Identity Rotation',
    color: 'violet',
    description:
      'Each blind subscription includes a random value. Your address is hashed with this random value to produce a unique identity every time — the creator sees "different" subscribers for the same person.',
    tech: 'One-way hash (Poseidon2)',
    operations: ['Blind Subscribe', 'Blind Renew'],
  },
  {
    layer: 2,
    name: 'Zero-Address Finalize',
    color: 'blue',
    description:
      'All 30 on-chain mappings are indexed by mathematical fingerprints, never by wallet addresses. Your wallet address is used only during private processing on your device. Public data only sees hashed identifiers.',
    tech: '30 on-chain mappings, all hash-indexed',
    operations: ['All actions'],
  },
  {
    layer: 3,
    name: 'Selective Disclosure',
    color: 'emerald',
    description:
      'Verification tokens with privacy controls allow subscribers to prove specific claims (e.g., "I am a tier-2 subscriber") without revealing their full identity. Verification leaves no trace on-chain.',
    tech: 'Privacy controls (selective disclosure)',
    operations: ['Create Token', 'Verify Access', 'Verify Tier'],
  },
]

// ─── Patreon comparison data ────────────────────────────────────────────────

const COMPARISON_ROWS = [
  {
    aspect: 'Subscriber List',
    patreon: 'Visible to creator, staff, and via data breach',
    veilsub: 'Encrypted in subscription passes — only the subscriber holds the key',
    patreonBad: true,
  },
  {
    aspect: 'Payment History',
    patreon: 'Stored on credit card processor, linked to real identity',
    veilsub: 'Private transfer — no addresses on-chain, amount in encrypted pass',
    patreonBad: true,
  },
  {
    aspect: 'Platform Knowledge',
    patreon: 'Patreon sees everything: who, when, how much, what content',
    veilsub: 'VeilSub sees aggregate counts only — no individual subscriber data',
    patreonBad: true,
  },
  {
    aspect: 'Access Verification',
    patreon: 'Server checks subscriber database (server knows your identity)',
    veilsub: 'Privacy proof from your local subscription pass — leaves no trace',
    patreonBad: true,
  },
  {
    aspect: 'Data Breach Impact',
    patreon: 'Full subscriber PII exposed (Patreon 2015 breach: 2.3M accounts)',
    veilsub: 'Nothing to breach — no subscriber PII exists anywhere',
    patreonBad: true,
  },
  {
    aspect: 'Identity Linking',
    patreon: 'Trivial — email, name, IP, payment method all connected',
    veilsub: 'Mathematically impossible — one-way hashing means identities cannot be reversed',
    patreonBad: true,
  },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function PrivacyDashboardPage() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [liveData, setLiveData] = useState<{ key: string; value: string } | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState(false)

  const toggleRow = useCallback((id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id))
  }, [])

  // Fetch a real on-chain mapping entry for the live demo
  useEffect(() => {
    let cancelled = false
    setLiveLoading(true)
    setLiveError(false)

    // Use the first known creator hash to query tier_prices
    const knownAddress = Object.keys(CREATOR_HASH_MAP)[0]
    const knownHash = knownAddress ? CREATOR_HASH_MAP[knownAddress] : null

    if (!knownHash) {
      setLiveLoading(false)
      return
    }

    fetch(`/api/aleo/program/${DEPLOYED_PROGRAM_ID}/mapping/tier_prices/${knownHash}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.text()
      })
      .then((val) => {
        if (!cancelled) {
          setLiveData({ key: knownHash, value: val.replace(/"/g, '') })
          setLiveLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Fallback to showing the hash itself as demo
          setLiveData({
            key: knownHash,
            value: '(query returned null — creator may not have tier 1 set)',
          })
          setLiveLoading(false)
          setLiveError(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

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
            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
              style={LETTER_SPACING_STYLE}
            >
              Your Privacy
            </h1>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Every VeilSub operation is designed with privacy as a compile-time guarantee, not a
              runtime policy. See exactly what the blockchain stores for each action — and what it
              can never know.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                31 private actions
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400">
                <span className="w-2 h-2 rounded-full bg-violet-400" />
                30 hash-indexed mappings
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                0 wallet addresses stored publicly
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* ── Interactive Transaction Privacy Table ───────────────────────── */}
      <section className="py-12 sm:py-20">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                What Does the Chain See?
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                Click any operation to see the full privacy breakdown. Green means fully private,
                yellow means partially hashed, red means public.
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-3">
            {PRIVACY_TABLE.map((row, i) => {
              const isExpanded = expandedRow === row.id
              const Icon = row.icon
              const privacyColor =
                row.privacyLevel === 'full'
                  ? 'emerald'
                  : row.privacyLevel === 'partial'
                    ? 'amber'
                    : 'red'

              return (
                <ScrollReveal key={row.id} delay={i * 0.05}>
                  <div
                    className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isExpanded
                        ? 'bg-surface-1/80 border-violet-500/20'
                        : 'bg-surface-1/40 border-border hover:border-border-hover hover:bg-surface-1/60'
                    }`}
                  >
                    {/* Row header */}
                    <button
                      onClick={() => toggleRow(row.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`detail-${row.id}`}
                      className="w-full flex items-center gap-4 p-4 sm:p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-inset rounded-2xl"
                    >
                      <div
                        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-${privacyColor}-500/10 border border-${privacyColor}-500/20`}
                      >
                        <Icon className={`w-5 h-5 text-${privacyColor}-400`} aria-hidden="true" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-white text-sm sm:text-base">
                            {row.operation}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-${privacyColor}-500/10 text-${privacyColor}-400 border border-${privacyColor}-500/20`}
                          >
                            {row.privacyLevel === 'full' ? (
                              <EyeOff className="w-3 h-3" aria-hidden="true" />
                            ) : (
                              <Eye className="w-3 h-3" aria-hidden="true" />
                            )}
                            {row.privacyLevel === 'full' ? 'Fully Private' : 'Hashed Only'}
                          </span>
                          {row.finalize === 'none' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                              No Trace
                            </span>
                          )}
                        </div>
                      </div>

                      <m.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={spring.snappy}
                        className="shrink-0"
                      >
                        <ChevronDown className="w-5 h-5 text-white/40" aria-hidden="true" />
                      </m.div>
                    </button>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <m.div
                          id={`detail-${row.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={spring.heavy}
                          className="overflow-hidden"
                        >
                          <div className="px-4 sm:px-5 pb-5 pt-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              {/* What YOU see */}
                              <div className="p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10">
                                <div className="flex items-center gap-2 mb-3">
                                  <Eye className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                                  <span className="text-sm font-semibold text-emerald-400">
                                    What YOU See
                                  </span>
                                </div>
                                <ul className="space-y-1.5">
                                  {row.youSee.map((item) => (
                                    <li
                                      key={item}
                                      className="flex items-start gap-2 text-sm text-white/80"
                                    >
                                      <CheckCircle2
                                        className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"
                                        aria-hidden="true"
                                      />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* What CHAIN sees */}
                              <div className="p-4 rounded-xl bg-red-500/[0.04] border border-red-500/10">
                                <div className="flex items-center gap-2 mb-3">
                                  <Database className="w-4 h-4 text-red-400" aria-hidden="true" />
                                  <span className="text-sm font-semibold text-red-400">
                                    What the CHAIN Sees
                                  </span>
                                </div>
                                <ul className="space-y-1.5">
                                  {row.chainSees.map((item) => (
                                    <li
                                      key={item}
                                      className="flex items-start gap-2 text-sm text-white/80"
                                    >
                                      {item.includes('NOTHING') ? (
                                        <XCircle
                                          className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <Hash
                                          className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0"
                                          aria-hidden="true"
                                        />
                                      )}
                                      <span className={item.includes('NOTHING') ? 'text-emerald-400 font-medium' : ''}>
                                        {item}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Technical explanation */}
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-border/50">
                              <p className="text-sm text-white/70 leading-relaxed">{row.detail}</p>
                            </div>
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </Container>
      </section>

      {/* ── BSP Data Flow Diagram ──────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Data Flow: Where Privacy Happens
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                Every transaction follows the same path. Your wallet address enters the private
                layer and exits as a one-way hash (Poseidon2) — or not at all.
              </p>
            </div>
          </ScrollReveal>

          {/* Flow diagram */}
          <ScrollReveal>
            <div className="max-w-3xl mx-auto mb-16">
              <div className="relative">
                {/* Flow steps */}
                {[
                  {
                    step: 1,
                    label: 'Your Wallet',
                    sublabel: 'aleo1... address (private)',
                    color: 'emerald',
                    icon: User,
                  },
                  {
                    step: 2,
                    label: 'Transition Layer',
                    sublabel: 'Private execution — privacy proof generated',
                    color: 'violet',
                    icon: Lock,
                  },
                  {
                    step: 3,
                    label: 'One-Way Hashing',
                    sublabel: 'address → field hash (one-way)',
                    color: 'blue',
                    icon: Hash,
                  },
                  {
                    step: 4,
                    label: 'Finalize Layer',
                    sublabel: 'Hashed identifiers only — no wallet addresses',
                    color: 'amber',
                    icon: Database,
                  },
                  {
                    step: 5,
                    label: 'Public Mappings',
                    sublabel: '25 hash-indexed records — aggregate data only',
                    color: 'red',
                    icon: Activity,
                  },
                ].map((s, i, arr) => {
                  const Icon = s.icon
                  return (
                    <div key={s.step}>
                      <div className="flex items-center gap-4 py-3">
                        <div
                          className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-${s.color}-500/10 border border-${s.color}-500/20`}
                        >
                          <Icon className={`w-5 h-5 text-${s.color}-400`} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold uppercase tracking-wider text-${s.color}-400`}
                            >
                              Step {s.step}
                            </span>
                          </div>
                          <p className="text-white font-semibold text-sm">{s.label}</p>
                          <p className="text-white/50 text-xs">{s.sublabel}</p>
                        </div>
                        {/* Privacy indicator */}
                        {i < 3 ? (
                          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <EyeOff className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                            <span className="text-[10px] font-semibold text-emerald-400 uppercase">
                              Private
                            </span>
                          </div>
                        ) : (
                          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                            <Hash className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                            <span className="text-[10px] font-semibold text-amber-400 uppercase">
                              Hashed
                            </span>
                          </div>
                        )}
                      </div>
                      {i < arr.length - 1 && (
                        <div className="flex items-center pl-6 py-1">
                          <div className="w-px h-6 bg-border/50" />
                          <ArrowRight
                            className="w-3 h-3 text-white/20 ml-1 rotate-90"
                            aria-hidden="true"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Key insight callout */}
              <div className="mt-8 p-5 rounded-2xl bg-violet-500/[0.06] border border-violet-500/15">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-violet-300 mb-1">
                      Your wallet address is NEVER stored publicly
                    </p>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Your wallet address is only used during private processing on your device.
                      All 25 public records receive pre-computed one-way hashes (Poseidon2). Even if every
                      record were publicly dumped, no wallet address could be recovered —
                      reversing the hash is computationally impossible (Poseidon2 over BLS12-377).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* BSP 3-layer stack */}
          <ScrollReveal>
            <div className="text-center mb-8">
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                The 3 Layers of BSP
              </h3>
              <p className="text-white/50 text-sm">Blind Subscription Protocol — defense in depth</p>
            </div>
          </ScrollReveal>

          <div className="max-w-3xl mx-auto space-y-3">
            {BSP_LAYERS.map((layer, i) => (
              <ScrollReveal key={layer.layer} delay={i * 0.1}>
                <GlassCard
                  className={`!p-5 border-${layer.color}-500/10 hover:border-${layer.color}-500/20`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-${layer.color}-500/10 border border-${layer.color}-500/20`}
                    >
                      <span className={`text-sm font-bold text-${layer.color}-400`}>
                        L{layer.layer}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-white mb-1`}>{layer.name}</h4>
                      <p className="text-sm text-white/60 mb-3 leading-relaxed">
                        {layer.description}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <code className="px-2 py-1 rounded bg-white/[0.04] text-xs text-white/50 font-mono">
                          {layer.tech}
                        </code>
                        <div className="flex items-center gap-1.5">
                          {layer.operations.map((op) => (
                            <span
                              key={op}
                              className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] text-white/50"
                            >
                              {op}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Live On-Chain Demo ──────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Live On-Chain Evidence
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                This is real data from the deployed {DEPLOYED_PROGRAM_ID} contract. See for yourself —
                only hashes and numbers, never addresses.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="max-w-2xl mx-auto">
              <GlassCard variant="heavy" className="!p-0 overflow-hidden">
                <div className="p-5 border-b border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-violet-400" aria-hidden="true" />
                    <span className="text-sm font-semibold text-white">
                      Mapping Query: tier_prices
                    </span>
                  </div>
                  <p className="text-xs text-white/50">
                    {DEPLOYED_PROGRAM_ID} / tier_prices / [creator_hash]
                  </p>
                </div>

                <div className="p-5 space-y-4">
                  {liveLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2">
                      <Loader2 className="w-4 h-4 text-violet-400 animate-spin" aria-hidden="true" />
                      <span className="text-sm text-white/50">Querying on-chain mapping...</span>
                    </div>
                  ) : liveData ? (
                    <>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1 block">
                          Mapping Key (creator hash)
                        </label>
                        <div className="p-3 rounded-lg bg-black/40 border border-border/50 font-mono text-xs text-amber-400 break-all">
                          {liveData.key}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1 block">
                          Mapping Value
                        </label>
                        <div className="p-3 rounded-lg bg-black/40 border border-border/50 font-mono text-xs text-emerald-400 break-all">
                          {liveData.value}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-violet-500/[0.05] border border-violet-500/10">
                        <p className="text-sm text-white/70 leading-relaxed">
                          <strong className="text-violet-300">What you see above:</strong> A long number
                          (the creator&apos;s hashed identifier) mapped to a price value. But <em>whose</em>{' '}
                          identifier is this? Nobody can tell — reversing the one-way hash (Poseidon2) is
                          mathematically impossible. It would require more energy than the sun will
                          produce in its lifetime.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-white/40">
                        Could not fetch on-chain data. The contract is deployed at{' '}
                        <code className="text-violet-300">{DEPLOYED_PROGRAM_ID}</code>.
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-5 pb-5">
                  <a
                    href={`https://testnet.aleoscan.io/program?id=${DEPLOYED_PROGRAM_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    Verify on Aleoscan — audit the mappings yourself
                  </a>
                </div>
              </GlassCard>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── Patreon Comparison ──────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                VeilSub vs Traditional Platforms
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                Patreon, OnlyFans, and Substack store every detail about every subscriber. VeilSub
                stores nothing.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="max-w-3xl mx-auto overflow-x-auto sm:overflow-visible">
              <div className="min-w-[520px] sm:min-w-0">
                {/* Table header */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="p-3 rounded-xl text-sm font-semibold text-white/40 uppercase tracking-wider">
                    Aspect
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/[0.04] border border-red-500/10 text-sm font-semibold text-red-400 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" aria-hidden="true" />
                      Patreon / Web2
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 text-sm font-semibold text-emerald-400 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" aria-hidden="true" />
                      VeilSub / BSP
                    </div>
                  </div>
                </div>

                {/* Table rows */}
                {COMPARISON_ROWS.map((row, i) => (
                  <ScrollReveal key={row.aspect} delay={i * 0.05}>
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <div className="p-3 rounded-xl text-sm font-medium text-white/80 flex items-center">
                        {row.aspect}
                      </div>
                      <div className="p-3 rounded-xl bg-red-500/[0.03] border border-red-500/[0.06] text-xs text-white/60 leading-relaxed">
                        <div className="flex items-start gap-2">
                          <XCircle
                            className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{row.patreon}</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/[0.06] text-xs text-white/60 leading-relaxed">
                        <div className="flex items-start gap-2">
                          <CheckCircle2
                            className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{row.veilsub}</span>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── Privacy Roadmap — Honest Limitations ─────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Privacy Roadmap
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                We believe in radical transparency about privacy limitations. Here is what we are
                actively improving and what already works.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Subscriber Counts */}
              <div className="p-5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/15">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
                    <Users className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white">Subscriber Counts</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        In Progress
                      </span>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">
                      The current contract (v29) stores both raw subscriber counts and Pedersen commitments
                      side-by-side. The raw count exists for backward compatibility. The frontend already shows
                      privacy-preserving threshold badges (e.g. &quot;50+ subscribers&quot;) instead of exact numbers.
                      In v30, the raw <code className="text-xs px-1 py-0.5 rounded bg-white/[0.06] font-mono">subscriber_count</code> and{' '}
                      <code className="text-xs px-1 py-0.5 rounded bg-white/[0.06] font-mono">total_revenue</code> mappings
                      will be removed entirely, with all displays using threshold proofs from the Pedersen commitments.
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Encryption */}
              <div className="p-5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/15">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                    <Lock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white">Content Encryption</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Shipped
                      </span>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">
                      New posts use end-to-end encryption (AES-256-GCM with tier-derived keys). The server
                      stores only ciphertext and cannot read post content. Posts published before E2E encryption
                      was enabled use server-side encryption and can theoretically be read by the server operator.
                    </p>
                  </div>
                </div>
              </div>

              {/* Browsing Privacy */}
              <div className="p-5 rounded-2xl bg-blue-500/[0.04] border border-blue-500/15">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                    <Eye className="w-4 h-4 text-blue-400" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white">Browsing Privacy</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Improved
                      </span>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Creator profiles are cached client-side after the initial explore page load. Individual
                      creator page visits do not generate additional server queries when the cache is warm.
                      The API proxy hides your IP from the Aleo network. However, the initial explore page fetch
                      reveals that you are browsing VeilSub (though not which specific creator interests you).
                    </p>
                  </div>
                </div>
              </div>

              {/* Pedersen Commitments */}
              <div className="p-5 rounded-2xl bg-violet-500/[0.04] border border-violet-500/15">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
                    <Layers className="w-4 h-4 text-violet-400" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white">Homomorphic Commitments</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Shipped
                      </span>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Every subscription and payment creates an additively homomorphic Pedersen commitment
                      (<code className="text-xs px-1 py-0.5 rounded bg-white/[0.06] font-mono">value * G + blinding * H</code>).
                      Creators can prove their subscriber count exceeds a threshold without revealing the exact number.
                      Verifiers can independently check that commitments are consistent with the aggregate. This is
                      the same cryptographic technique used by leading privacy protocols.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Ready to Subscribe Privately?
              </h2>
              <p className="text-white/60 mb-8">
                Every operation above is live on Aleo testnet. Connect a wallet and experience
                private subscriptions.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/explore">
                  <Button variant="accent" size="lg" className="rounded-full shadow-accent-lg">
                    Explore Creators
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/privacy">
                  <Button variant="secondary" size="lg" className="rounded-full">
                    Deep Technical Docs
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>
    </PageTransition>
  )
}
