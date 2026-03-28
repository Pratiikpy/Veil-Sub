'use client'

import { useState, useCallback, useMemo } from 'react'
import { m } from 'framer-motion'
import { spring } from '@/lib/motion'
import {
  Vote,
  Shield,
  Lock,
  Hash,
  Eye,
  EyeOff,
  ArrowRight,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Copy,
  AlertTriangle,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  Ban,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import ScrollReveal from '@/components/ScrollReveal'
import Badge from '@/components/ui/Badge'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import { useContractExecute } from '@/hooks/useContractExecute'
import { useGovernance, getStatusLabel, getBallotSalt } from '@/hooks/useGovernance'
import type { Proposal } from '@/hooks/useGovernance'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { GOVERNANCE_PROGRAM_ID, FEES } from '@/lib/config'
import type { TxStatus } from '@/types'

// ─── Static styles ──────────────────────────────────────────────────────────
import { HERO_GLOW_STYLE, TITLE_STYLE as LETTER_SPACING_STYLE } from '@/lib/styles'

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  1: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  2: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
}

const STATUS_ICONS: Record<number, typeof CheckCircle2> = {
  0: Vote,
  1: CheckCircle2,
  2: Ban,
}

// How It Works Steps
const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Commit',
    description:
      'Seal your vote with a random salt. The Pedersen commitment hides your vote direction — nobody can see how you voted.',
    icon: Lock,
    color: 'violet',
  },
  {
    step: 2,
    title: 'Vote',
    description:
      'During the voting window, sealed votes are tallied via homomorphic encryption. The blockchain stores only Pedersen group elements.',
    icon: Shield,
    color: 'blue',
  },
  {
    step: 3,
    title: 'Resolve',
    description:
      'Anyone can resolve: claimed counts are verified against aggregate commitments. Individual votes remain permanently hidden.',
    icon: Eye,
    color: 'emerald',
  },
]

// ─── Utility: Generate random field-compatible salt ─────────────────────────

function generateSalt(): string {
  // Generate a random 128-bit number, then format as an Aleo field literal.
  // Aleo fields are ~253 bits, so 128 bits is safe and avoids overflow.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let num = BigInt(0)
  for (let i = 0; i < bytes.length; i++) {
    num = (num << BigInt(8)) | BigInt(bytes[i])
  }
  return `${num.toString()}field`
}

// ─── Utility: Generate deterministic proposal ID from title ─────────────────

function generateProposalId(title: string): string {
  // Simple hash: sum of char codes with mixing. Not cryptographic, just unique enough.
  // The contract uses this as a field key — must be a valid field literal.
  const bytes = new TextEncoder().encode(title + Date.now().toString())
  let hash = BigInt(0)
  for (let i = 0; i < bytes.length; i++) {
    hash = (hash * BigInt(31) + BigInt(bytes[i])) % BigInt('340282366920938463463374607431768211455') // 2^128 - 1
  }
  // Ensure non-zero
  if (hash === BigInt(0)) hash = BigInt(1)
  return `${hash.toString()}field`
}

// ─── Utility: Compute description hash (simple numeric hash for on-chain) ──

function computeDescriptionHash(description: string): string {
  const bytes = new TextEncoder().encode(description)
  let hash = BigInt(7)
  for (let i = 0; i < bytes.length; i++) {
    hash = (hash * BigInt(37) + BigInt(bytes[i])) % BigInt('340282366920938463463374607431768211455')
  }
  return `${hash.toString()}field`
}

// ─── Utility: Truncate long field/group strings for display ─────────────────

