'use client'

import { useState, useCallback, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { spring, modalVariants, modalTransition, backdropVariants } from '@/lib/motion'
import {
  Vote,
  Shield,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  Hash,
  Eye,
  EyeOff,
  ArrowRight,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  Users,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import ScrollReveal from '@/components/ScrollReveal'
import Badge from '@/components/ui/Badge'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'

// ─── Static styles ──────────────────────────────────────────────────────────
import { HERO_GLOW_STYLE, TITLE_STYLE as LETTER_SPACING_STYLE } from '@/lib/styles'

// ─── Types ──────────────────────────────────────────────────────────────────

type ProposalStatus = 'active' | 'resolved' | 'cancelled'

interface Proposal {
  id: number
  title: string
  description: string
  status: ProposalStatus
  votesFor: number
  votesAgainst: number
  blocksRemaining: number
  totalBlocks: number
  creator: string
}

// ─── Demo proposals (static until governance contract is deployed) ───────────

const DEMO_PROPOSALS: Proposal[] = [
  {
    id: 1,
    title: 'Enable USDCx Stablecoin Subscriptions',
    description:
      'Activate stablecoin payments so creators can accept USDCx alongside native ALEO credits. This adds new subscription and tipping options.',
    status: 'active',
    votesFor: 47,
    votesAgainst: 12,
    blocksRemaining: 28800,
    totalBlocks: 86400,
    creator: 'aleo1hp9...epyx',
  },
  {
    id: 2,
    title: 'Reduce Platform Fee from 5% to 3%',
    description:
      'Lower the platform fee from 5% to 3% to attract more creators during the testnet growth phase.',
    status: 'active',
    votesFor: 31,
    votesAgainst: 28,
    blocksRemaining: 57600,
    totalBlocks: 86400,
    creator: 'aleo1yr9...mhef',
  },
  {
    id: 3,
    title: 'Add Content Encryption Key Rotation',
    description:
      'Require creators to rotate their encryption keys every 90 days. Improves long-term security for encrypted content.',
    status: 'active',
    votesFor: 19,
    votesAgainst: 5,
    blocksRemaining: 72000,
    totalBlocks: 86400,
    creator: 'aleo1k7a...nxzm',
  },
  {
    id: 4,
    title: 'Increase MAX_CONTENT from 1000 to 5000',
    description:
      'Raise the per-creator content publishing limit to support high-volume creators.',
    status: 'resolved',
    votesFor: 62,
    votesAgainst: 8,
    blocksRemaining: 0,
    totalBlocks: 86400,
    creator: 'aleo1hp9...epyx',
  },
  {
    id: 5,
    title: 'Add Quadratic Voting Weight',
    description:
      'Replace 1-token-1-vote with quadratic weighting to reduce plutocratic influence on governance outcomes.',
    status: 'resolved',
    votesFor: 44,
    votesAgainst: 41,
    blocksRemaining: 0,
    totalBlocks: 86400,
    creator: 'aleo1yr9...mhef',
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function blocksToTime(blocks: number): string {
  const seconds = blocks * 3
  const hours = Math.floor(seconds / 3600)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h`
  return `${Math.floor(seconds / 60)}m`
}

function statusColor(status: ProposalStatus): string {
  switch (status) {
    case 'active':
      return 'emerald'
    case 'resolved':
      return 'violet'
    case 'cancelled':
      return 'red'
  }
}

function generateSalt(): string {
  const arr = new Uint32Array(4)
  crypto.getRandomValues(arr)
  return Array.from(arr, (v) => v.toString(16).padStart(8, '0')).join('')
}

// ─── How It Works Steps ─────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Commit',
    description:
      'Seal your vote with a secret code. Nobody can see how you voted.',
    icon: Lock,
    color: 'violet',
  },
  {
    step: 2,
    title: 'Vote',
    description:
      'During the voting window, all sealed votes are counted privately. The blockchain stores only encrypted values.',
    icon: Shield,
    color: 'blue',
  },
  {
    step: 3,
    title: 'Resolve',
    description:
      'After the window closes, results are published. Individual votes remain permanently hidden.',
    icon: Eye,
    color: 'emerald',
  },
]

// ─── Proposal Card ──────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  onVote,
}: {
  proposal: Proposal
  onVote: (id: number) => void
}) {
  const color = statusColor(proposal.status)
  const totalVotes = proposal.votesFor + proposal.votesAgainst
  const forPct = totalVotes > 0 ? Math.round((proposal.votesFor / totalVotes) * 100) : 0
  const progressPct =
    proposal.totalBlocks > 0
      ? Math.round(((proposal.totalBlocks - proposal.blocksRemaining) / proposal.totalBlocks) * 100)
      : 100

  return (
    <div className="rounded-2xl bg-surface-1/40 backdrop-blur-sm border border-white/15 hover:border-violet-500/25 transition-all duration-300 overflow-hidden">
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono text-white/50">#{proposal.id}</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}
              >
                {proposal.status === 'active' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {proposal.status}
              </span>
            </div>
            <h3 className="text-white font-semibold text-sm sm:text-base leading-snug">
              {proposal.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-white/80 leading-relaxed mb-4 line-clamp-2">
          {proposal.description}
        </p>

        {/* Vote bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-emerald-400 font-medium">For: {proposal.votesFor}</span>
            <span className="text-red-400 font-medium">Against: {proposal.votesAgainst}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.1] overflow-hidden flex">
            <div
              className="h-full bg-emerald-400 rounded-l-full transition-all duration-500"
              style={{ width: `${forPct}%` }}
            />
            <div
              className="h-full bg-red-400 rounded-r-full transition-all duration-500"
              style={{ width: `${100 - forPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-xs text-white/50">
            <span>{forPct}% approval</span>
            <span>{totalVotes} total votes</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-white/60">
            {proposal.status === 'active' ? (
              <>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>{blocksToTime(proposal.blocksRemaining)} remaining</span>
                </div>
                {/* Progress bar */}
                <div className="w-16 h-1 rounded-full bg-white/[0.1] overflow-hidden">
                  <div
                    className="h-full bg-violet-400 rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-violet-400" aria-hidden="true" />
                Resolved
              </span>
            )}
            <span className="text-white/50 font-mono">{proposal.creator}</span>
          </div>
          {proposal.status === 'active' && (
            <button
              onClick={() => onVote(proposal.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-500 text-xs font-medium text-white hover:bg-violet-400 transition-all duration-200"
            >
              <Vote className="w-3 h-3" aria-hidden="true" />
              Cast Vote
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Vote Modal ─────────────────────────────────────────────────────────────

function VoteModal({
  proposalId,
  proposals,
  onClose,
}: {
  proposalId: number | null
  proposals: Proposal[]
  onClose: () => void
}) {
  const [selectedProposal, setSelectedProposal] = useState<number>(proposalId ?? 0)
  const [voteChoice, setVoteChoice] = useState<'for' | 'against'>('for')
  const [salt, setSalt] = useState(() => generateSalt())
  const [saltCopied, setSaltCopied] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (proposalId !== null) setSelectedProposal(proposalId)
  }, [proposalId])

  const handleCopySalt = useCallback(() => {
    navigator.clipboard.writeText(salt)
    setSaltCopied(true)
    setTimeout(() => setSaltCopied(false), 2000)
  }, [salt])

  const handleRegenerateSalt = useCallback(() => {
    setSalt(generateSalt())
  }, [])

  const handleSubmit = useCallback(() => {
    // Save salt to localStorage for future proof
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`veilsub_vote_salt_${selectedProposal}`, salt)
      } catch { /* localStorage full or unavailable */ }
    }
    setSubmitted(true)
  }, [selectedProposal, salt])

  const activeProposals = proposals.filter((p) => p.status === 'active')
  const selected = proposals.find((p) => p.id === selectedProposal)

  if (proposalId === null) return null

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <m.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={modalTransition}
          className="w-full max-w-lg rounded-2xl bg-surface-1 border border-border/75 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {submitted ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Vote Sealed</h3>
              <p className="text-sm text-white/60 mb-6">
                Your vote has been sealed privately. Your secret code has been saved
                for future verification.
              </p>
              <div className="p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/15 mb-6">
                <p className="text-xs text-violet-300/80 font-mono break-all">
                  Sealed vote: {voteChoice}, code: {salt.slice(0, 16)}...
                </p>
              </div>
              <Button variant="secondary" onClick={onClose} className="rounded-full">
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Vote className="w-4 h-4 text-violet-400" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-white">Cast Private Vote</h3>
                </div>
                <p className="text-xs text-white/50">
                  Your vote is committed as a hash. Nobody can see how you voted.
                </p>
              </div>

              <div className="p-5 space-y-5">
                {/* Proposal selector */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 block">
                    Proposal
                  </label>
                  <select
                    value={selectedProposal}
                    onChange={(e) => setSelectedProposal(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white focus:outline-none focus:border-violet-500/30 transition-colors"
                  >
                    {activeProposals.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id}: {p.title}
                      </option>
                    ))}
                  </select>
                  {selected && (
                    <p className="text-xs text-white/40 mt-1.5 line-clamp-1">
                      {selected.description}
                    </p>
                  )}
                </div>

                {/* Vote choice */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 block">
                    Your Vote
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setVoteChoice('for')}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        voteChoice === 'for'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/[0.02] border-border/50 text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 mx-auto mb-1" aria-hidden="true" />
                      For
                    </button>
                    <button
                      onClick={() => setVoteChoice('against')}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        voteChoice === 'against'
                          ? 'bg-red-500/15 border-red-500/30 text-red-300'
                          : 'bg-white/[0.02] border-border/50 text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
                      }`}
                    >
                      <XCircle className="w-4 h-4 mx-auto mb-1" aria-hidden="true" />
                      Against
                    </button>
                  </div>
                </div>

                {/* Salt */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 block">
                    Salt (auto-generated)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 font-mono text-xs text-amber-400 truncate">
                      {salt}
                    </div>
                    <button
                      onClick={handleCopySalt}
                      className="shrink-0 p-2.5 rounded-xl bg-white/[0.04] border border-border/50 text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                      title="Copy salt"
                    >
                      {saltCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      onClick={handleRegenerateSalt}
                      className="shrink-0 p-2.5 rounded-xl bg-white/[0.04] border border-border/50 text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                      title="Regenerate salt"
                    >
                      <Hash className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="text-xs text-white/50 mt-1.5">
                    Save this salt -- you will need it to verify your vote later.
                  </p>
                </div>

                {/* Privacy notice */}
                <div className="p-3 rounded-xl bg-violet-500/[0.05] border border-violet-500/15">
                  <div className="flex items-start gap-2">
                    <EyeOff className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-xs text-violet-300/80 leading-relaxed">
                      Your vote is sealed privately. Nobody can see how you voted --
                      not even the proposal creator.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-border/50 flex items-center justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="accent" size="sm" disabled className="rounded-full opacity-60 cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  Voting Coming Soon
                </Button>
              </div>
            </>
          )}
        </m.div>
      </m.div>
    </AnimatePresence>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function GovernancePage() {
  const [voteModalProposal, setVoteModalProposal] = useState<number | null>(null)
  const [showPast, setShowPast] = useState(false)

  const activeProposals = DEMO_PROPOSALS.filter((p) => p.status === 'active')
  const pastProposals = DEMO_PROPOSALS.filter((p) => p.status !== 'active')

  return (
    <PageTransition className="min-h-screen">
      {/* ── BETA Banner ──────────────────────────────────────────────────── */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-center">
        <p className="text-sm text-amber-300 font-medium">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mr-2">Beta</span>
          This feature is in beta. Votes are for demonstration and don&apos;t persist on-chain yet.
        </p>
      </div>

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
                <Vote className="w-4 h-4" aria-hidden="true" />
                Private Governance
              </Badge>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
              style={LETTER_SPACING_STYLE}
            >
              Private Governance
            </h1>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Vote on VeilSub&apos;s future. Your vote is hidden. Only results are public.
              Sealed votes ensure nobody -- not even the blockchain -- can see how you voted.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {activeProposals.length} active proposal{activeProposals.length !== 1 ? 's' : ''}
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400">
                <Lock className="w-3 h-3" aria-hidden="true" />
                Sealed voting
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <EyeOff className="w-3 h-3" aria-hidden="true" />
                Anonymous voting
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* ── Active Proposals ─────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20">
        <Container>
          <ScrollReveal>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-white mb-2"
                  style={LETTER_SPACING_STYLE}
                >
                  Active Proposals
                </h2>
                <p className="text-white/80 text-sm">
                  Cast your vote privately. All votes are sealed and anonymous.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/15">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-xs text-emerald-400 font-medium">
                  {activeProposals.length} active
                </span>
              </div>
            </div>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeProposals.map((proposal, i) => (
              <ScrollReveal key={proposal.id} delay={i * 0.06}>
                <ProposalCard
                  proposal={proposal}
                  onVote={(id) => setVoteModalProposal(id)}
                />
              </ScrollReveal>
            ))}
          </div>

          {/* Coming soon notice */}
          <ScrollReveal delay={0.2}>
            <div className="mt-6 p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/10">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-amber-300 mb-0.5">
                    Governance contract deploying soon
                  </p>
                  <p className="text-xs text-white/80 leading-relaxed">
                    The proposals above are demonstrating the UI for the upcoming{' '}
                    <code className="px-1 py-0.5 rounded bg-white/[0.06] text-amber-300 text-xs font-mono">
                      veilsub_governance.aleo
                    </code>{' '}
                    program. Once deployed, votes will be sealed on-chain and results will be
                    calculated automatically.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── Past Proposals ───────────────────────────────────────────────── */}
      {pastProposals.length > 0 && (
        <section className="pb-12 sm:pb-20">
          <Container>
            <ScrollReveal>
              <button
                onClick={() => setShowPast(!showPast)}
                className="flex items-center gap-2 mb-6 text-white/60 hover:text-white/80 transition-colors"
              >
                <m.div
                  animate={{ rotate: showPast ? 180 : 0 }}
                  transition={spring.snappy}
                >
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                </m.div>
                <span className="text-sm font-medium">
                  Past Proposals ({pastProposals.length})
                </span>
              </button>
            </ScrollReveal>

            <AnimatePresence>
              {showPast && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={spring.heavy}
                  className="overflow-hidden"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    {pastProposals.map((proposal, i) => (
                      <ScrollReveal key={proposal.id} delay={i * 0.06}>
                        <ProposalCard
                          proposal={proposal}
                          onVote={(id) => setVoteModalProposal(id)}
                        />
                      </ScrollReveal>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </Container>
        </section>
      )}

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                How Private Voting Works
              </h2>
              <p className="text-white/80 max-w-xl mx-auto">
                A three-phase process ensures your vote is private until the results are
                published.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-3xl mx-auto grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon
              return (
                <ScrollReveal key={step.step} delay={i * 0.1}>
                  <GlassCard className="!p-6 text-center">
                    <div
                      className={`w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-${step.color}-500/10 border border-${step.color}-500/20`}
                    >
                      <Icon className={`w-5 h-5 text-${step.color}-400`} aria-hidden="true" />
                    </div>
                    <div
                      className={`text-xs font-bold uppercase tracking-wider text-${step.color}-400 mb-1`}
                    >
                      Step {step.step}
                    </div>
                    <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                    <p className="text-xs text-white/80 leading-relaxed">{step.description}</p>
                  </GlassCard>
                </ScrollReveal>
              )
            })}
          </div>

          {/* Technical detail callout */}
          <ScrollReveal delay={0.3}>
            <div className="max-w-3xl mx-auto mt-8 p-5 rounded-2xl bg-violet-500/[0.06] border border-violet-500/15">
              <div className="flex items-start gap-3">
                <Hash className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-violet-300 mb-1">
                    How sealed voting works
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Each vote is sealed using your choice plus a random secret code.
                    The secret code is stored only in your browser. Even with full
                    access to the blockchain, an observer cannot determine your vote without
                    your secret code -- reversing the seal is mathematically impossible.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── Governance Stats ─────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Protocol Governance
              </h2>
              <p className="text-white/80 max-w-xl mx-auto">
                VeilSub&apos;s governance program brings the same privacy guarantees from subscriptions
                to collective decision-making.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Vote, value: String(DEMO_PROPOSALS.length), label: 'Total Proposals' },
              {
                icon: Users,
                value: String(
                  DEMO_PROPOSALS.reduce((s, p) => s + p.votesFor + p.votesAgainst, 0)
                ),
                label: 'Total Votes Cast',
              },
              { icon: Shield, value: '0', label: 'Voter Identities Exposed' },
              { icon: Layers, value: '3', label: 'Privacy Layers Active' },
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <ScrollReveal key={stat.label} delay={i * 0.05}>
                  <GlassCard className="text-center !p-5">
                    <Icon className="w-5 h-5 text-white/60 mx-auto mb-3" aria-hidden="true" />
                    <p className="text-2xl font-semibold text-white mb-1">{stat.value}</p>
                    <p className="text-xs text-white/80">{stat.label}</p>
                  </GlassCard>
                </ScrollReveal>
              )
            })}
          </div>
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
                Your Voice, Your Secret
              </h2>
              <p className="text-white/80 mb-8">
                Private governance is the foundation of a fair protocol. Explore the rest of the
                VeilSub ecosystem.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/marketplace">
                  <Button variant="accent" size="lg" className="rounded-full shadow-accent-lg">
                    Creator Marketplace
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/developers">
                  <Button variant="secondary" size="lg" className="rounded-full">
                    Build on VeilSub
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── Vote Modal ───────────────────────────────────────────────────── */}
      <VoteModal
        proposalId={voteModalProposal}
        proposals={DEMO_PROPOSALS}
        onClose={() => setVoteModalProposal(null)}
      />
    </PageTransition>
  )
}
