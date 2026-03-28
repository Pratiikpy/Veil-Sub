'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { spring } from '@/lib/motion'
import {
  Star,
  Sparkles,
  Trophy,
  Dice5,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Hash,
  Shield,
  Users,
  BarChart3,
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
const EXTRAS_PROGRAM = 'veilsub_extras_v2.aleo'

// ─── Star Rating Component ─────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const [hover, setHover] = useState(0)
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value)
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            className={`transition-all duration-150 ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'
            } focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none rounded`}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              className={`${sizeClass} transition-colors duration-150 ${
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-white/40'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
  )
}

// ─── Helper: query on-chain mapping ─────────────────────────────────────────
async function queryMapping(mapping: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/aleo/program/${encodeURIComponent(EXTRAS_PROGRAM)}/mapping/${encodeURIComponent(mapping)}/${encodeURIComponent(key)}`
    )
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text === 'null' || text === '""') return null
    return text.replace(/"/g, '')
  } catch {
    return null
  }
}

// ─── Reviews Section ────────────────────────────────────────────────────────
function ReviewsSection() {
  const { address, connected, execute } = useContractExecute()
  const [creatorHash, setCreatorHash] = useState('')
  const [rating, setRating] = useState(0)
  const [reviewContent, setReviewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const reviewSubmittingRef = useRef(false)

  // On-chain stats
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [reviewCount, setReviewCount] = useState<number | null>(null)
  const [ratingSum, setRatingSum] = useState<number | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    if (!creatorHash) {
      setAvgRating(null)
      setReviewCount(null)
      setRatingSum(null)
      return
    }
    setStatsLoading(true)
    try {
      const [avgStr, countStr, sumStr] = await Promise.all([
        queryMapping('creator_avg_rating', creatorHash),
        queryMapping('creator_review_count', creatorHash),
        queryMapping('creator_rating_sum', creatorHash),
      ])
      setAvgRating(avgStr ? parseInt(avgStr.replace(/u\d+$/, '').trim(), 10) : null)
      setReviewCount(countStr ? parseInt(countStr.replace(/u\d+$/, '').trim(), 10) : null)
      setRatingSum(sumStr ? parseInt(sumStr.replace(/u\d+$/, '').trim(), 10) : null)
    } catch {
      // stats fetch failed silently
    } finally {
      setStatsLoading(false)
    }
  }, [creatorHash])

  // Auto-fetch stats when creator hash changes (debounced)
  useEffect(() => {
    if (!creatorHash) return
    const timer = setTimeout(fetchStats, 500)
    return () => clearTimeout(timer)
  }, [creatorHash, fetchStats])

  const handleSubmit = useCallback(async () => {
    if (reviewSubmittingRef.current) return
    if (!connected || !address) {
      toast.error('Connect your wallet to submit a review')
      return
    }
    if (!creatorHash) {
      toast.error('Enter the creator hash to review')
      return
    }
    if (rating < 1 || rating > 5) {
      toast.error('Select a rating between 1 and 5 stars')
      return
    }

    reviewSubmittingRef.current = true
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
            reviewSubmittingRef.current = false
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      // review_content_hash: simple hash of content for demo (use 0field if empty)
      const contentHash = reviewContent.trim()
        ? `${BigInt(reviewContent.length) * BigInt(31337)}field`
        : '0field'

      const result = await execute(
        'submit_review',
        [creatorHash, `${rating}u8`, contentHash],
        FEES.REGISTER, // 150k microcredits
        EXTRAS_PROGRAM
      )
      if (result) {
        setTxId(result)
        toast.success('Review submitted! Confirming on-chain (~15-30s). Check AleoScan to verify.', { duration: 8000 })
        // Refresh stats after finalize completes
        setTimeout(fetchStats, 15000)
        setTimeout(fetchStats, 30000)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      if (msg.includes('already_reviewed') || msg.includes('assert')) {
        toast.error('You have already reviewed this creator (nullifier consumed)')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
      reviewSubmittingRef.current = false
    }
  }, [connected, address, creatorHash, rating, reviewContent, execute, fetchStats])

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-white/50 font-medium">On-Chain Stats</p>
        {creatorHash && (
          <button
            onClick={fetchStats}
            disabled={statsLoading}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white/60 transition-colors disabled:opacity-40"
          >
            <BarChart3 className={`w-3 h-3 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="!p-4 text-center">
          {statsLoading ? (
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
          ) : (
            <div className="flex items-center justify-center gap-1 mb-1">
              {avgRating !== null ? (
                <>
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span className="text-2xl font-bold text-white">{avgRating}</span>
                </>
              ) : (
                <span className="text-2xl font-bold text-white/60">--</span>
              )}
            </div>
          )}
          <p className="text-xs text-white/50">Avg Rating</p>
        </GlassCard>

        <GlassCard className="!p-4 text-center">
          {statsLoading ? (
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
          ) : (
            <p className="text-2xl font-bold text-white mb-1">
              {reviewCount !== null ? reviewCount : '--'}
            </p>
          )}
          <p className="text-xs text-white/50">Reviews</p>
        </GlassCard>

        <GlassCard className="!p-4 text-center">
          {statsLoading ? (
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
          ) : (
            <p className="text-2xl font-bold text-white mb-1">
              {ratingSum !== null && reviewCount ? (ratingSum / reviewCount).toFixed(1) : '--'}
            </p>
          )}
          <p className="text-xs text-white/50">Precise Avg</p>
        </GlassCard>
      </div>

      {/* Submit review form */}
      <GlassCard className="!p-6">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-violet-400" />
          Submit Anonymous Review
        </h3>

        <div className="space-y-4">
          {/* Creator hash input */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Creator Hash (field)</label>
            <input
              type="text"
              value={creatorHash}
              onChange={(e) => setCreatorHash(e.target.value)}
              placeholder="123456789field"
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
          </div>

          {/* Star rating */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Your Rating</label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          {/* Optional comment */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Comment (optional, hashed on-chain)</label>
            <textarea
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              placeholder="Great content, learned a lot about ZK proofs..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all resize-none"
            />
          </div>

          {/* Privacy notice */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/15">
            <Shield className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <p className="text-xs text-white/60 leading-relaxed">
              Your identity is protected by a Poseidon2 nullifier. Only the rating value appears on-chain.
              The nullifier prevents double-reviewing without revealing who you are.
            </p>
          </div>

          {/* Submit button */}
          <Button
            variant="accent"
            className="w-full rounded-xl"
            disabled={!connected || submitting || rating === 0 || !creatorHash}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating ZK Proof...
              </>
            ) : !connected ? (
              'Connect Wallet to Review'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Review ({(FEES.REGISTER / 1_000_000).toFixed(2)} credits)
              </>
            )}
          </Button>

          {/* Transaction result */}
          {txId && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-amber-400 font-medium">Review submitted -- verify on AleoScan</p>
                <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
                <p className="text-[11px] text-white/40 mt-1">Shield Wallet uses delegated proving. Check AleoScan to verify final status.</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  )
}

// ─── Lottery Section ────────────────────────────────────────────────────────
function LotterySection() {
  const { address, connected, execute } = useContractExecute()
  const [subscriberCount, setSubscriberCount] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [drawTxId, setDrawTxId] = useState<string | null>(null)
  const drawingRef = useRef(false)

  // On-chain lottery state
  const [currentRound, setCurrentRound] = useState<number | null>(null)
  const [roundLoading, setRoundLoading] = useState(true)

  const fetchRound = useCallback(() => {
    setRoundLoading(true)
    queryMapping('lottery_round', '0u8')
      .then((val) => {
        if (val) {
          setCurrentRound(parseInt(val.replace(/u\d+$/, '').trim(), 10))
        } else {
          setCurrentRound(0)
        }
      })
      .finally(() => setRoundLoading(false))
  }, [])

  // Fetch current round on mount and after draw (with delay for finalize)
  useEffect(() => {
    fetchRound()
    if (drawTxId) {
      const timer = setTimeout(fetchRound, 15000)
      return () => clearTimeout(timer)
    }
  }, [drawTxId, fetchRound])

  const handleDraw = useCallback(async () => {
    if (drawingRef.current) return
    if (!connected || !address) {
      toast.error('Connect your wallet to draw')
      return
    }
    const count = parseInt(subscriberCount, 10)
    if (!count || count <= 0) {
      toast.error('Enter a valid subscriber count (> 0)')
      return
    }

    drawingRef.current = true
    setDrawing(true)
    setDrawTxId(null)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < FEES.REGISTER) {
            toast.error(`Insufficient public balance. You need ~${(FEES.REGISTER / 1_000_000).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setDrawing(false)
            drawingRef.current = false
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      const result = await execute(
        'draw_lottery',
        [`${count}u64`],
        FEES.REGISTER, // 150k microcredits
        EXTRAS_PROGRAM
      )
      if (result) {
        setDrawTxId(result)
        toast.success('Lottery draw submitted! Confirming on-chain (~15-30s). Check AleoScan to verify.', { duration: 8000 })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      toast.error(msg)
    } finally {
      setDrawing(false)
      drawingRef.current = false
    }
  }, [connected, address, subscriberCount, execute])

  return (
    <div className="space-y-6">
      {/* Round counter */}
      <GlassCard className="!p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-white/50">Global Round</p>
              {roundLoading ? (
                <Skeleton className="h-6 w-16 mt-0.5" />
              ) : (
                <p className="text-lg font-bold text-white">
                  #{currentRound ?? 0}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-white/50">Randomness</p>
              <p className="text-xs text-emerald-400 font-mono">ChaCha::rand_u64()</p>
            </div>
            <button
              onClick={fetchRound}
              disabled={roundLoading}
              className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/70 transition-all disabled:opacity-40"
              title="Refresh round counter"
            >
              <BarChart3 className={`w-3.5 h-3.5 ${roundLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Draw form */}
      <GlassCard className="!p-6">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Dice5 className="w-4 h-4 text-amber-400" />
          Draw Random Winner
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">
              Number of Subscribers in Pool
            </label>
            <input
              type="number"
              min="1"
              value={subscriberCount}
              onChange={(e) => setSubscriberCount(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/50 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
          </div>

          {/* How it works */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-border/30 space-y-2">
            <p className="text-xs text-white/60 leading-relaxed">
              <strong className="text-amber-300">How it works:</strong> The Aleo validators produce entropy
              via ChaCha20 CSPRNG. The winner index = <code className="text-amber-300">rand_u64() % subscriber_count</code>.
              Neither you nor anyone else can predict or manipulate the outcome.
            </p>
            <p className="text-xs text-white/60">
              Each draw increments the global round counter and stores the winner index permanently on-chain.
            </p>
          </div>

          {/* Draw button */}
          <Button
            variant="accent"
            className="w-full rounded-xl !bg-amber-600 hover:!bg-amber-500"
            disabled={!connected || drawing || !subscriberCount}
            onClick={handleDraw}
          >
            {drawing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Drawing Winner...
              </>
            ) : !connected ? (
              'Connect Wallet to Draw'
            ) : (
              <>
                <Dice5 className="w-4 h-4" />
                Draw Winner ({(FEES.REGISTER / 1_000_000).toFixed(2)} credits)
              </>
            )}
          </Button>

          {/* Result */}
          {drawTxId && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-amber-400 font-medium">Lottery draw submitted -- verify on AleoScan</p>
                <p className="text-xs text-white/60 font-mono truncate">{drawTxId}</p>
                <p className="text-[11px] text-white/40 mt-1">Shield Wallet uses delegated proving. Check AleoScan to verify final status.</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function ExtrasPage() {
  const [tab, setTab] = useState<'reviews' | 'lottery'>('reviews')

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
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Extras
              </Badge>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
              style={LETTER_SPACING_STYLE}
            >
              Reviews & Lottery
            </h1>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Anonymous creator reviews with Poseidon2 nullifiers and provably fair
              lottery draws powered by ChaCha on-chain randomness.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                <Hash className="w-3 h-3" aria-hidden="true" />
                Poseidon2 nullifiers
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400">
                <Dice5 className="w-3 h-3" aria-hidden="true" />
                ChaCha::rand_u64()
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <Shield className="w-3 h-3" aria-hidden="true" />
                Zero identity leaks
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* Tab Switcher + Content */}
      <section className="py-12 sm:py-20">
        <Container>
          <div className="max-w-2xl mx-auto">
            {/* Tabs */}
            <ScrollReveal>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-border/50 mb-8">
                <button
                  onClick={() => setTab('reviews')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    tab === 'reviews'
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  Anonymous Reviews
                </button>
                <button
                  onClick={() => setTab('lottery')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    tab === 'lottery'
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  On-Chain Lottery
                </button>
              </div>
            </ScrollReveal>

            {/* Tab content */}
            <ScrollReveal delay={0.1}>
              {tab === 'reviews' ? <ReviewsSection /> : <LotterySection />}
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
                How It Works
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <ScrollReveal>
              <GlassCard className="!p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-amber-400" />
                  <h3 className="text-white font-semibold text-sm">Anonymous Reviews</h3>
                </div>
                <div className="space-y-3 text-xs text-white/60 leading-relaxed">
                  <p>
                    <strong className="text-white/80">Nullifier:</strong> Poseidon2(reviewer_hash + creator_hash + domain_sep).
                    Unique per (reviewer, creator) pair.
                  </p>
                  <p>
                    <strong className="text-white/80">Double-review prevention:</strong> Nullifier stored in mapping.
                    Second submission with same pair asserts false.
                  </p>
                  <p>
                    <strong className="text-white/80">Aggregate ratings:</strong> Sum, count, and integer average
                    computed on-chain. Individual ratings hidden.
                  </p>
                </div>
              </GlassCard>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <GlassCard className="!p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Dice5 className="w-5 h-5 text-amber-400" />
                  <h3 className="text-white font-semibold text-sm">On-Chain Lottery</h3>
                </div>
                <div className="space-y-3 text-xs text-white/60 leading-relaxed">
                  <p>
                    <strong className="text-white/80">ChaCha::rand_u64():</strong> CSPRNG seeded by validator
                    consensus. Unpredictable by caller.
                  </p>
                  <p>
                    <strong className="text-white/80">Winner selection:</strong> random_value % subscriber_count.
                    Modulo bias negligible for count &lt;&lt; 2^64.
                  </p>
                  <p>
                    <strong className="text-white/80">Round tracking:</strong> Global counter incremented per draw.
                    Results stored permanently on-chain.
                  </p>
                </div>
              </GlassCard>
            </ScrollReveal>
          </div>

          {/* Program badge */}
          <ScrollReveal delay={0.2}>
            <div className="flex items-center justify-center gap-2 mt-8">
              <code className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-border/50 text-xs text-white/50 font-mono">
                {EXTRAS_PROGRAM}
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