function truncateField(value: string, chars = 8): string {
  if (!value || value === '0group' || value === '0field') return value
  const clean = value.replace(/field$|group$/, '')
  if (clean.length <= chars * 2) return value
  const suffix = value.endsWith('field') ? 'field' : value.endsWith('group') ? 'group' : ''
  return `${clean.slice(0, chars)}...${clean.slice(-chars)}${suffix}`
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('Copied to clipboard')
  }).catch(() => {
    toast.error('Failed to copy')
  })
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function ProposalSkeleton() {
  return (
    <div className="rounded-2xl glass p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-32 bg-white/10 rounded" />
        <div className="h-5 w-16 bg-white/10 rounded-full" />
      </div>
      <div className="h-4 w-48 bg-white/[0.06] rounded mb-3" />
      <div className="h-4 w-64 bg-white/[0.06] rounded mb-4" />
      <div className="flex gap-3">
        <div className="h-9 w-20 bg-white/[0.06] rounded-lg" />
        <div className="h-9 w-20 bg-white/[0.06] rounded-lg" />
      </div>
    </div>
  )
}

// ─── Create Proposal Form ───────────────────────────────────────────────────

interface CreateProposalFormProps {
  onCreated: () => void
}

function CreateProposalForm({ onCreated }: CreateProposalFormProps) {
  const { execute, address, connected } = useContractExecute()
  const { registerProposal } = useGovernance()
  const { startPolling, stopPolling } = useTransactionPoller()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const proposalId = useMemo(() => title ? generateProposalId(title) : '', [title])
  const descHash = useMemo(() => description ? computeDescriptionHash(description) : '', [description])

  const handleSubmit = useCallback(async () => {
    if (!connected || !address) {
      toast.error('Connect your wallet first')
      return
    }
    if (!title.trim()) {
      toast.error('Enter a proposal title')
      return
    }

    setTxStatus('signing')
    setError(null)

    try {
      const pid = generateProposalId(title)
      const dHash = description ? computeDescriptionHash(description) : '1field'

      const result = await execute(
        'create_proposal',
        [pid, dHash],
        FEES.GOV_CREATE_PROPOSAL,
        GOVERNANCE_PROGRAM_ID
      )

      if (!result) {
        setTxStatus('failed')
        setError('Transaction rejected by wallet')
        return
      }

      setTxId(result)
      setTxStatus('broadcasting')

      // Register locally for tracking
      registerProposal(pid, title.trim())

      // Save description to localStorage for display
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`veilsub_gov_desc_${pid}`, description.trim())
        } catch { /* ignore */ }
      }

      // Poll for confirmation
      startPolling(result, (pollResult) => {
        if (pollResult.status === 'confirmed') {
          setTxStatus('confirmed')
          toast.success('Proposal created on-chain!')
          setTitle('')
          setDescription('')
          onCreated()
        } else if (pollResult.status === 'failed') {
          setTxStatus('failed')
          setError('Transaction failed on-chain')
        } else if (pollResult.status === 'timeout') {
          setTxStatus('confirmed')
          toast.success('Proposal likely created — check on-chain status')
          onCreated()
        }
      })
    } catch (err) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }, [connected, address, title, description, execute, registerProposal, startPolling, onCreated])

  const isSubmitting = txStatus === 'signing' || txStatus === 'broadcasting' || txStatus === 'proving'

  return (
    <GlassCard className="!p-0 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
            <Plus className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Create Proposal</h3>
            <p className="text-xs text-white/50">Submit a governance proposal to the community</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-white/60" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white/60" />
        )}
      </button>

      {expanded && (
        <m.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={spring.gentle}
          className="border-t border-border/50"
        >
          <div className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="proposal-title" className="block text-sm font-medium text-white/70 mb-1.5">
                Proposal Title
              </label>
              <input
                id="proposal-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Reduce platform fee to 3%"
                maxLength={120}
                className="w-full bg-white/[0.04] border border-border rounded-xl px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 transition-colors text-sm"
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="proposal-desc" className="block text-sm font-medium text-white/70 mb-1.5">
                Description <span className="text-white/60">(optional)</span>
              </label>
              <textarea
                id="proposal-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your proposal in detail..."
                rows={3}
                maxLength={1000}
                className="w-full bg-white/[0.04] border border-border rounded-xl px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 transition-colors text-sm resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Computed fields preview */}
            {title && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-border/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Proposal ID:</span>
                  <button
                    onClick={() => copyToClipboard(proposalId)}
                    className="flex items-center gap-1 text-white/60 hover:text-white/80 transition-colors font-mono"
                  >
                    {truncateField(proposalId, 6)}
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                {description && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Description Hash:</span>
                    <span className="text-white/60 font-mono">{truncateField(descHash, 6)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Fee:</span>
                  <span className="text-white/60">{(FEES.GOV_CREATE_PROPOSAL / 1_000_000).toFixed(2)} ALEO</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Tx confirmed */}
            {txStatus === 'confirmed' && txId && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Proposal created! TX: {txId.slice(0, 12)}...
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3">
              <Button
                variant="accent"
                onClick={handleSubmit}
                disabled={!connected || !title.trim() || isSubmitting}
                className="rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {txStatus === 'signing' ? 'Signing...' : 'Broadcasting...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Proposal
                  </>
                )}
              </Button>
              {!connected && (
                <span className="text-xs text-amber-400">Connect wallet to create proposals</span>
              )}
            </div>
          </div>
        </m.div>
      )}
    </GlassCard>
  )
}

