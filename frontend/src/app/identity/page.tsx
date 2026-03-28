'use client'

import { useState, useCallback, useEffect } from 'react'
import { m } from 'framer-motion'
import { spring } from '@/lib/motion'
import {
  Fingerprint,
  Shield,
  FileSignature,
  Clock,
  CheckCircle2,
  Loader2,
  Hash,
  Stamp,
  BadgeCheck,
  Copy,
  Check,
  AlertCircle,
  Layers,
  PenTool,
  Search,
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
const IDENTITY_PROGRAM = 'veilsub_identity_v2.aleo'

// ─── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
}

// ─── Helper: query mapping ──────────────────────────────────────────────────
async function queryMapping(mapping: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/aleo/program/${encodeURIComponent(IDENTITY_PROGRAM)}/mapping/${encodeURIComponent(mapping)}/${encodeURIComponent(key)}`
    )
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text === 'null' || text === '""') return null
    return text.replace(/"/g, '')
  } catch {
    return null
  }
}

// ─── Verify Authorship Form ─────────────────────────────────────────────────
function VerifyAuthorshipForm() {
  const { address, connected, execute } = useContractExecute()
  const [creatorAddress, setCreatorAddress] = useState('')
  const [contentHash, setContentHash] = useState('')
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)

  const handleVerify = useCallback(async () => {
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!ALEO_ADDRESS_RE.test(creatorAddress)) {
      toast.error('Enter a valid Aleo address')
      return
    }
    if (!contentHash) {
      toast.error('Enter a content hash')
      return
    }
    if (!signature) {
      toast.error('Enter the signature')
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
        'verify_authorship',
        [creatorAddress, contentHash, signature],
        FEES.REGISTER,
        IDENTITY_PROGRAM
      )
      if (result) {
        setTxId(result)
        toast.success('Authorship verified on-chain!')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed'
      if (msg.includes('assert')) {
        toast.error('Signature verification failed -- invalid signature for this content/creator')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }, [connected, creatorAddress, contentHash, signature, execute])

  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <FileSignature className="w-4 h-4 text-violet-400" />
        Verify Content Authorship
      </h3>
      <p className="text-xs text-white/60 mb-5">
        Submit a creator&apos;s Aleo signature on a content hash to prove authorship on-chain.
        Uses Leo&apos;s native <code className="text-violet-400">signature::verify</code>.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Creator Address</label>
          <input
            type="text"
            value={creatorAddress}
            onChange={(e) => setCreatorAddress(e.target.value)}
            placeholder="aleo1..."
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Content Hash (field)</label>
          <input
            type="text"
            value={contentHash}
            onChange={(e) => setContentHash(e.target.value)}
            placeholder="e.g. 12345field"
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Signature</label>
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="sign1..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all resize-none font-mono"
          />
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/15">
          <Shield className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <p className="text-xs text-white/60 leading-relaxed">
            On-chain verification: <code className="text-violet-300">signature::verify(sig, creator, content_hash)</code>.
            If valid, the content hash is permanently linked to the creator&apos;s Poseidon2 identity hash.
            No buildathon competitor uses this Leo primitive for content provenance.
          </p>
        </div>

        <Button
          variant="accent"
          className="w-full rounded-xl"
          disabled={!connected || submitting || !creatorAddress || !contentHash || !signature}
          onClick={handleVerify}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying Signature...
            </>
          ) : !connected ? (
            'Connect Wallet'
          ) : (
            <>
              <BadgeCheck className="w-4 h-4" />
              Verify Authorship
            </>
          )}
        </Button>

        {txId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-emerald-400 font-medium">Authorship verified and recorded!</p>
              <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ─── Prove Identity Form ────────────────────────────────────────────────────
function ProveIdentityForm() {
  const { address, connected, execute } = useContractExecute()
  const [challenge, setChallenge] = useState('')
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)

  const generateChallenge = useCallback(() => {
    // Generate a random field-like value for challenge
    const random = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) * BigInt(7919)
    setChallenge(`${random}field`)
  }, [])

  const handleProve = useCallback(async () => {
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!challenge || !signature) {
      toast.error('Both challenge and signature are required')
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
        'prove_identity',
        [challenge, signature],
        FEES.REGISTER,
        IDENTITY_PROGRAM
      )
      if (result) {
        setTxId(result)
        toast.success('Identity proved on-chain!')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      if (msg.includes('assert')) {
        toast.error('Signature does not match your wallet address')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }, [connected, challenge, signature, execute])

  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <Fingerprint className="w-4 h-4 text-blue-400" />
        Prove Identity
      </h3>
      <p className="text-xs text-white/60 mb-5">
        Prove you control an Aleo address by signing a challenge. Creates a privacy-preserving
        identity proof chain (only Poseidon2 hash stored).
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Challenge (field)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder="Random challenge field value"
              className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
            />
            <Button variant="ghost" size="sm" onClick={generateChallenge} className="rounded-xl shrink-0">
              Generate
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">
            Signature (sign the challenge with your Aleo private key)
          </label>
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="sign1..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all resize-none font-mono"
          />
        </div>

        <Button
          variant="accent"
          className="w-full rounded-xl !bg-blue-600 hover:!bg-blue-500"
          disabled={!connected || submitting || !challenge || !signature}
          onClick={handleProve}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Proving Identity...
            </>
          ) : !connected ? (
            'Connect Wallet'
          ) : (
            <>
              <Fingerprint className="w-4 h-4" />
              Prove Identity
            </>
          )}
        </Button>

        {txId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-emerald-400 font-medium">Identity proved!</p>
              <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ─── Notarize Content Form ──────────────────────────────────────────────────
function NotarizeContentForm() {
  const { address, connected, execute } = useContractExecute()
  const [contentHash, setContentHash] = useState('')
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)

  const handleNotarize = useCallback(async () => {
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!contentHash || !signature) {
      toast.error('Both content hash and signature are required')
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
        'notarize_content',
        [contentHash, signature],
        FEES.REGISTER,
        IDENTITY_PROGRAM
      )
      if (result) {
        setTxId(result)
        toast.success('Content notarized with block height timestamp!')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      if (msg.includes('existing') || msg.includes('assert_eq')) {
        toast.error('This content has already been notarized (first-claim-wins)')
      } else if (msg.includes('assert')) {
        toast.error('Invalid signature for this content')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }, [connected, contentHash, signature, execute])

  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <Stamp className="w-4 h-4 text-emerald-400" />
        Notarize Content
      </h3>
      <p className="text-xs text-white/60 mb-5">
        Timestamp content on-chain with <code className="text-emerald-400">block.height</code>.
        First-claim-wins: once notarized, the timestamp cannot be overwritten.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Content Hash (field)</label>
          <input
            type="text"
            value={contentHash}
            onChange={(e) => setContentHash(e.target.value)}
            placeholder="Hash of your content (e.g. 12345field)"
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">
            Signature (sign the content hash with your private key)
          </label>
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="sign1..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none font-mono"
          />
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
          <Clock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-xs text-white/60 leading-relaxed">
            <strong className="text-emerald-300">First-claim-wins:</strong> The block height is recorded
            only if no timestamp exists for this content + creator combination. This proves your content
            existed before a certain point in time.
          </p>
        </div>

        <Button
          variant="accent"
          className="w-full rounded-xl !bg-emerald-600 hover:!bg-emerald-500"
          disabled={!connected || submitting || !contentHash || !signature}
          onClick={handleNotarize}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Notarizing...
            </>
          ) : !connected ? (
            'Connect Wallet'
          ) : (
            <>
              <Stamp className="w-4 h-4" />
              Notarize Content
            </>
          )}
        </Button>

        {txId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-emerald-400 font-medium">Content notarized!</p>
              <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ─── Lookup Verified Content ────────────────────────────────────────────────
function VerifiedContentLookup() {
  const [contentHash, setContentHash] = useState('')
  const [result, setResult] = useState<{
    verified: boolean | null
    author: string | null
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLookup = useCallback(async () => {
    if (!contentHash) return
    setLoading(true)
    try {
      const [verifiedStr, authorStr] = await Promise.all([
        queryMapping('verified_content', contentHash),
        queryMapping('content_author', contentHash),
      ])
      setResult({
        verified: verifiedStr === 'true',
        author: authorStr,
      })
    } catch {
      toast.error('Query failed')
    } finally {
      setLoading(false)
    }
  }, [contentHash])

  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <Search className="w-4 h-4 text-violet-400" />
        Lookup Verified Content
      </h3>
      <p className="text-xs text-white/60 mb-4">
        Check if content has been verified on-chain and who authored it (no wallet needed).
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={contentHash}
          onChange={(e) => setContentHash(e.target.value)}
          placeholder="content_hash (field)"
          className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
        />
        <Button
          variant="secondary"
          onClick={handleLookup}
          disabled={loading || !contentHash}
          className="rounded-xl"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Query'}
        </Button>
      </div>

      {result && (
        <div className="grid grid-cols-1 gap-3">
          <div className="p-4 rounded-xl bg-black/30 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              {result.verified ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Verified</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-white/50" />
                  <span className="text-sm font-semibold text-white/60">Not Found</span>
                </>
              )}
            </div>
            {result.author && (
              <div>
                <p className="text-xs text-white/60 mb-0.5">Author (Poseidon2 hash)</p>
                <p className="text-xs text-white/70 font-mono break-all">{result.author}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  )
}

// ─── Batch Verify Section ───────────────────────────────────────────────────
function BatchVerifyInfo() {
  return (
    <GlassCard className="!p-6">
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <Layers className="w-4 h-4 text-amber-400" />
        Batch Authorship Verification
      </h3>
      <p className="text-xs text-white/60 mb-4">
        Verify two content hashes in a single atomic transaction via <code className="text-amber-400">verify_authorship_batch</code>.
      </p>

      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-border/30">
          <p className="text-xs text-white/60 leading-relaxed">
            <strong className="text-white/80">Use case:</strong> Multi-part content (e.g., article + supporting data)
            where both parts must be provably authored by the same creator.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.02] border border-border/30">
          <p className="text-xs text-white/60 leading-relaxed">
            <strong className="text-white/80">Parameters:</strong> creator address, content_hash_1, content_hash_2,
            sig_1, sig_2. Both signatures are verified atomically.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.02] border border-border/30">
          <p className="text-xs text-white/60 leading-relaxed">
            <strong className="text-white/80">On-chain:</strong> Both content hashes are recorded in
            <code className="text-amber-300 ml-1">verified_content</code> and
            <code className="text-amber-300 ml-1">content_author</code> mappings.
          </p>
        </div>
      </div>
    </GlassCard>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function IdentityPage() {
  const [tab, setTab] = useState<'authorship' | 'identity' | 'notarize'>('authorship')

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
                <Fingerprint className="w-4 h-4" aria-hidden="true" />
                Identity
              </Badge>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
              style={LETTER_SPACING_STYLE}
            >
              Content Signatures & Timestamps
            </h1>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Signature-verified content authorship, identity proofs, and on-chain
              notarization. No competitor uses Leo&apos;s <code className="text-violet-400">signature::verify</code> primitive.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400">
                <PenTool className="w-3 h-3" aria-hidden="true" />
                signature::verify
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <Clock className="w-3 h-3" aria-hidden="true" />
                block.height timestamps
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <Fingerprint className="w-3 h-3" aria-hidden="true" />
                Identity proofs
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* Tab Switcher + Content */}
      <section className="py-12 sm:py-20">
        <Container>
          <div className="max-w-3xl mx-auto">
            {/* Tabs */}
            <ScrollReveal>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-border/50 mb-8">
                <button
                  onClick={() => setTab('authorship')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    tab === 'authorship'
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  <FileSignature className="w-4 h-4" />
                  <span className="hidden sm:inline">Authorship</span>
                  <span className="sm:hidden">Verify</span>
                </button>
                <button
                  onClick={() => setTab('identity')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    tab === 'identity'
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  <Fingerprint className="w-4 h-4" />
                  Identity
                </button>
                <button
                  onClick={() => setTab('notarize')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    tab === 'notarize'
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  <Stamp className="w-4 h-4" />
                  Notarize
                </button>
              </div>
            </ScrollReveal>

            {/* Tab content */}
            <ScrollReveal delay={0.1}>
              <div className="space-y-6">
                {tab === 'authorship' && (
                  <>
                    <VerifyAuthorshipForm />
                    <VerifiedContentLookup />
                    <BatchVerifyInfo />
                  </>
                )}
                {tab === 'identity' && <ProveIdentityForm />}
                {tab === 'notarize' && <NotarizeContentForm />}
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Technical Details */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-2xl sm:text-3xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Transitions & Mappings
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="max-w-3xl mx-auto">
              <GlassCard hover={false} className="!p-0 overflow-hidden">
                <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-white/50">
                  <div className="col-span-4">Transition</div>
                  <div className="col-span-5">Purpose</div>
                  <div className="col-span-3">Novel Primitive</div>
                </div>
                {[
                  { name: 'verify_authorship', purpose: 'Verify Aleo Schnorr signature on content hash', primitive: 'signature::verify' },
                  { name: 'prove_identity', purpose: 'Prove address control via signed challenge', primitive: 'sig.verify + BHP256' },
                  { name: 'notarize_content', purpose: 'First-claim timestamp with block.height', primitive: 'block.height' },
                  { name: 'verify_authorship_batch', purpose: 'Atomic verification of 2 content hashes', primitive: '2x signature::verify' },
                ].map((t, i) => (
                  <div
                    key={t.name}
                    className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-3 ${
                      i < 3 ? 'border-b border-border/30' : ''
                    } hover:bg-white/[0.02] transition-colors`}
                  >
                    <div className="sm:col-span-4">
                      <code className="text-xs font-mono text-violet-400">{t.name}</code>
                    </div>
                    <div className="sm:col-span-5">
                      <p className="text-xs text-white/55">{t.purpose}</p>
                    </div>
                    <div className="sm:col-span-3">
                      <code className="text-xs font-mono text-amber-400">{t.primitive}</code>
                    </div>
                  </div>
                ))}
              </GlassCard>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="max-w-3xl mx-auto mt-6">
              <GlassCard hover={false} className="!p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-white/50">
                  Mappings (6 total)
                </div>
                {[
                  { name: 'verified_content', type: 'field => bool', desc: 'Content signature verified' },
                  { name: 'content_author', type: 'field => field', desc: 'Content hash to creator hash' },
                  { name: 'identity_proofs', type: 'field => field', desc: 'Identity to proof hash' },
                  { name: 'content_timestamps', type: 'field => u32', desc: 'Notarization block height' },
                  { name: 'eth_identity_linked', type: 'field => bool', desc: 'ETH identity linked (future)' },
                  { name: 'eth_to_aleo_identity', type: 'field => field', desc: 'ETH to Aleo mapping (future)' },
                ].map((m, i) => (
                  <div
                    key={m.name}
                    className={`flex items-center gap-4 px-5 py-2.5 ${
                      i < 5 ? 'border-b border-border/30' : ''
                    } hover:bg-white/[0.02] transition-colors`}
                  >
                    <code className="text-xs font-mono text-blue-400 w-44 shrink-0">{m.name}</code>
                    <code className="text-xs font-mono text-white/60 w-28 shrink-0">{m.type}</code>
                    <p className="text-xs text-white/50">{m.desc}</p>
                  </div>
                ))}
              </GlassCard>
            </div>
          </ScrollReveal>

          {/* Program badge */}
          <ScrollReveal delay={0.2}>
            <div className="flex items-center justify-center gap-2 mt-8">
              <code className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-border/50 text-xs text-white/50 font-mono">
                {IDENTITY_PROGRAM}
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
