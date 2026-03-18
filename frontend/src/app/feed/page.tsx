'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { m } from 'framer-motion'
import { spring } from '@/lib/motion'
import Link from 'next/link'
import {
  AlertCircle,
  Rss,
  Lock,
  Unlock,
  Star,
  MessageSquare,
  Crown,
  ArrowRight,
  Compass,
  Wallet,
  RefreshCw,
  Image as ImageIcon,
  Video,
  BookOpen,
  SlidersHorizontal,
  ChevronDown,
  Search,
  X,
} from 'lucide-react'
import Fuse from 'fuse.js'
import dynamic from 'next/dynamic'
const RichContentRenderer = dynamic(() => import('@/components/RichContentRenderer'), { ssr: false })
const VideoEmbed = dynamic(() => import('@/components/VideoEmbed'), { ssr: false })
import PageTransition from '@/components/PageTransition'
import { useWalletRecords } from '@/hooks/useWalletRecords'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useContentFeed } from '@/hooks/useContentFeed'
import { parseAccessPass, shortenAddress, estimateReadingTime } from '@/lib/utils'
import { FEATURED_CREATORS, CREATOR_CUSTOM_TIERS } from '@/lib/config'
import type { AccessPass, ContentPost } from '@/types'

// ─── Constants ───

const HERO_GLOW_STYLE = {
  background:
    'radial-gradient(ellipse at center, rgba(139,92,246,0.05) 0%, transparent 70%)',
} as const

const LETTER_SPACING_STYLE = { letterSpacing: '-0.03em' } as const

const POSTS_PER_PAGE = 10

const tierConfig: Record<number, { name: string; icon: typeof Star; color: string; border: string; bg: string; text: string; lockBg: string }> = {
  1: {
    name: 'Supporter',
    icon: Star,
    color: 'green',
    border: 'border-green-500/20',
    bg: 'bg-green-500/5',
    text: 'text-green-300',
    lockBg: 'bg-green-500/10',
  },
  2: {
    name: 'Premium',
    icon: MessageSquare,
    color: 'blue',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
    text: 'text-blue-300',
    lockBg: 'bg-blue-500/10',
  },
  3: {
    name: 'VIP',
    icon: Crown,
    color: 'violet',
    border: 'border-violet-500/20',
    bg: 'bg-violet-500/5',
    text: 'text-violet-300',
    lockBg: 'bg-violet-500/10',
  },
}

// ─── Helpers ───

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diff = now - then
  if (diff < 0) return 'just now'
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function getCreatorLabel(address: string): string {
  const featured = FEATURED_CREATORS.find((c) => c.address === address)
  if (featured) return featured.label
  return shortenAddress(address)
}

function getCreatorCategory(address: string): string | undefined {
  const featured = FEATURED_CREATORS.find((c) => c.address === address)
  return featured?.category
}

function getTierName(creator: string, tierId: number): string {
  const tiers = CREATOR_CUSTOM_TIERS[creator]
  if (tiers && tiers[tierId]) return tiers[tierId].name
  if (tierId === 1) return 'Supporter'
  if (tierId === 2) return 'Premium'
  if (tierId === 3) return 'VIP'
  return `Tier ${tierId}`
}

/**
 * Strip HTML tags using regex only -- no DOM required, safe for SSR.
 * This is used for preview text extraction and reading time estimation only.
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Types ───

interface FeedPost extends ContentPost {
  creatorAddress: string
  creatorLabel: string
  creatorCategory?: string
}

// ─── Skeleton ───

function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/[0.05] bg-[#0A0A0F] p-6 animate-pulse"
        >
          {/* Creator row */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-full bg-white/[0.05]" />
            <div className="flex-1">
              <div className="h-3.5 rounded bg-white/[0.06] w-32 mb-1.5" />
              <div className="h-2.5 rounded bg-white/[0.04] w-20" />
            </div>
            <div className="w-16 h-5 rounded-full bg-white/[0.05]" />
          </div>
          {/* Title */}
          <div className="h-5 rounded bg-white/[0.06] w-3/4 mb-3" />
          {/* Body lines */}
          <div className="space-y-2 mb-4">
            <div className="h-3 rounded bg-white/[0.04] w-full" />
            <div className="h-3 rounded bg-white/[0.04] w-5/6" />
            <div className="h-3 rounded bg-white/[0.04] w-2/3" />
          </div>
          {/* Footer */}
          <div className="flex items-center gap-4">
            <div className="h-2.5 rounded bg-white/[0.04] w-16" />
            <div className="h-2.5 rounded bg-white/[0.04] w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Feed Post Card ───