// ─── Cast Ballot Modal ──────────────────────────────────────────────────────

interface CastBallotProps {
  proposal: Proposal
  onVoted: () => void
  onClose: () => void
}

function CastBallotPanel({ proposal, onVoted, onClose }: CastBallotProps) {
  const { execute, address, connected } = useContractExecute()
  const { saveBallot, clearCache } = useGovernance()
  const { startPolling } = useTransactionPoller()
  const [vote, setVote] = useState<boolean | null>(null)
  const [salt] = useState(() => generateSalt())
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const existingBallot = useMemo(() => getBallotSalt(proposal.id), [proposal.id])

  const handleVote = useCallback(async () => {
    if (!connected || !address || vote === null) return

    setTxStatus('signing')
    setError(null)

    try {
      const result = await execute(
        'cast_ballot',
        [proposal.id, `${vote}`, salt],
        FEES.GOV_CAST_BALLOT,
        GOVERNANCE_PROGRAM_ID
      )

      if (!result) {
        setTxStatus('failed')
        setError('Transaction rejected by wallet')
        return
      }

      setTxStatus('broadcasting')

      // Save salt locally so user can prove their vote later
      saveBallot(proposal.id, salt, vote)

      startPolling(result, (pollResult) => {
        if (pollResult.status === 'confirmed') {
          setTxStatus('confirmed')
          clearCache()
          toast.success('Ballot cast! Your vote is sealed with Pedersen commitment.')
          onVoted()
        } else if (pollResult.status === 'failed') {
          setTxStatus('failed')
          setError('Ballot failed — you may have already voted on this proposal')
        } else if (pollResult.status === 'timeout') {
          setTxStatus('confirmed')
          clearCache()
          toast.success('Ballot likely recorded — check on-chain status')
          onVoted()
        }
      })
    } catch (err) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }, [connected, address, vote, salt, proposal.id, execute, saveBallot, clearCache, startPolling, onVoted])

  const isSubmitting = txStatus === 'signing' || txStatus === 'broadcasting' || txStatus === 'proving'

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-semibold">Cast Your Ballot</h4>
        <button onClick={onClose} className="text-white/60 hover:text-white/60 text-sm transition-colors">
          Cancel
        </button>
      </div>

      {existingBallot && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          You already cast a ballot on this proposal. Double-voting will be rejected on-chain.
        </div>
      )}

      {/* Privacy notice */}
      <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/15 text-xs text-white/60 flex items-start gap-2.5">
        <Fingerprint className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-violet-300 mb-1">Pedersen Commitment Privacy</p>
          <p>Your vote direction is hidden via homomorphic encryption. The ZK circuit computes a
          Pedersen commitment (value*G + blinding*H) for your vote. Only the commitment reaches
          finalize — your yes/no choice never leaves the proof.</p>
        </div>
      </div>

      {/* Vote selection */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setVote(true)}
          disabled={isSubmitting}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
            vote === true
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-white/[0.02] border-border hover:border-white/15 text-white/50 hover:text-white/70'
          }`}
        >
          <CheckCircle2 className="w-6 h-6" />
          <span className="text-sm font-medium">Yes</span>
        </button>
        <button
          onClick={() => setVote(false)}
          disabled={isSubmitting}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
            vote === false
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-white/[0.02] border-border hover:border-white/15 text-white/50 hover:text-white/70'
          }`}
        >
          <XCircle className="w-6 h-6" />
          <span className="text-sm font-medium">No</span>
        </button>
      </div>

      {/* Salt display */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-border/50 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-white/60">Random Salt (stored locally):</span>
          <button
            onClick={() => copyToClipboard(salt)}
            className="flex items-center gap-1 text-white/60 hover:text-white/80 transition-colors font-mono"
          >
            {truncateField(salt, 6)}
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <p className="text-white/60">This salt is saved in your browser. Keep it to prove your vote later.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {txStatus === 'confirmed' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Ballot sealed on-chain!
        </div>
      )}

      <Button
        variant="accent"
        onClick={handleVote}
        disabled={vote === null || !connected || isSubmitting}
        className="w-full rounded-xl"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {txStatus === 'signing' ? 'Signing...' : 'Sealing ballot...'}
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Seal Ballot
          </>
        )}
      </Button>
    </div>
  )
}

