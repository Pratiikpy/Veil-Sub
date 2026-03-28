'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { spring } from '@/lib/motion'
import {
  Users,
  Handshake,
  Split,
  FileText,
  XCircle,
  Loader2,
  CheckCircle2,
  Shield,
  DollarSign,
  Percent,
  Hash,
  ArrowRight,
  AlertCircle,
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
import { FEES, ALEO_ADDRESS_RE } from '@/lib/config'

// ─── Program constants ─────────────────────────────────────────────────────
const COLLAB_PROGRAM = 'veilsub_collab_v2.aleo'

// ─── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
}

// ─── Helper: query on-chain mapping ─────────────────────────────────────────
async function queryMapping(mapping: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/aleo/program/${encodeURIComponent(COLLAB_PROGRAM)}/mapping/${encodeURIComponent(mapping)}/${encodeURIComponent(key)}`
    )
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text === 'null' || text === '""') return null
    return text.replace(/"/g, '')
  } catch {
    return null
  }
}

// ─── Step indicator ─────────────────────────────────────────────────────────
function StepIndicator({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex items-center gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i + 1 <= step ? 'bg-violet-400' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-white/50 font-medium">Step {step}: {label}</span>
    </div>
  )
}

// ─── Create Collaboration ───────────────────────────────────────────────────
function CreateCollabForm() {
  const { address, connected, execute } = useContractExecute()
  const [partner, setPartner] = useState('')
  const [splitPct, setSplitPct] = useState('50')
  const [contentScope, setContentScope] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const creatingRef = useRef(false)

  const handleCreate = useCallback(async () => {
    if (creatingRef.current) return
    if (!connected || !address) {
      toast.error('Connect your wallet first')
      return
    }
    if (!ALEO_ADDRESS_RE.test(partner)) {
      toast.error('Enter a valid Aleo address for your partner')
      return
    }
    if (partner === address) {
      toast.error('Cannot collaborate with yourself')
      return
    }
    const pct = parseInt(splitPct, 10)
    if (pct < 1 || pct > 99) {
      toast.error('Split must be between 1% and 99%')
      return
    }

    creatingRef.current = true
    setSubmitting(true)
    setTxId(null)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < FEES.REGISTER * 2) {
            toast.error(`Insufficient public balance. You need ~${(FEES.REGISTER * 2 / 1_000_000).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setSubmitting(false)
            creatingRef.current = false
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      // Generate a unique collab_id from timestamp
      const collabId = `${BigInt(Date.now()) * BigInt(1000003)}field`
      const scopeHash = contentScope.trim()
        ? `${BigInt(contentScope.length) * BigInt(7919)}field`
        : '0field'

      const result = await execute(
        'create_collab',
        [partner, collabId, `${pct}u8`, scopeHash],
        FEES.REGISTER * 2, // 300k
        COLLAB_PROGRAM
      )
      if (result) {
        setTxId(result)
        toast.success('Collaboration created on-chain!')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
      creatingRef.current = false
    }
  }, [connected, address, partner, splitPct, contentScope, execute])

  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <Handshake className="w-4 h-4 text-violet-400" />
        Create Collaboration
      </h3>
      <p className="text-xs text-white/60 mb-5">
        Set up a revenue-sharing agreement with another creator.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Partner Address</label>
          <input
            type="text"
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            placeholder="aleo1..."
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">
            Your Revenue Split: <span className="text-violet-400 font-bold">{splitPct}%</span>
            <span className="text-white/60 ml-1">(partner gets {100 - parseInt(splitPct || '0', 10)}%)</span>
          </label>
          <input
            type="range"
            min="1"
            max="99"
            value={splitPct}
            onChange={(e) => setSplitPct(e.target.value)}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-xs text-white/60 mt-1">
            <span>1%</span>
            <span>50/50</span>
            <span>99%</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Content Scope (optional)</label>
          <input
            type="text"
            value={contentScope}
            onChange={(e) => setContentScope(e.target.value)}
            placeholder="e.g. ZK Tutorial Series"
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all"
          />
        </div>

        {/* Privacy callout */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/15">
          <Shield className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <p className="text-xs text-white/60 leading-relaxed">
            Both parties receive a private CollabAgreement struct. Only Poseidon2-hashed keys
            appear in on-chain mappings -- collaborator addresses are never exposed.
          </p>
        </div>

        <Button
          variant="accent"
          className="w-full rounded-xl"
          disabled={!connected || submitting || !partner}
          onClick={handleCreate}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating Agreement...
            </>
          ) : !connected ? (
            'Connect Wallet'
          ) : (
            <>
              <Handshake className="w-4 h-4" />
              Create Collaboration
            </>
          )}
        </Button>

        {txId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-emerald-400 font-medium">Collaboration created!</p>
              <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ─── Split Payment Form ─────────────────────────────────────────────────────
function SplitPaymentForm() {
  const { connected, execute, address } = useContractExecute()
  const [collabId, setCollabId] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const splittingRef = useRef(false)

  const handleSplit = useCallback(async () => {
    if (splittingRef.current) return
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!collabId) {
      toast.error('Enter the collaboration ID')
      return
    }
    const amt = parseInt(amount, 10)
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount in microcredits')
      return
    }

    splittingRef.current = true
    setSubmitting(true)
    setTxId(null)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < FEES.REGISTER * 2) {
            toast.error(`Insufficient public balance. You need ~${(FEES.REGISTER * 2 / 1_000_000).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setSubmitting(false)
            splittingRef.current = false
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      const result = await execute(
        'split_payment',
        [collabId, `${amt}u64`],
        FEES.REGISTER * 2, // 300k
        COLLAB_PROGRAM
      )
      if (result) {
        setTxId(result)
        toast.success('Payment split on-chain!')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
      splittingRef.current = false
    }
  }, [connected, collabId, amount, execute])

  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <Split className="w-4 h-4 text-emerald-400" />
        Split Payment
      </h3>
      <p className="text-xs text-white/60 mb-5">
        Atomically split incoming revenue between collaborators using credits.aleo.
      </p>

      <div className="space-y-4">
        {/* Visual split diagram */}
        <div className="p-4 rounded-xl bg-black/30 border border-border/30">
          <div className="flex items-center justify-between gap-4 text-center">
            <div className="flex-1">
              <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-2">
                <DollarSign className="w-5 h-5 text-violet-400" />
              </div>
              <p className="text-xs text-white/70 font-semibold">Payment In</p>
              <p className="text-xs text-white/60">Total amount</p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/20 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <span className="text-xs text-blue-400 font-bold">A</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-xs text-emerald-400 font-bold">B</span>
                </div>
              </div>
              <p className="text-xs text-white/70 font-semibold">Split</p>
              <p className="text-xs text-white/60">Per agreement %</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Collaboration ID (field)</label>
          <input
            type="text"
            value={collabId}
            onChange={(e) => setCollabId(e.target.value)}
            placeholder="Collab ID from create_collab"
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Amount (microcredits)</label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1000000 (= 1 credit)"
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/15">
          <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-white/60 leading-relaxed">
            Split payment requires a <strong className="text-blue-300">credits record</strong> from your wallet
            and an active CollabAgreement. The split is atomic -- both parties are paid in a single transition
            via <code className="text-blue-300">credits.aleo/transfer_private</code>.
          </p>
        </div>

        <Button
          variant="accent"
          className="w-full rounded-xl"
          disabled={!connected || submitting || !collabId || !amount}
          onClick={handleSplit}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Splitting Payment...
            </>
          ) : !connected ? (
            'Connect Wallet'
          ) : (
            <>
              <Split className="w-4 h-4" />
              Split Payment
            </>
          )}
        </Button>

        {txId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-emerald-400 font-medium">Payment split!</p>
              <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ─── Publish Collab Content ─────────────────────────────────────────────────
function PublishCollabContentForm() {
  const { connected, execute, address } = useContractExecute()
  const [collabId, setCollabId] = useState('')
  const [contentId, setContentId] = useState('')
  const [contentHash, setContentHash] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)

  const handlePublish = useCallback(async () => {
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!collabId || !contentId || !contentHash) {
      toast.error('All fields are required')
      return
    }

    setSubmitting(true)
    setTxId(null)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < FEES.REGISTER) {
            toast.error(`Insufficient public balance. You need ~${(FEES.REGISTER / 1_000_000).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setSubmitting(false)
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      const result = await execute(
        'publish_collab_content',
        [collabId, contentId, contentHash],
        FEES.REGISTER, // 150k
        COLLAB_PROGRAM
      )
      if (result) {
        setTxId(result)
        toast.success('Co-authored content published on-chain!')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }, [connected, collabId, contentId, contentHash, execute])

  return (
    <GlassCard className="!p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-blue-400" />
        <h3 className="text-white font-semibold text-sm">Publish Co-Authored Content</h3>
      </div>
      <p className="text-xs text-white/50 leading-relaxed mb-4">
        Publish content linked to your collaboration. Increments the shared content counter
        on-chain. Requires an active CollabAgreement.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-white/50 mb-1">Collaboration ID (field)</label>
          <input
            type="text"
            value={collabId}
            onChange={(e) => setCollabId(e.target.value)}
            placeholder="Collab ID from create_collab"
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Content ID (field)</label>
          <input
            type="text"
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            placeholder="Unique content identifier"
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Content Hash (field)</label>
          <input
            type="text"
            value={contentHash}
            onChange={(e) => setContentHash(e.target.value)}
            placeholder="Hash of content for integrity"
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
          />
        </div>
      </div>

      <Button
        variant="accent"
        className="w-full rounded-xl mt-4"
        disabled={!connected || submitting || !collabId || !contentId || !contentHash}
        onClick={handlePublish}
        size="sm"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Publishing...
          </>
        ) : !connected ? (
          'Connect Wallet'
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Publish Content
          </>
        )}
      </Button>

      {txId && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 mt-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-emerald-400 font-medium">Content published!</p>
            <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

// ─── End Collab Form ───────────────────────────────────────────────────────
function EndCollabForm() {
  const { connected, execute, address } = useContractExecute()
  const [collabId, setCollabId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const endingRef = useRef(false)

  const handleEnd = useCallback(async () => {
    if (endingRef.current) return
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!collabId) {
      toast.error('Enter the collaboration ID')
      return
    }

    endingRef.current = true
    setShowConfirm(false)
    setSubmitting(true)
    setTxId(null)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < FEES.REGISTER) {
            toast.error(`Insufficient public balance. You need ~${(FEES.REGISTER / 1_000_000).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setSubmitting(false)
            endingRef.current = false
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      const result = await execute(
        'end_collab',
        [collabId],
        FEES.REGISTER, // 150k
        COLLAB_PROGRAM
      )
      if (result) {
        setTxId(result)
        toast.success('Collaboration ended on-chain!')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
      endingRef.current = false
    }
  }, [connected, collabId, execute])

  return (
    <GlassCard className="!p-5">
      <div className="flex items-center gap-2 mb-3">
        <XCircle className="w-4 h-4 text-red-400" />
        <h3 className="text-white font-semibold text-sm">End Collaboration</h3>
      </div>
      <p className="text-xs text-white/50 leading-relaxed mb-4">
        Either party can end the collaboration at any time. Sets the collab_active mapping
        to false. Revenue already split is unaffected.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-white/50 mb-1">Collaboration ID (field)</label>
          <input
            type="text"
            value={collabId}
            onChange={(e) => setCollabId(e.target.value)}
            placeholder="Collab ID to end"
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all font-mono"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Shield className="w-3 h-3" />
          <span>No penalty -- mutual exit at any time</span>
        </div>
      </div>

      {showConfirm && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
          <p className="text-xs text-red-300">Are you sure you want to end this collaboration? This action is irreversible on-chain.</p>
          <div className="flex gap-2">
            <button onClick={handleEnd} disabled={submitting} className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-xs font-medium text-red-300 hover:bg-red-500/30 disabled:opacity-40 transition-all">Confirm End</button>
            <button onClick={() => setShowConfirm(false)} disabled={submitting} className="px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-white/50 hover:bg-white/[0.08] disabled:opacity-40 transition-all">Cancel</button>
          </div>
        </div>
      )}
      {!showConfirm && (
        <Button
          variant="secondary"
          className="w-full rounded-xl mt-4 !border-red-500/20 !text-red-400 hover:!bg-red-500/5"
          disabled={!connected || submitting || !collabId}
          onClick={() => setShowConfirm(true)}
          size="sm"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Ending...
            </>
          ) : !connected ? (
            'Connect Wallet'
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              End Collaboration
            </>
          )}
        </Button>
      )}

      {txId && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 mt-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-emerald-400 font-medium">Collaboration ended!</p>
            <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

// ─── Collab Lookup ──────────────────────────────────────────────────────────
function CollabLookup() {
  const [collabKey, setCollabKey] = useState('')
  const [result, setResult] = useState<{
    exists: boolean | null
    active: boolean | null
    revenue: string | null
    contentCount: string | null
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLookup = useCallback(async () => {
    if (!collabKey) return
    setLoading(true)
    try {
      const [existsStr, activeStr, revStr, countStr] = await Promise.all([
        queryMapping('collab_exists', collabKey),
        queryMapping('collab_active', collabKey),
        queryMapping('collab_revenue', collabKey),
        queryMapping('collab_content_count', collabKey),
      ])
      setResult({
        exists: existsStr === 'true',
        active: activeStr === 'true',
        revenue: revStr ? revStr.replace('u64', '') : '0',
        contentCount: countStr ? countStr.replace('u64', '') : '0',
      })
    } catch {
      toast.error('Failed to query on-chain data')
    } finally {
      setLoading(false)
    }
  }, [collabKey])

  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <Hash className="w-4 h-4 text-violet-400" />
        Lookup Collaboration
      </h3>
      <p className="text-xs text-white/60 mb-4">
        Query on-chain mappings by Poseidon2 collab key (no wallet needed).
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={collabKey}
          onChange={(e) => setCollabKey(e.target.value)}
          placeholder="Collab key (field hash)"
          className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
        />
        <Button
          variant="secondary"
          onClick={handleLookup}
          disabled={loading || !collabKey}
          className="rounded-xl"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Query'}
        </Button>
      </div>

      {result && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-black/30 border border-border/30">
            <p className="text-xs text-white/60 mb-0.5">Status</p>
            <p className={`text-sm font-semibold ${result.active ? 'text-emerald-400' : result.exists ? 'text-red-400' : 'text-white/60'}`}>
              {result.exists ? (result.active ? 'Active' : 'Ended') : 'Not Found'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-black/30 border border-border/30">
            <p className="text-xs text-white/60 mb-0.5">Total Revenue</p>
            <p className="text-sm font-semibold text-white">
              {result.revenue ? `${(parseInt(result.revenue) / 1_000_000).toFixed(2)} credits` : '--'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-black/30 border border-border/30 col-span-2">
            <p className="text-xs text-white/60 mb-0.5">Content Published</p>
            <p className="text-sm font-semibold text-white">{result.contentCount ?? '0'} pieces</p>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function CollabPage() {
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
                <Handshake className="w-4 h-4" aria-hidden="true" />
                Collaborations
              </Badge>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
              style={LETTER_SPACING_STYLE}
            >
              Revenue Splits
            </h1>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Create collaboration agreements with atomic on-chain revenue splitting.
              Both parties hold private records proving the terms.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400">
                <Split className="w-3 h-3" aria-hidden="true" />
                Atomic splits
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <DollarSign className="w-3 h-3" aria-hidden="true" />
                credits.aleo
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <Shield className="w-3 h-3" aria-hidden="true" />
                Private agreements
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* Forms */}
      <section className="py-12 sm:py-20">
        <Container>
          <div className="max-w-3xl mx-auto space-y-6">
            <ScrollReveal>
              <CreateCollabForm />
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <SplitPaymentForm />
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="grid sm:grid-cols-2 gap-4">
                <PublishCollabContentForm />
                <EndCollabForm />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <CollabLookup />
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-2xl sm:text-3xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Collaboration Lifecycle
              </h2>
            </div>
          </ScrollReveal>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: 'Create Agreement',
                  description: 'Creator A specifies partner address and split percentage (1-99%). Both receive private CollabAgreement structs.',
                  icon: Handshake,
                  color: 'violet',
                },
                {
                  step: 2,
                  title: 'Publish Together',
                  description: 'Either party publishes co-authored content. The on-chain content counter increments for the shared agreement.',
                  icon: FileText,
                  color: 'blue',
                },
                {
                  step: 3,
                  title: 'Split Revenue',
                  description: 'Incoming payments are atomically split via credits.aleo/transfer_private. Each party gets their agreed percentage.',
                  icon: Split,
                  color: 'emerald',
                },
                {
                  step: 4,
                  title: 'End (Optional)',
                  description: 'Either party can end the collaboration at any time. Already-split revenue is unaffected.',
                  icon: XCircle,
                  color: 'amber',
                },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <ScrollReveal key={item.step} delay={i * 0.08}>
                    <div className="flex gap-4">
                      <div className="shrink-0 flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/20 flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 text-${item.color}-400`} />
                        </div>
                        {i < 3 && <div className="w-px flex-1 bg-border/30 mt-2" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <h3 className="text-white font-semibold text-sm mb-1">
                          Step {item.step}: {item.title}
                        </h3>
                        <p className="text-xs text-white/55 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                )
              })}
            </div>
          </div>

          {/* Program badge */}
          <ScrollReveal delay={0.3}>
            <div className="flex items-center justify-center gap-2 mt-8">
              <code className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-border/50 text-xs text-white/50 font-mono">
                {COLLAB_PROGRAM}
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