function FeedPostCard({
  post,
  hasAccess,
  index,
}: {
  post: FeedPost
  hasAccess: boolean
  index: number
}) {
  const tier = tierConfig[post.minTier] || tierConfig[1]
  const tierName = getTierName(post.creatorAddress, post.minTier)
  const unlocked = hasAccess && post.body != null

  // Preview text: use post.preview, or strip HTML from body, or show placeholder
  const previewText = useMemo(() => {
    if (post.preview) return post.preview
    if (post.body) {
      const plain = stripHtmlTags(post.body)
      return plain.length > 150 ? plain.slice(0, 150) + '...' : plain
    }
    return null
  }, [post.preview, post.body])

  // Reading time from body text
  const readingTime = useMemo(() => {
    if (post.body) {
      return estimateReadingTime(post.body)
    }
    return null
  }, [post.body])

  return (
    <m.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: Math.min(index * 0.05, 0.3) }}
      className="rounded-2xl border border-white/[0.06] bg-[#0A0A0F] overflow-hidden hover:border-white/[0.1] transition-colors duration-200"
    >
      <div className="p-6">
        {/* Creator attribution */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-medium text-violet-300">
              {post.creatorLabel.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/creator/${post.creatorAddress}`}
              className="text-sm font-medium text-white hover:text-violet-300 transition-colors truncate block"
            >
              {post.creatorLabel}
            </Link>
            <div className="flex items-center gap-2 text-xs text-white/40">
              {post.creatorCategory && (
                <span>{post.creatorCategory}</span>
              )}
              {post.creatorCategory && post.createdAt && (
                <span aria-hidden="true">·</span>
              )}
              {post.createdAt && (
                <span>{timeAgo(post.createdAt)}</span>
              )}
            </div>
          </div>
          {/* Tier badge */}
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border shrink-0 ${
              unlocked
                ? `${tier.text} ${tier.lockBg} ${tier.border}`
                : 'text-white/50 bg-white/[0.04] border-white/[0.08]'
            }`}
          >
            {tierName}
          </span>
        </div>

        {/* Title */}
        <h2 className={`text-lg font-semibold mb-3 leading-snug ${unlocked ? 'text-white' : 'text-white/80'}`}>
          {post.title}
        </h2>

        {/* Unlocked image */}
        {unlocked && post.imageUrl && (
          <div className="mb-4 rounded-xl overflow-hidden border border-white/[0.06] aspect-video bg-white/[0.02]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt={`Image for ${post.title}`}
              className="w-full h-full object-cover content-unlocked"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Gated image placeholder */}
        {!unlocked && post.hasImage && (
          <div className="mb-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center h-24">
            <div className="flex items-center gap-2 text-white/40">
              <ImageIcon className="w-4 h-4" aria-hidden="true" />
              <span className="text-xs">Image -- AccessPass required</span>
            </div>
          </div>
        )}

        {/* Unlocked video */}
        {unlocked && post.videoUrl && (
          <div className="mb-4 content-unlocked">
            <VideoEmbed url={post.videoUrl} title={post.title} />
          </div>
        )}

        {/* Gated video placeholder */}
        {!unlocked && post.hasVideo && (
          <div className="mb-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center h-24">
            <div className="flex items-center gap-2 text-white/40">
              <Video className="w-4 h-4" aria-hidden="true" />
              <span className="text-xs">Video -- AccessPass required</span>
            </div>
          </div>
        )}

        {/* Content body / preview */}
        {unlocked && post.body ? (
          <div className="content-unlocked">
            <RichContentRenderer html={post.body} />
          </div>
        ) : (
          <div className="relative min-h-[80px]">
            {/* Blurred preview */}
            {previewText ? (
              <div className="content-locked">
                <p className="text-sm text-white/70 leading-relaxed">
                  {previewText}
                </p>
              </div>
            ) : (
              <div className="content-locked">
                <div className="space-y-2">
                  <div className="h-3 rounded bg-white/[0.06] w-full" />
                  <div className="h-3 rounded bg-white/[0.05] w-[85%]" />
                  <div className="h-3 rounded bg-white/[0.04] w-[60%]" />
                </div>
              </div>
            )}
            {/* Unlock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/80 to-transparent rounded-lg">
              <Lock className={`w-5 h-5 ${tier.text} mb-2`} aria-hidden="true" />
              <Link
                href={`/creator/${post.creatorAddress}`}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${tier.lockBg} ${tier.text} border ${tier.border} hover:brightness-125`}
              >
                Subscribe to unlock
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}

        {/* Footer: reading time + meta */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/[0.04]">
          {readingTime && (
            <span className="flex items-center gap-1 text-xs text-white/40">
              <BookOpen className="w-3 h-3" aria-hidden="true" />
              {readingTime}
            </span>
          )}
          {unlocked && (
            <span className="flex items-center gap-1 text-xs text-green-400/70">
              <Unlock className="w-3 h-3" aria-hidden="true" />
              Unlocked
            </span>
          )}
          {post.updatedAt && (
            <span className="text-xs text-white/30 ml-auto">edited</span>
          )}
        </div>
      </div>
    </m.article>
  )
}

// ─── Main Feed Page ───

type SortOrder = 'newest' | 'oldest'

export default function FeedPage() {
  const { connected } = useWallet()
  const { getAccessPasses } = useWalletRecords()
  const { blockHeight } = useBlockHeight()
  const { getPostsForCreator } = useContentFeed()

  const [passes, setPasses] = useState<AccessPass[]>([])
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [feedSearchQuery, setFeedSearchQuery] = useState('')
  const sortRef = useRef<HTMLDivElement>(null)
  const feedSearchRef = useRef<HTMLInputElement>(null)

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!showSortMenu) return
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSortMenu])

  // Fetch access passes from wallet
  const fetchPasses = useCallback(async () => {
    if (!connected) {
      setPasses([])
      return
    }
    try {
      const rawPasses = await getAccessPasses()
      const parsed: AccessPass[] = []
      for (const raw of rawPasses) {
        const pass = parseAccessPass(raw)
        if (pass) parsed.push(pass)
      }
      setPasses(parsed)
    } catch {
      setPasses([])
    }
  }, [connected, getAccessPasses])

  useEffect(() => {
    fetchPasses()
  }, [connected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter active passes (not expired)
  const activePasses = useMemo(() => {
    if (blockHeight == null) return passes
    return passes.filter(p => p.expiresAt === 0 || p.expiresAt > blockHeight)
  }, [passes, blockHeight])

  // Get unique creator addresses the user is subscribed to
  const subscribedCreators = useMemo(() => {
    const set = new Set<string>()
    for (const pass of activePasses) {
      set.add(pass.creator)
    }
    return Array.from(set)
  }, [activePasses])

  // Build a lookup: creator address -> highest tier the user has
  const creatorTierMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const pass of activePasses) {
      const current = map[pass.creator] || 0
      if (pass.tier > current) {
        map[pass.creator] = pass.tier
      }
    }
    return map
  }, [activePasses])

  // Fetch posts from all subscribed creators
  const fetchFeed = useCallback(async () => {
    if (subscribedCreators.length === 0) {
      setFeedPosts([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const allPosts: FeedPost[] = []

      // Fetch posts from all creators in parallel
      const results = await Promise.allSettled(
        subscribedCreators.map(async (creator) => {
          const posts = await getPostsForCreator(creator)
          return posts.map((post): FeedPost => ({
            ...post,
            creatorAddress: creator,
            creatorLabel: getCreatorLabel(creator),
            creatorCategory: getCreatorCategory(creator),
          }))
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allPosts.push(...result.value)
        }
      }

      setFeedPosts(allPosts)
    } catch {
      setError('Failed to load feed. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [subscribedCreators, getPostsForCreator])

  useEffect(() => {
    if (connected && subscribedCreators.length > 0) {
      fetchFeed()
    } else if (connected && passes.length > 0 && subscribedCreators.length === 0) {
      // All passes expired
      setFeedPosts([])
      setLoading(false)
    } else if (connected) {
      setLoading(false)
    }
  }, [connected, subscribedCreators.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fuse.js instance for feed search
  const feedFuse = useMemo(() => {
    return new Fuse(feedPosts, {
      keys: ['title', 'body', 'preview', 'creatorLabel'],
      threshold: 0.4,
      ignoreLocation: true,
    })
  }, [feedPosts])

  // Apply filters, search, and sort
  const filteredPosts = useMemo(() => {
    let result = feedPosts

    // Apply search
    if (feedSearchQuery.trim()) {
      result = feedFuse.search(feedSearchQuery.trim()).map(r => r.item)
    }

    // Filter by selected creator
    if (selectedCreator) {
      result = result.filter(p => p.creatorAddress === selectedCreator)
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB
    })

    return sorted
  }, [feedPosts, feedFuse, feedSearchQuery, selectedCreator, sortOrder])

  const visiblePosts = filteredPosts.slice(0, visibleCount)
  const hasMore = visibleCount < filteredPosts.length

  // Unique creators in the feed (for filter chips)
  const feedCreators = useMemo(() => {
    const map = new Map<string, string>()
    for (const post of feedPosts) {
      if (!map.has(post.creatorAddress)) {
        map.set(post.creatorAddress, post.creatorLabel)
      }
    }
    return Array.from(map.entries())
  }, [feedPosts])

  return (
    <PageTransition>
      <main className="min-h-screen bg-background py-12 sm:py-16 relative">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
          style={HERO_GLOW_STYLE}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1
                  className="text-3xl sm:text-4xl font-serif italic text-white mb-2"
                  style={LETTER_SPACING_STYLE}
                >
                  My Feed
                </h1>
                <p className="text-white/60 text-sm leading-relaxed">
                  Content from creators you support
                </p>
              </div>
              {connected && feedPosts.length > 0 && (
                <button
                  onClick={() => {
                    setVisibleCount(POSTS_PER_PAGE)
                    fetchFeed()
                  }}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.06] border border-border text-white/70 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  Refresh
                </button>
              )}
            </div>
          </div>

          {/* Not connected */}
          {!connected && (
            <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0F] p-12 text-center">
              <Wallet className="w-12 h-12 text-white/20 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-lg font-medium text-white mb-2">
                Connect your wallet to see your personal feed
              </h2>
              <p className="text-sm text-white/50 max-w-md mx-auto">
                Your feed shows exclusive content from creators you support. Connect an Aleo wallet to get started.
              </p>
            </div>
          )}

          {/* Loading */}
          {connected && loading && feedPosts.length === 0 && (
            <FeedSkeleton />
          )}

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-500/15 bg-red-500/[0.04] border-l-[3px] border-l-red-400/60 p-5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400/80 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white mb-1">Couldn&apos;t load your feed</p>
                  <p className="text-xs text-white/60 leading-relaxed">{error}</p>
                  <button
                    onClick={() => { setError(null); fetchFeed() }}
                    className="mt-3 px-3.5 py-1.5 rounded-lg bg-white/[0.08] border border-white/[0.1] text-xs font-medium text-white hover:bg-white/[0.12] transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty state: connected but no subscriptions */}
          {connected && !loading && subscribedCreators.length === 0 && !error && (
            <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0F] p-12 text-center">
              <Rss className="w-12 h-12 text-white/20 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-lg font-medium text-white mb-2">
                Your feed is empty
              </h2>
              <p className="text-sm text-white/50 max-w-md mx-auto mb-6">
                Find creators worth supporting. Once you subscribe, their exclusive posts will show up here.
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                Explore Creators
              </Link>
            </div>
          )}

          {/* Empty state: subscribed but no posts */}
          {connected && !loading && subscribedCreators.length > 0 && feedPosts.length === 0 && !error && (
            <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0F] p-12 text-center">
              <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-lg font-medium text-white mb-2">
                Your creators haven&apos;t posted yet
              </h2>
              <p className="text-sm text-white/50 max-w-md mx-auto">
                Check back soon -- once they publish exclusive content, it will appear right here.
              </p>
            </div>
          )}

          {/* Feed content */}
          {connected && feedPosts.length > 0 && (
            <>
              {/* Search bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" aria-hidden="true" />
                <input
                  ref={feedSearchRef}
                  type="text"
                  value={feedSearchQuery}
                  onChange={(e) => setFeedSearchQuery(e.target.value)}
                  placeholder="Search your feed..."
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-400/50 transition-all text-sm"
                />
                {feedSearchQuery && (
                  <button
                    onClick={() => { setFeedSearchQuery(''); feedSearchRef.current?.focus() }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter bar */}
              <div className="mb-6 flex items-center gap-3 flex-wrap">
                {/* Creator filter chips */}
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  <button
                    onClick={() => setSelectedCreator(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedCreator === null
                        ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
                    }`}
                  >
                    All
                  </button>
                  {feedCreators.map(([address, label]) => (
                    <button
                      key={address}
                      onClick={() => setSelectedCreator(selectedCreator === address ? null : address)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all truncate max-w-[160px] ${
                        selectedCreator === address
                          ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                          : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
                      }`}
                      title={label}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Sort dropdown */}
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                  >
                    <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
                    {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                    <ChevronDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-white/[0.08] bg-[#12121A] shadow-xl min-w-[120px] overflow-hidden">
                      <button
                        onClick={() => { setSortOrder('newest'); setShowSortMenu(false) }}
                        className={`block w-full text-left px-4 py-2.5 text-xs transition-colors ${
                          sortOrder === 'newest' ? 'text-violet-300 bg-violet-500/10' : 'text-white/60 hover:bg-white/[0.04]'
                        }`}
                      >
                        Newest first
                      </button>
                      <button
                        onClick={() => { setSortOrder('oldest'); setShowSortMenu(false) }}
                        className={`block w-full text-left px-4 py-2.5 text-xs transition-colors ${
                          sortOrder === 'oldest' ? 'text-violet-300 bg-violet-500/10' : 'text-white/60 hover:bg-white/[0.04]'
                        }`}
                      >
                        Oldest first
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Post count / no results */}
              {filteredPosts.length === 0 && feedSearchQuery.trim() ? (
                <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0F] p-8 text-center mb-6">
                  <Search className="w-8 h-8 text-white/20 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-sm text-white/50">No results for &ldquo;{feedSearchQuery}&rdquo;</p>
                </div>
              ) : (
                <p className="text-xs text-white/30 mb-4">
                  {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
                  {selectedCreator ? ` from ${getCreatorLabel(selectedCreator)}` : ''}
                  {feedSearchQuery.trim() ? ` matching "${feedSearchQuery}"` : ''}
                </p>
              )}

              {/* Posts list */}
              <div className="space-y-5">
                {visiblePosts.map((post, i) => {
                  const highestTier = creatorTierMap[post.creatorAddress] || 0
                  const hasAccess = highestTier >= post.minTier
                  return (
                    <FeedPostCard
                      key={post.id}
                      post={post}
                      hasAccess={hasAccess}
                      index={i}
                    />
                  )
                })}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + POSTS_PER_PAGE)}
                    className="px-6 py-3 rounded-lg bg-white/[0.06] border border-border text-white/70 text-sm font-medium hover:bg-white/10 transition-all"
                  >
                    Load more ({filteredPosts.length - visibleCount} remaining)
                  </button>
                </div>
              )}

              {/* Privacy notice */}
              <div className="mt-8 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                <div className="flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-white/50 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-white/40 leading-relaxed">
                    Gated content is server-protected. Post bodies are only delivered after AccessPass verification. Your subscription data never leaves your wallet.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </PageTransition>
  )
}