// ─── Resolve / Verify / Cancel Actions ──────────────────────────────────────

interface ProposalActionsProps {
  proposal: Proposal
  onAction: () => void
}

function ProposalActions({ proposal, onAction }: ProposalActionsProps) {
  const { execute, connected } = useContractExecute()
  const { clearCache } = useGovernance()
  const { startPolling } = useTransactionPoller()
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [resolveYes, setResolveYes] = useState('')
  const [resolveNo, setResolveNo] = useState('')
  const [showResolve, setShowResolve] = useState(false)
  const [showVerify, setShowVerify] = useState(false)

  const isSubmitting = txStatus === 'signing' || txStatus === 'broadcasting' || txStatus === 'proving'

  const handleResolve = useCallback(async () => {
    if (!connected) return
    const yesNum = parseInt(resolveYes, 10)
    const noNum = parseInt(resolveNo, 10)
    if (isNaN(yesNum) || isNaN(noNum) || yesNum < 0 || noNum < 0) {
      toast.error('Enter valid vote counts')
      return
    }
    if (yesNum + noNum !== proposal.voteCount) {
      toast.error(`Counts must sum to ${proposal.voteCount} (total votes)`)
      return
    }

    setTxStatus('signing')
    setError(null)

    try {
      const result = await execute(
        'resolve_proposal',
        [proposal.id, `${yesNum}u64`, `${noNum}u64`],
        FEES.GOV_RESOLVE_PROPOSAL,
        GOVERNANCE_PROGRAM_ID
      )

      if (!result) {
        setTxStatus('failed')
        setError('Transaction rejected')
        return
      }

      setTxStatus('broadcasting')
      startPolling(result, (pollResult) => {
        if (pollResult.status === 'confirmed') {
          setTxStatus('confirmed')
          clearCache()
          toast.success('Proposal resolved! Tally verified against Pedersen commitments.')
          onAction()
        } else if (pollResult.status === 'failed') {
          setTxStatus('failed')
          setError('Resolution failed — commitment verification may have failed. Check your yes/no counts.')
        } else if (pollResult.status === 'timeout') {
          setTxStatus('confirmed')
          clearCache()
          onAction()
        }
      })
    } catch (err) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }, [connected, resolveYes, resolveNo, proposal, execute, clearCache, startPolling, onAction])

  const handleVerify = useCallback(async () => {
    if (!connected || proposal.resolvedYes === null || proposal.resolvedNo === null) return

    setTxStatus('signing')
    setError(null)

    try {
      const result = await execute(
        'verify_tally',
        [proposal.id, `${proposal.resolvedYes}u64`, `${proposal.resolvedNo}u64`],
        FEES.GOV_VERIFY_TALLY,
        GOVERNANCE_PROGRAM_ID
      )

      if (!result) {
        setTxStatus('failed')
        setError('Transaction rejected')
        return
      }

      setTxStatus('broadcasting')
      startPolling(result, (pollResult) => {
        if (pollResult.status === 'confirmed') {
          setTxStatus('confirmed')
          toast.success('Tally cryptographically verified! Pedersen commitments match.')
        } else if (pollResult.status === 'failed') {
          setTxStatus('failed')
          setError('Verification failed — tally may have been tampered with')
        } else if (pollResult.status === 'timeout') {
          setTxStatus('confirmed')
          toast.success('Verification likely passed')
        }
      })
    } catch (err) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }, [connected, proposal, execute, startPolling])

  const handleCancel = useCallback(async () => {
    if (!connected) return

    setTxStatus('signing')
    setError(null)

    try {
      const result = await execute(
        'cancel_proposal',
        [proposal.id],
        FEES.GOV_CANCEL_PROPOSAL,
        GOVERNANCE_PROGRAM_ID
      )

      if (!result) {
        setTxStatus('failed')
        setError('Transaction rejected')
        return
      }

      setTxStatus('broadcasting')
      startPolling(result, (pollResult) => {
        if (pollResult.status === 'confirmed') {
          setTxStatus('confirmed')
          clearCache()
          toast.success('Proposal cancelled')
          onAction()
        } else if (pollResult.status === 'failed') {
          setTxStatus('failed')
          setError('Cancel failed — you may not be the proposal creator')
        } else if (pollResult.status === 'timeout') {
          setTxStatus('confirmed')
          clearCache()
          onAction()
        }
      })
    } catch (err) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }, [connected, proposal.id, execute, clearCache, startPolling, onAction])

  if (proposal.status === 2) return null // Cancelled — no actions

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-border/30">
      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {txStatus === 'confirmed' && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Transaction confirmed!
        </div>
      )}

      {/* Active proposal actions */}
      {proposal.status === 0 && (
        <div className="flex flex-wrap gap-2">
          {/* Resolve */}
          <button
            onClick={() => { setShowResolve(!showResolve); setShowVerify(false) }}
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/15 transition-colors"
          >
            Resolve
          </button>
          {/* Cancel (creator only — contract enforces) */}
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/15 transition-colors disabled:opacity-40"
          >
            {isSubmitting ? 'Processing...' : 'Cancel (creator only)'}
          </button>
        </div>
      )}

      {/* Resolved proposal actions */}
      {proposal.status === 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowVerify(!showVerify); setShowResolve(false) }}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/15 transition-colors"
          >
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Verify Tally
            </span>
          </button>
        </div>
      )}

      {/* Resolve form */}
      {showResolve && proposal.status === 0 && (
        <m.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={spring.gentle}
          className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-border/50"
        >
          <p className="text-xs text-white/50">
            Enter the claimed yes/no counts. The contract verifies these against the aggregate
            Pedersen commitments — incorrect counts will be rejected.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="resolve-yes" className="block text-xs text-white/60 mb-1">Yes Count</label>
              <input
                id="resolve-yes"
                type="number"
                min={0}
                value={resolveYes}
                onChange={(e) => setResolveYes(e.target.value)}
                className="w-full bg-white/[0.04] border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                placeholder="0"
              />
            </div>
            <div>
              <label htmlFor="resolve-no" className="block text-xs text-white/60 mb-1">No Count</label>
              <input
                id="resolve-no"
                type="number"
                min={0}
                value={resolveNo}
                onChange={(e) => setResolveNo(e.target.value)}
                className="w-full bg-white/[0.04] border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                placeholder="0"
              />
            </div>
          </div>
          <p className="text-xs text-white/60">Total votes: {proposal.voteCount} (yes + no must equal this)</p>
          <Button
            variant="accent"
            size="sm"
            onClick={handleResolve}
            disabled={isSubmitting || !resolveYes || !resolveNo}
            className="rounded-lg"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Resolve Proposal
          </Button>
        </m.div>
      )}

      {/* Verify section */}
      {showVerify && proposal.status === 1 && (
        <m.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={spring.gentle}
          className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-border/50"
        >
          <p className="text-xs text-white/50">
            Cryptographically verify that the resolved tally matches the aggregate Pedersen commitments.
            This re-checks: count*G + blind_sum*H == stored_commit for both yes and no.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
              <span className="text-emerald-400 font-medium">{proposal.resolvedYes ?? '?'}</span>
              <span className="text-white/60 ml-1">Yes votes</span>
            </div>
            <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/15">
              <span className="text-red-400 font-medium">{proposal.resolvedNo ?? '?'}</span>
              <span className="text-white/60 ml-1">No votes</span>
            </div>
          </div>
          <Button
            variant="accent"
            size="sm"
            onClick={handleVerify}
            disabled={isSubmitting || proposal.resolvedYes === null}
            className="rounded-lg"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            Verify On-Chain
          </Button>
        </m.div>
      )}
    </div>
  )
}

