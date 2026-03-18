'use client'

import { useState, useEffect, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  Store,
  Shield,
  Star,
  Gavel,
  Clock,
  Lock,
  Copy,
  Check,
  Hash,
  EyeOff,
  ArrowRight,
  Users,
  Award,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  TrendingUp,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import ScrollReveal from '@/components/ScrollReveal'
import Badge from '@/components/ui/Badge'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import AddressAvatar from '@/components/ui/AddressAvatar'
import { shortenAddress, formatCredits } from '@/lib/utils'
import { FEATURED_CREATORS } from '@/lib/config'

// ─── Static styles ──────────────────────────────────────────────────────────
const HERO_GLOW_STYLE = {
  background:
    'radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, rgba(139,92,246,0.02) 40%, transparent 70%)',
} as const

const LETTER_SPACING_STYLE = { letterSpacing: '-0.03em' } as const

// ─── Types ──────────────────────────────────────────────────────────────────

type ReputationTier = 'bronze' | 'silver' | 'gold' | 'diamond'
type AuctionStatus = 'open' | 'closed' | 'resolved'

interface CreatorReputation {
  address: string
  displayName: string
  category: string
  reputationTier: ReputationTier
  rating: number
  reviewCount: number
  subscriberCount: number
  bio: string
}

interface Auction {
  id: number
  title: string
  creator: string
  creatorName: string
  bidCount: number
  status: AuctionStatus
  blocksRemaining: number
  totalBlocks: number
  floorPrice: number
}

// ─── Demo data ──────────────────────────────────────────────────────────────

const REPUTATION_TIERS: Record<ReputationTier, { label: string; color: string; icon: typeof Star }> =
  {
    bronze: { label: 'Bronze', color: 'amber', icon: Award },
    silver: { label: 'Silver', color: 'zinc', icon: Award },
    gold: { label: 'Gold', color: 'yellow', icon: Star },
    diamond: { label: 'Diamond', color: 'violet', icon: Sparkles },
  }

const DEMO_CREATORS: CreatorReputation[] = [
  {
    address: FEATURED_CREATORS[0]?.address ?? 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk',
    displayName: FEATURED_CREATORS[0]?.label ?? 'Prateek (VeilSub Creator)',
    category: 'Developer',
    reputationTier: 'diamond',
    rating: 4.9,
    reviewCount: 47,
    subscriberCount: 128,
    bio: 'Building the private access layer for the creator economy. Full-featured privacy toolkit for creators.',
  },
  {
    address: FEATURED_CREATORS[1]?.address ?? 'aleo1yr9ls3d48sh0gkk8y4re9assy7rkfhp4g8x2jmd5vqxl0phdvyqq4qmhef',
    displayName: FEATURED_CREATORS[1]?.label ?? 'ZK Research Lab',
    category: 'Writer',
    reputationTier: 'gold',
    rating: 4.7,
    reviewCount: 31,
    subscriberCount: 89,
    bio: 'Exclusive research on privacy technology and decentralized finance patterns.',
  },
  {
    address: FEATURED_CREATORS[2]?.address ?? 'aleo1k7a5cx9t3wwej6v4h0mr2dgn8ys4pd3qx7lfk4zhrs6ep2wvc5psg9nxzm',
    displayName: FEATURED_CREATORS[2]?.label ?? 'Leo Dev Academy',
    category: 'Educator',
    reputationTier: 'gold',
    rating: 4.8,
    reviewCount: 52,
    subscriberCount: 204,
    bio: 'Step-by-step Leo tutorials, contract auditing guides, and Aleo development workshops.',
  },
  {
    address: 'aleo106ygg5lkjxzqpdq4wuqs4fm70x8k4f5zhpc09v94446skhyxfgxq7l69jv',
    displayName: 'Privacy Visuals',
    category: 'Artist',
    reputationTier: 'silver',
    rating: 4.3,
    reviewCount: 18,
    subscriberCount: 45,
    bio: 'Generative art exploring privacy concepts. Each piece is gated behind private access verification.',
  },
  {
    address: 'aleo1kurx4vfrjy6u69lglu2amvk2k3apyh7g7axpfvvqcvasfln33gqqy5rv2e',
    displayName: 'Aleo News Daily',
    category: 'Journalist',
    reputationTier: 'bronze',
    rating: 4.1,
    reviewCount: 12,
    subscriberCount: 33,
    bio: 'Daily coverage of the Aleo ecosystem, protocol updates, and privacy tech advancements.',
  },
  {
    address: 'aleo1zk0000000000000000000000000000000000000000000000000000demo',
    displayName: 'ZK Signals',
    category: 'Content Creator',
    reputationTier: 'silver',
    rating: 4.5,
    reviewCount: 22,
    subscriberCount: 67,
    bio: 'Trading signals and market analysis with privacy-first distribution. All positions sealed.',
  },
]

const DEMO_AUCTIONS: Auction[] = [
  {
    id: 1,
    title: 'Exclusive ZK Circuit Design Guide',
    creator: 'aleo1hp9...epyx',
    creatorName: 'Prateek',
    bidCount: 12,
    status: 'open',
    blocksRemaining: 14400,
    totalBlocks: 28800,
    floorPrice: 5_000_000,
  },
  {
    id: 2,
    title: '1-on-1 Leo Smart Contract Audit',
    creator: 'aleo1k7a...nxzm',
    creatorName: 'Leo Dev Academy',
    bidCount: 8,
    status: 'open',
    blocksRemaining: 21600,
    totalBlocks: 28800,
    floorPrice: 15_000_000,
  },
  {
    id: 3,
    title: 'Generative Art NFT Collection Access',
    creator: 'aleo106y...69jv',
    creatorName: 'Privacy Visuals',
    bidCount: 5,
    status: 'open',
    blocksRemaining: 7200,
    totalBlocks: 28800,
    floorPrice: 3_000_000,
  },
  {
    id: 4,
    title: 'Early Access: Aleo DeFi Research Report',
    creator: 'aleo1yr9...mhef',
    creatorName: 'ZK Research Lab',
    bidCount: 19,
    status: 'closed',
    blocksRemaining: 0,
    totalBlocks: 28800,
    floorPrice: 10_000_000,
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

function generateSalt(): string {
  const arr = new Uint32Array(4)
  crypto.getRandomValues(arr)
  return Array.from(arr, (v) => v.toString(16).padStart(8, '0')).join('')
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`w-3 h-3 ${i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`}
      aria-hidden="true"
    />
  ))
}