// ─── Proposal Card ──────────────────────────────────────────────────────────

interface ProposalCardProps {
  proposal: Proposal
  onRefresh: () => void
}

function ProposalCard({ proposal, onRefresh }: ProposalCardProps) {
  const { connected } = useContractExecute()
  const [showVoting, setShowVoting] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const statusColor = STATUS_COLORS[proposal.status] ?? STATUS_COLORS[0]
  const StatusIcon = STATUS_ICONS[proposal.status] ?? Vote

  // Load local description
  const localDesc = typeof window !== 'undefined'
    ? localStorage.getItem(`veilsub_gov_desc_${proposal.id}`) ?? ''
    : ''

  const existingBallot = useMemo(() => getBallotSalt(proposal.id), [proposal.id])

  return (
    <GlassCard className="!p-0 overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-semibold text-base truncate">
              {proposal.title ?? `Proposal ${truncateField(proposal.id, 4)}`}
            </h3>
            {localDesc && (
              <p className="text-xs text-white/50 mt-1 line-clamp-2">{localDesc}</p>
            )}
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text} border ${statusColor.border} shrink-0`}>
            <StatusIcon className="w-3 h-3" />
            {getStatusLabel(proposal.status)}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 mb-3 text-xs">
          <div className="flex items-center gap-1.5 text-white/50">
            <Vote className="w-3.5 h-3.5" />
            <span>{proposal.voteCount} vote{proposal.voteCount !== 1 ? 's' : ''}</span>
          </div>
          {existingBallot && (
            <div className="flex items-center gap-1.5 text-violet-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>You voted</span>
            </div>
          )}
          {proposal.createdAt && (
            <div className="text-white/60">
              {new Date(proposal.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Resolved tally */}
        {proposal.status === 1 && proposal.resolvedYes !== null && proposal.resolvedNo !== null && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-center">
              <div className="text-lg font-bold text-emerald-400">{proposal.resolvedYes}</div>
              <div className="text-xs text-emerald-400/60">Yes</div>
            </div>
            <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/15 text-center">
              <div className="text-lg font-bold text-red-400">{proposal.resolvedNo}</div>
              <div className="text-xs text-red-400/60">No</div>
            </div>
          </div>
        )}

        {/* Pedersen commitment details (collapsible) */}
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="flex items-center gap-1 text-xs text-white/60 hover:text-white/70 transition-colors mb-2"
        >
          <Hash className="w-3 h-3" />
          Commitment details
          {detailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {detailsOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={spring.gentle}
            className="p-3 rounded-xl bg-white/[0.015] border border-border/30 space-y-1.5 text-xs font-mono mb-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-white/60">Proposal ID:</span>
              <button onClick={() => copyToClipboard(proposal.id)} className="text-white/50 hover:text-white/70 flex items-center gap-1 transition-colors">
                {truncateField(proposal.id, 6)} <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Creator Hash:</span>
              <button onClick={() => copyToClipboard(proposal.creatorHash)} className="text-white/50 hover:text-white/70 flex items-center gap-1 transition-colors">
                {truncateField(proposal.creatorHash, 6)} <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Desc Hash:</span>
              <span className="text-white/50">{truncateField(proposal.descriptionHash, 6)}</span>
            </div>
            <div className="pt-1.5 border-t border-border/20">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400/50">Yes Commit:</span>
                <button onClick={() => copyToClipboard(proposal.yesCommit)} className="text-emerald-400/40 hover:text-emerald-400/60 flex items-center gap-1 transition-colors">
                  {truncateField(proposal.yesCommit, 6)} <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-red-400/50">No Commit:</span>
                <button onClick={() => copyToClipboard(proposal.noCommit)} className="text-red-400/40 hover:text-red-400/60 flex items-center gap-1 transition-colors">
                  {truncateField(proposal.noCommit, 6)} <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </m.div>
        )}

        {/* Vote button (active proposals only) */}
        {proposal.status === 0 && connected && !showVoting && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => setShowVoting(true)}
            className="rounded-xl w-full"
          >
            <Lock className="w-3.5 h-3.5" />
            Cast Sealed Ballot
          </Button>
        )}

        {/* Inline voting panel */}
        {showVoting && (
          <div className="mt-3 -mx-5 -mb-5 border-t border-border/50 bg-white/[0.01]">
            <CastBallotPanel
              proposal={proposal}
              onVoted={() => { setShowVoting(false); onRefresh() }}
              onClose={() => setShowVoting(false)}
            />
          </div>
        )}

        {/* Resolve / Verify / Cancel actions */}
        {!showVoting && <ProposalActions proposal={proposal} onAction={onRefresh} />}
      </div>
    </GlassCard>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function GovernancePage() {
  const { proposals, stats, loading, error, refresh } = useGovernance()
  const { connected } = useContractExecute()

  const activeProposals = proposals.filter(p => p.status === 0)
  const resolvedProposals = proposals.filter(p => p.status === 1)
  const cancelledProposals = proposals.filter(p => p.status === 2)

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
              Vote on VeilSub&apos;s future with Pedersen commitment privacy.
              Your vote direction is hidden via homomorphic encryption — only aggregate results are public.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-white/60">
                <Lock className="w-3 h-3" aria-hidden="true" />
                Pedersen commitments
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <EyeOff className="w-3 h-3" aria-hidden="true" />
                Homomorphic aggregation
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400">
                <Shield className="w-3 h-3" aria-hidden="true" />
                Anti-sybil nullifiers
              </div>
            </div>

            {/* Platform stats */}
            <div className="flex items-center justify-center gap-6 mt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.totalProposals}</div>
                <div className="text-xs text-white/60">Proposals</div>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.totalBallots}</div>
                <div className="text-xs text-white/60">Ballots Cast</div>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-400">v2</div>
                <div className="text-xs text-white/60">Contract</div>
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* ── Create Proposal ────────────────────────────────────────────── */}
      <section className="py-6">
        <Container>
          <ScrollReveal>
            <CreateProposalForm onCreated={refresh} />
          </ScrollReveal>
        </Container>
      </section>

      {/* ── Proposals List ─────────────────────────────────────────────── */}
      <section className="py-6 sm:py-10">
        <Container>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white" style={LETTER_SPACING_STYLE}>
              Proposals
            </h2>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <ProposalSkeleton />
              <ProposalSkeleton />
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-16">
              <Vote className="w-12 h-12 text-white/20 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-white mb-2">No proposals yet</h3>
              <p className="text-sm text-white/50 max-w-sm mx-auto">
                {connected
                  ? 'Be the first to create a governance proposal. Click "Create Proposal" above.'
                  : 'Connect your wallet to create or vote on governance proposals.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active proposals */}
              {activeProposals.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                    Active ({activeProposals.length})
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {activeProposals.map((p) => (
                      <ScrollReveal key={p.id}>
                        <ProposalCard proposal={p} onRefresh={refresh} />
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved proposals */}
              {resolvedProposals.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-violet-400 uppercase tracking-wider mb-3">
                    Resolved ({resolvedProposals.length})
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {resolvedProposals.map((p) => (
                      <ScrollReveal key={p.id}>
                        <ProposalCard proposal={p} onRefresh={refresh} />
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancelled proposals */}
              {cancelledProposals.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-400/60 uppercase tracking-wider mb-3">
                    Cancelled ({cancelledProposals.length})
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {cancelledProposals.map((p) => (
                      <ScrollReveal key={p.id}>
                        <ProposalCard proposal={p} onRefresh={refresh} />
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Container>
      </section>

      {/* ── Privacy Notice ─────────────────────────────────────────────── */}
      <section className="py-8">
        <Container>
          <ScrollReveal>
            <div className="max-w-3xl mx-auto p-5 rounded-2xl bg-violet-500/[0.03] border border-violet-500/10">
              <div className="flex items-start gap-3">
                <Fingerprint className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-violet-300 mb-2">
                    How Pedersen Vote Privacy Works
                  </p>
                  <div className="text-sm text-white/60 leading-relaxed space-y-2">
                    <p>
                      Each ballot computes a <span className="text-violet-300 font-mono text-xs">Pedersen commitment = value * G + blinding * H</span> where
                      G is the group generator and H = Poseidon2(0). Your vote (yes/no) determines which
                      aggregate receives the commitment.
                    </p>
                    <p>
                      The <span className="text-white/70 font-medium">homomorphic property</span> means
                      commitments can be summed without decryption:
                      sum(commit(1, r_i)) = commit(N, sum(r_i)). The aggregate encodes the total
                      count without revealing individual votes.
                    </p>
                    <p>
                      Your <span className="text-white/70 font-medium">identity is hidden</span> behind
                      a Poseidon2 hash nullifier. Each (voter, proposal) pair produces a unique nullifier
                      — preventing double-voting while keeping your address private.
                    </p>
                    <p>
                      Your ballot salt is stored <span className="text-white/70 font-medium">only in your browser</span>.
                      Keep it to prove your vote later. Without the salt, linking a ballot to your identity
                      is mathematically impossible.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

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
                      className={`w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                        step.color === 'violet' ? 'bg-violet-500/10 border border-violet-500/20' :
                        step.color === 'blue' ? 'bg-blue-500/10 border border-blue-500/20' :
                        'bg-emerald-500/10 border border-emerald-500/20'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${
                        step.color === 'violet' ? 'text-violet-400' :
                        step.color === 'blue' ? 'text-blue-400' :
                        'text-emerald-400'
                      }`} aria-hidden="true" />
                    </div>
                    <div
                      className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                        step.color === 'violet' ? 'text-violet-400' :
                        step.color === 'blue' ? 'text-blue-400' :
                        'text-emerald-400'
                      }`}
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
            <div className="max-w-3xl mx-auto mt-8 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-start gap-3">
                <Hash className="w-5 h-5 text-white/60 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-white/70 mb-1">
                    Deployed on Aleo Testnet
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Contract: <span className="font-mono text-violet-400">{GOVERNANCE_PROGRAM_ID}</span>.
                    5 transitions, 14 mappings. Pedersen generators: G = group::GEN,
                    H = Poseidon2::hash_to_group(0field). Anti-sybil via BHP256 nullifiers.
                    Cross-program composability ready for subscriber-gated voting.
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
                Your Voice, Your Secret
              </h2>
              <p className="text-white/80 mb-8">
                Private governance is the foundation of a fair protocol. Explore the rest of the
                VeilSub ecosystem.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/explore">
                  <Button variant="accent" size="lg" className="rounded-full shadow-accent-lg">
                    Explore Creators
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
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