// ─── How Reputation Works ───────────────────────────────────────────────────

const REPUTATION_STEPS = [
  {
    step: 1,
    title: 'Aggregate Ratings',
    description:
      'Subscribers rate creators privately. Individual ratings are hidden; only the overall score is visible.',
    icon: Star,
    color: 'amber',
  },
  {
    step: 2,
    title: 'Threshold Proofs',
    description:
      'Creators prove they meet a subscriber threshold -- without revealing the exact count.',
    icon: Shield,
    color: 'violet',
  },
  {
    step: 3,
    title: 'Reputation Tiers',
    description:
      'Tiers (Bronze/Silver/Gold/Diamond) are assigned by verified blockchain proofs. No manual curation or gaming.',
    icon: Award,
    color: 'emerald',
  },
]

// ─── Creator Card ───────────────────────────────────────────────────────────

function CreatorReputationCard({ creator }: { creator: CreatorReputation }) {
  const tier = REPUTATION_TIERS[creator.reputationTier]
  const TierIcon = tier.icon

  return (
    <Link
      href={`/creator/${creator.address}`}
      className="group block rounded-2xl bg-surface-1/40 backdrop-blur-sm border border-border/75 hover:border-violet-500/20 hover:bg-surface-1/60 hover:shadow-[0_8px_32px_-8px_rgba(139,92,246,0.12)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
    >
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start gap-3.5 mb-3">
          <AddressAvatar
            address={creator.address}
            size={48}
            className="ring-2 ring-white/[0.04] group-hover:ring-violet-500/20 transition-all"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-white font-semibold text-sm truncate">{creator.displayName}</p>
              <span
                className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-${tier.color}-500/15 border border-${tier.color}-500/20`}
              >
                <TierIcon className={`w-2.5 h-2.5 text-${tier.color}-400`} aria-hidden="true" />
                <span
                  className={`text-[9px] text-${tier.color}-400 font-semibold uppercase tracking-wider`}
                >
                  {tier.label}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-white/40 font-mono truncate">
              {shortenAddress(creator.address)}
            </p>
          </div>
        </div>

        {/* Category + Bio */}
        <div className="mb-3.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border bg-violet-500/15 text-violet-300 border-violet-500/25 mb-2">
            {creator.category}
          </span>
          <p className="text-xs text-white/55 leading-relaxed line-clamp-2">{creator.bio}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3.5">
          <div className="flex items-center gap-0.5" aria-label={`Rating: ${creator.rating} out of 5`}>
            {renderStars(creator.rating)}
          </div>
          <span className="text-xs text-white/60 font-medium">{creator.rating}</span>
          <span className="text-xs text-white/35">({creator.reviewCount} reviews)</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-border/50 text-[11px] text-white/60">
            <Users className="w-3 h-3 text-violet-400/80" aria-hidden="true" />
            {creator.subscriberCount} subscribers
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/[0.06] border border-emerald-500/15 text-[10px] font-medium text-emerald-300/80">
            <Shield className="w-2.5 h-2.5" aria-hidden="true" />
            Verified
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/30">
          <span className="text-[11px] text-white/35">Reputation verified on-chain</span>
          <span className="text-[11px] text-white/40 group-hover:text-violet-300 flex items-center gap-1 transition-colors duration-200">
            View Profile
            <ArrowRight
              className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Auction Card ───────────────────────────────────────────────────────────

function AuctionCard({
  auction,
  onBid,
}: {
  auction: Auction
  onBid: (id: number) => void
}) {
  const isOpen = auction.status === 'open'
  const progressPct =
    auction.totalBlocks > 0
      ? Math.round(
          ((auction.totalBlocks - auction.blocksRemaining) / auction.totalBlocks) * 100
        )
      : 100

  return (
    <div className="rounded-2xl bg-surface-1/40 backdrop-blur-sm border border-border/75 hover:border-violet-500/20 transition-all duration-300 overflow-hidden">
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  isOpen
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/[0.06] text-white/50 border border-border/50'
                }`}
              >
                {isOpen && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {auction.status}
              </span>
            </div>
            <h3 className="text-white font-semibold text-sm leading-snug">{auction.title}</h3>
          </div>
          <Gavel className="w-5 h-5 text-violet-400/50 shrink-0" aria-hidden="true" />
        </div>

        {/* Creator + Bid info */}
        <div className="flex items-center gap-4 mb-4 text-xs text-white/50">
          <span>by {auction.creatorName}</span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" aria-hidden="true" />
            {auction.bidCount} bid{auction.bidCount !== 1 ? 's' : ''}
          </span>
          <span>Floor: {formatCredits(auction.floorPrice)} ALEO</span>
        </div>

        {/* Time + Progress */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            {isOpen ? (
              <>
                <Clock className="w-3 h-3" aria-hidden="true" />
                <span>{blocksToTime(auction.blocksRemaining)} remaining</span>
              </>
            ) : (
              <span className="text-white/50">Auction ended</span>
            )}
          </div>
          <div className="w-20 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full ${isOpen ? 'bg-violet-500/50' : 'bg-white/20'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        {isOpen && (
          <button
            onClick={() => onBid(auction.id)}
            className="w-full py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/25 text-xs font-medium text-violet-300 hover:bg-violet-500/25 hover:text-violet-200 transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            <Lock className="w-3 h-3" aria-hidden="true" />
            Place Sealed Bid
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Bid Modal ──────────────────────────────────────────────────────────────

function BidModal({
  auctionId,
  auctions,
  onClose,
}: {
  auctionId: number | null
  auctions: Auction[]
  onClose: () => void
}) {
  const [bidAmount, setBidAmount] = useState('')
  const [salt, setSalt] = useState(() => generateSalt())
  const [saltCopied, setSaltCopied] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleCopySalt = useCallback(() => {
    navigator.clipboard.writeText(salt)
    setSaltCopied(true)
    setTimeout(() => setSaltCopied(false), 2000)
  }, [salt])

  const handleSubmit = useCallback(() => {
    if (typeof window !== 'undefined' && auctionId !== null) {
      localStorage.setItem(
        `veilsub_bid_salt_${auctionId}`,
        JSON.stringify({ amount: bidAmount, salt })
      )
    }
    setSubmitted(true)
  }, [auctionId, bidAmount, salt])

  const auction = auctions.find((a) => a.id === auctionId)

  if (auctionId === null) return null

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
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg rounded-2xl bg-surface-1 border border-border/75 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {submitted ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Bid Sealed</h3>
              <p className="text-sm text-white/60 mb-6">
                Your bid has been sealed. The amount is hidden until the reveal phase.
              </p>
              <div className="p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/15 mb-6">
                <p className="text-xs text-violet-300/80 font-mono break-all">
                  Sealed bid: {bidAmount || '0'} ALEO, code: {salt.slice(0, 16)}...
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
                  <Gavel className="w-4 h-4 text-violet-400" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-white">Place Sealed Bid</h3>
                </div>
                {auction && (
                  <p className="text-xs text-white/50">{auction.title}</p>
                )}
              </div>

              <div className="p-5 space-y-5">
                {/* Amount */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2 block">
                    Bid Amount (ALEO)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={
                      auction ? `Floor: ${formatCredits(auction.floorPrice)} ALEO` : '0.00'
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border/50 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/30 transition-colors font-mono"
                  />
                </div>

                {/* Salt */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2 block">
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
                  </div>
                </div>

                {/* Privacy notice */}
                <div className="p-3 rounded-xl bg-violet-500/[0.05] border border-violet-500/15">
                  <div className="flex items-start gap-2">
                    <EyeOff className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-xs text-violet-300/80 leading-relaxed">
                      Your bid is sealed -- nobody sees the amount until the reveal phase.
                      Only an encrypted version of your bid is stored on-chain.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-border/50 flex items-center justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!bidAmount || parseFloat(bidAmount) <= 0}
                  className="rounded-full"
                >
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  Seal Bid
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

export default function MarketplacePage() {
  const [bidModalAuction, setBidModalAuction] = useState<number | null>(null)
  const [creatorFilter, setCreatorFilter] = useState<ReputationTier | 'all'>('all')

  const filteredCreators =
    creatorFilter === 'all'
      ? DEMO_CREATORS
      : DEMO_CREATORS.filter((c) => c.reputationTier === creatorFilter)

  const activeAuctions = DEMO_AUCTIONS.filter((a) => a.status === 'open')
  const closedAuctions = DEMO_AUCTIONS.filter((a) => a.status !== 'open')

  return (
    <PageTransition className="min-h-screen">
      {/* ── BETA Banner ──────────────────────────────────────────────────── */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-center">
        <p className="text-sm text-amber-300 font-medium">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mr-2">Beta</span>
          Creator reputation and auctions are in beta. Data shown is for demonstration.
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
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <div className="flex justify-center mb-8">
              <Badge variant="accent">
                <Store className="w-4 h-4" aria-hidden="true" />
                Creator Marketplace
              </Badge>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-serif italic text-white mb-6"
              style={LETTER_SPACING_STYLE}
            >
              Creator Marketplace
            </h1>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Discover creators by reputation. Bid on premium content. All ratings are
              privacy-preserving -- individual reviews are never visible.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {DEMO_CREATORS.length} verified creators
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400">
                <Gavel className="w-3 h-3" aria-hidden="true" />
                {activeAuctions.length} active auction{activeAuctions.length !== 1 ? 's' : ''}
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <Shield className="w-3 h-3" aria-hidden="true" />
                Privacy-preserving ratings
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* ── Creator Reputation Grid ──────────────────────────────────────── */}
      <section className="py-12 sm:py-20">
        <Container>
          <ScrollReveal>
            <div className="flex items-start sm:items-center justify-between mb-8 flex-col sm:flex-row gap-4">
              <div>
                <h2
                  className="text-3xl sm:text-4xl font-serif italic text-white mb-2"
                  style={LETTER_SPACING_STYLE}
                >
                  Creator Reputation
                </h2>
                <p className="text-white/50 text-sm">
                  Reputation tiers verified privately on the blockchain.
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Filter chips */}
          <ScrollReveal delay={0.05}>
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <button
                onClick={() => setCreatorFilter('all')}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  creatorFilter === 'all'
                    ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                    : 'bg-white/[0.03] text-white/50 border border-transparent hover:bg-white/[0.06] hover:text-white/70'
                }`}
              >
                All Tiers
              </button>
              {(Object.keys(REPUTATION_TIERS) as ReputationTier[]).map((tier) => {
                const t = REPUTATION_TIERS[tier]
                return (
                  <button
                    key={tier}
                    onClick={() => setCreatorFilter(tier)}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                      creatorFilter === tier
                        ? `bg-${t.color}-500/20 text-${t.color}-200 border border-${t.color}-500/30`
                        : 'bg-white/[0.03] text-white/50 border border-transparent hover:bg-white/[0.06] hover:text-white/70'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </ScrollReveal>

          {/* Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCreators.map((creator, i) => (
              <ScrollReveal key={creator.address} delay={i * 0.05}>
                <CreatorReputationCard creator={creator} />
              </ScrollReveal>
            ))}
          </div>

          {filteredCreators.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-8 h-8 text-white/20 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-white/40">No creators found for this tier.</p>
            </div>
          )}
        </Container>
      </section>

      {/* ── Active Auctions ──────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2
                  className="text-3xl sm:text-4xl font-serif italic text-white mb-2"
                  style={LETTER_SPACING_STYLE}
                >
                  Sealed-Bid Auctions
                </h2>
                <p className="text-white/50 text-sm">
                  Bid on premium content. Bids are sealed until the reveal phase.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/15">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-xs text-emerald-400 font-medium">
                  {activeAuctions.length} live
                </span>
              </div>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_AUCTIONS.map((auction, i) => (
              <ScrollReveal key={auction.id} delay={i * 0.06}>
                <AuctionCard
                  auction={auction}
                  onBid={(id) => setBidModalAuction(id)}
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
                    Marketplace contract deploying soon
                  </p>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Auctions above demonstrate the UI for the upcoming{' '}
                    <code className="px-1 py-0.5 rounded bg-white/[0.06] text-amber-300 text-[10px] font-mono">
                      veilsub_marketplace.aleo
                    </code>{' '}
                    program. Sealed bids will use the same privacy technology as the governance
                    voting system -- nobody sees other bids.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── How Reputation Works ─────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 border-t border-border/50">
        <Container>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-serif italic text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                How Reputation Works
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                Private ratings, public trust. Individual reviews are combined mathematically
                without revealing any single rating.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-3xl mx-auto grid gap-4 sm:grid-cols-3">
            {REPUTATION_STEPS.map((step, i) => {
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
                    <p className="text-xs text-white/55 leading-relaxed">{step.description}</p>
                  </GlassCard>
                </ScrollReveal>
              )
            })}
          </div>

          {/* Technical detail */}
          <ScrollReveal delay={0.3}>
            <div className="max-w-3xl mx-auto mt-8 p-5 rounded-2xl bg-violet-500/[0.06] border border-violet-500/15">
              <div className="flex items-start gap-3">
                <Hash className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-violet-300 mb-1">
                    Privacy-Preserving Ratings
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Each review is encrypted with a hidden counter so that ratings can be
                    added together on-chain to produce an overall score, without anyone being
                    able to see any individual rating. Your specific review remains permanently
                    private -- only the combined result is visible.
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
                className="text-3xl sm:text-4xl font-serif italic text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Join the Marketplace
              </h2>
              <p className="text-white/60 mb-8">
                Build your reputation privately. Discover creators by trust, not by identity.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/explore">
                  <Button variant="accent" size="lg" className="rounded-full shadow-accent-lg">
                    Explore Creators
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/governance">
                  <Button variant="secondary" size="lg" className="rounded-full">
                    Governance
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── Bid Modal ────────────────────────────────────────────────────── */}
      <BidModal
        auctionId={bidModalAuction}
        auctions={DEMO_AUCTIONS}
        onClose={() => setBidModalAuction(null)}
      />
    </PageTransition>
  )
}
