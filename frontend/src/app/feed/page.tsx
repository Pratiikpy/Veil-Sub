'use client'

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { m, AnimatePresence } from 'framer-motion'
import { spring } from '@/lib/motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  Rss,
  Lock,
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
  Bookmark,
  MessageCircle,
  FileText,
  Heart,
  Share2,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import type FuseType from 'fuse.js'
import dynamic from 'next/dynamic'

// Lazy-load Fuse.js: deferred until first search to reduce initial bundle size.
// The module is cached after the first import so subsequent uses are synchronous.
let _FuseClass: typeof import('fuse.js').default | null = null
let _fuseLoadPromise: Promise<typeof import('fuse.js').default> | null = null
function getFuseClass(): typeof import('fuse.js').default | null {
  if (_FuseClass) return _FuseClass
  if (!_fuseLoadPromise) {
    _fuseLoadPromise = import('fuse.js').then(m => { _FuseClass = m.default; return m.default })
  }
  return null
}
const RichContentRenderer = dynamic(() => import('@/components/RichContentRenderer'), { ssr: false })
const VideoEmbed = dynamic(() => import('@/components/VideoEmbed'), { ssr: false })
const PostComments = dynamic(() => import('@/components/PostComments'), { ssr: false })
const SavedPosts = dynamic(() => import('@/components/SavedPosts'), { ssr: false })
const ImageLightbox = dynamic(() => import('@/components/ImageLightbox'), { ssr: false })
const ArticleReader = dynamic(() => import('@/components/ArticleReader'), { ssr: false })
const RecommendationsCard = dynamic(() => import('@/components/RecommendationsCard'), { ssr: false })
const SubscriberWelcome = dynamic(() => import('@/components/SubscriberWelcome'), { ssr: false })
import ProfileHoverCard from '@/components/ProfileHoverCard'
import PageTransition from '@/components/PageTransition'
import { useWalletRecords } from '@/hooks/useWalletRecords'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useContentFeed } from '@/hooks/useContentFeed'
import { useSupabase } from '@/hooks/useSupabase'
import { parseAccessPass, shortenAddress, estimateReadingTime, computeWalletHash } from '@/lib/utils'
import { FEATURED_CREATORS, CREATOR_CUSTOM_TIERS, DEFAULT_TIER_NAMES } from '@/lib/config'
import { getCachedCreator, cacheSingleCreator } from '@/lib/creatorCache'
import type { AccessPass, ContentPost } from '@/types'

// ─── Constants ───

import { HERO_GLOW_STYLE_SUBTLE as HERO_GLOW_STYLE, TITLE_STYLE as LETTER_SPACING_STYLE } from '@/lib/styles'

const POSTS_PER_PAGE = 10
const POST_EXPAND_LIMIT = 280

import { tierConfig } from '@/lib/tierConfig'

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
  const cached = getCachedCreator(address)
  if (cached?.display_name) return cached.display_name
  const featured = FEATURED_CREATORS.find((c) => c.address === address)
  if (featured) return featured.label
  return shortenAddress(address)
}

function getCreatorCategory(address: string): string | undefined {
  const cached = getCachedCreator(address)
  if (cached?.category) return cached.category
  const featured = FEATURED_CREATORS.find((c) => c.address === address)
  return featured?.category
}

function getTierName(creator: string, tierId: number): string {
  // Check localStorage first (most recent — written on tier creation)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`veilsub_creator_tiers_${creator}`)
      if (stored) {
        const localTiers = JSON.parse(stored) as Record<string, { name: string }>
        if (localTiers[String(tierId)]?.name) return localTiers[String(tierId)].name
      }
    } catch { /* ignore */ }
  }
  // Fallback to hardcoded config
  const tiers = CREATOR_CUSTOM_TIERS[creator]
  if (tiers && tiers[tierId]) return tiers[tierId].name
  return DEFAULT_TIER_NAMES[tierId] ?? `Tier ${tierId}`
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
  creatorImageUrl?: string | null
}

// ─── Skeleton ───

function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/[0.05] bg-surface-1 p-6 animate-pulse"
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

// ─── Feed Post Card (Features 1-5: engagement bar, expansion, smart click, grid layout) ───

const FeedPostCard = memo(function FeedPostCard({
  post,
  hasAccess,
  index,
  walletAddress,
  userTier,
}: {
  post: FeedPost
  hasAccess: boolean
  index: number
  walletAddress?: string | null
  userTier?: number | null
}) {
  const router = useRouter()
  const tier = tierConfig[post.minTier] || tierConfig[1]
  const tierName = getTierName(post.creatorAddress, post.minTier)
  const unlocked = hasAccess && post.body != null
  const [showComments, setShowComments] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null)
  const [showReader, setShowReader] = useState(false)
  const [bodyExpanded, setBodyExpanded] = useState(false)

  // Feature 1: Engagement bar state
  const [likeCount, setLikeCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const serverAvailableRef = useRef(true)

  // Fetch engagement counts from /api/social on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [reactionsRes, commentsRes] = await Promise.allSettled([
          fetch(`/api/social?type=reactions&contentId=${encodeURIComponent(post.id)}`),
          fetch(`/api/social?type=comments&contentId=${encodeURIComponent(post.id)}`),
        ])
        if (cancelled) return
        if (reactionsRes.status === 'fulfilled' && reactionsRes.value.ok) {
          const { counts } = await reactionsRes.value.json()
          if (counts?.heart > 0) setLikeCount(counts.heart)
        }
        if (commentsRes.status === 'fulfilled' && commentsRes.value.ok) {
          const { comments } = await commentsRes.value.json()
          if (comments?.length > 0) setCommentCount(comments.length)
        }
      } catch {
        serverAvailableRef.current = false
      }
    })()
    try {
      if (localStorage.getItem(`veilsub_liked_${post.id}`) === '1') setLiked(true)
    } catch { /* ignore */ }
    return () => { cancelled = true }
  }, [post.id])

  // Optimistic like toggle
  const handleLike = useCallback(async () => {
    const wasLiked = liked
    const prevCount = likeCount
    const delta = wasLiked ? -1 : 1

    setLiked(!wasLiked)
    setLikeCount(Math.max(0, likeCount + delta))
    try {
      if (wasLiked) localStorage.removeItem(`veilsub_liked_${post.id}`)
      else localStorage.setItem(`veilsub_liked_${post.id}`, '1')
    } catch { /* quota */ }

    if (serverAvailableRef.current) {
      try {
        let authFields: Record<string, unknown> = {}
        if (walletAddress) {
          try {
            const wh = await computeWalletHash(walletAddress)
            authFields = { walletAddress, walletHash: wh, timestamp: Date.now() }
          } catch { /* auth best-effort */ }
        }
        const res = await fetch('/api/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'reaction', contentId: post.id, reactionType: 'heart', delta, ...authFields }),
        })
        if (!res.ok) {
          setLiked(wasLiked)
          setLikeCount(prevCount)
          try {
            if (wasLiked) localStorage.setItem(`veilsub_liked_${post.id}`, '1')
            else localStorage.removeItem(`veilsub_liked_${post.id}`)
          } catch { /* quota */ }
        }
      } catch {
        setLiked(wasLiked)
        setLikeCount(prevCount)
        try {
          if (wasLiked) localStorage.setItem(`veilsub_liked_${post.id}`, '1')
          else localStorage.removeItem(`veilsub_liked_${post.id}`)
        } catch { /* quota */ }
        serverAvailableRef.current = false
      }
    }
  }, [liked, likeCount, post.id, walletAddress])

  // Share handler
  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/post/${post.id}?creator=${post.creatorAddress}`
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied to clipboard'),
      () => toast.error('Could not copy link')
    )
  }, [post.id, post.creatorAddress])

  // Feature 4: Smart click handling
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    if (target.closest('a, button, [role="button"], input, textarea')) return
    if (window.getSelection()?.toString()) return
    router.push(`/post/${post.id}?creator=${post.creatorAddress}`)
  }, [router, post.id, post.creatorAddress])

  // Preview text: use post.preview, or strip HTML from body, or show placeholder
  const previewText = useMemo(() => {
    if (post.preview) return post.preview
    if (post.body) {
      const plain = stripHtmlTags(post.body)
      return plain.length > 150 ? plain.slice(0, 150) + '...' : plain
    }
    return null
  }, [post.preview, post.body])

  // Feature 3: Plain text for inline expansion
  const plainBody = useMemo(() => {
    if (!post.body) return ''
    return stripHtmlTags(post.body)
  }, [post.body])
  const needsExpansion = plainBody.length > POST_EXPAND_LIMIT

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
      className="post-card-mobile rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden hover:border-white/[0.1] transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:outline-none"
      onClick={handleCardClick}
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleCardClick(e as unknown as React.MouseEvent) }}
      role="article"
    >
      <div className="p-5 sm:p-6">
        {/* Feature 5: Social media grid layout — [Avatar] [Content] */}
        <div className="grid grid-cols-[40px,1fr] gap-x-3">
          {/* Avatar column */}
          <Link href={`/creator/${post.creatorAddress}`} className="shrink-0" onClick={e => e.stopPropagation()}>
            {post.creatorImageUrl ? (
              <img
                src={post.creatorImageUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-white/10"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
              />
            ) : null}
            <div className={`w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center ${post.creatorImageUrl ? 'hidden' : ''}`}>
              <span className="text-sm font-medium text-white/70">
                {post.creatorLabel.charAt(0).toUpperCase()}
              </span>
            </div>
          </Link>

          {/* Content column */}
          <div className="min-w-0">
            {/* Name row: Name · category · time · tier badge */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <ProfileHoverCard address={post.creatorAddress}>
                <Link
                  href={`/creator/${post.creatorAddress}`}
                  className="text-sm font-semibold text-white hover:text-white/70 transition-colors truncate"
                  onClick={e => e.stopPropagation()}
                >
                  {post.creatorLabel}
                </Link>
              </ProfileHoverCard>
              {post.creatorCategory && (
                <>
                  <span className="text-white/50 text-xs" aria-hidden="true">&middot;</span>
                  <span className="text-xs text-white/50">{post.creatorCategory}</span>
                </>
              )}
              {post.createdAt && (
                <>
                  <span className="text-white/50 text-xs" aria-hidden="true">&middot;</span>
                  <span className="text-xs text-white/50">{timeAgo(post.createdAt)}</span>
                </>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ml-auto ${
                  unlocked
                    ? `${tier.text} ${tier.lockBg} ${tier.border}`
                    : 'text-white/50 bg-white/[0.04] border-white/[0.08]'
                }`}
              >
                {tierName}
              </span>
            </div>

            {/* Title */}
            <h2 className={`text-base font-semibold mb-2 leading-snug ${unlocked ? 'text-white' : 'text-white/80'}`}>
              {post.title}
            </h2>

            {/* Content body with Feature 3: inline expansion for long posts */}
            {unlocked && post.body ? (
              <div className="content-unlocked">
                {needsExpansion && !bodyExpanded ? (
                  <div>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {plainBody.slice(0, POST_EXPAND_LIMIT)}...
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setBodyExpanded(true) }}
                      className="mt-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Show more
                    </button>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <m.div
                      key="expanded-body"
                      initial={needsExpansion ? { opacity: 0 } : false}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <RichContentRenderer html={post.body} />
                      {needsExpansion && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setBodyExpanded(false) }}
                          className="mt-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Show less
                        </button>
                      )}
                      {post.body.length > 500 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowReader(true) }}
                          className="mt-3 flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                          Read in focus mode
                        </button>
                      )}
                    </m.div>
                  </AnimatePresence>
                )}
              </div>
            ) : (
              <div className="relative min-h-[80px]">
                {previewText ? (
                  <div className="content-locked">
                    <p className="text-sm text-white/70 leading-relaxed">{previewText}</p>
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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent rounded-lg">
                  <Lock className={`w-5 h-5 ${tier.text} mb-2`} aria-hidden="true" />
                  <Link
                    href={`/creator/${post.creatorAddress}`}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${tier.lockBg} ${tier.text} border ${tier.border} hover:brightness-125`}
                    onClick={e => e.stopPropagation()}
                  >
                    Subscribe to unlock
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}

            {/* Unlocked image — click to open lightbox */}
            {unlocked && post.imageUrl && (
              <div
                className="mt-3 rounded-xl overflow-hidden border border-white/[0.06] aspect-video bg-white/[0.02] cursor-zoom-in"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  const imgs = post.imageUrl!.includes(',')
                    ? post.imageUrl!.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : [post.imageUrl!]
                  setLightboxImages(imgs)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    const imgs = post.imageUrl!.includes(',')
                      ? post.imageUrl!.split(',').map((s: string) => s.trim()).filter(Boolean)
                      : [post.imageUrl!]
                    setLightboxImages(imgs)
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.imageUrl.includes(',') ? post.imageUrl.split(',')[0].trim() : post.imageUrl}
                  alt={`Image for ${post.title}`}
                  className="w-full h-full object-cover content-unlocked"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            )}

            {/* Gated image placeholder */}
            {!unlocked && post.hasImage && (
              <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center h-24">
                <div className="flex items-center gap-2 text-white/50">
                  <ImageIcon className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs">Image -- subscription required</span>
                </div>
              </div>
            )}

            {/* Unlocked video */}
            {unlocked && post.videoUrl && (
              <div className="mt-3 content-unlocked">
                <VideoEmbed url={post.videoUrl} title={post.title} />
              </div>
            )}

            {/* Gated video placeholder */}
            {!unlocked && post.hasVideo && (
              <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center h-24">
                <div className="flex items-center gap-2 text-white/50">
                  <Video className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs">Video -- subscription required</span>
                </div>
              </div>
            )}

            {/* Feature 1: Engagement bar */}
            <div className="mt-4 pt-3 border-t border-white/[0.04]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  {/* Comment */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowComments(!showComments) }}
                    className="group relative flex items-center gap-1.5 px-2.5 py-2.5 rounded-full text-white/50 hover:text-blue-400 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:outline-none"
                    aria-label="Toggle comments"
                  >
                    <span className="absolute inset-0 rounded-full group-hover:bg-blue-500/10 transition-colors duration-200" />
                    <MessageCircle className="w-[18px] h-[18px] relative" />
                    {commentCount > 0 && <span className="text-xs relative">{commentCount}</span>}
                  </button>

                  {/* Share */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShare() }}
                    className="group relative flex items-center gap-1.5 px-2.5 py-2.5 rounded-full text-white/50 hover:text-green-400 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-green-400/50 focus-visible:outline-none"
                    aria-label="Share post"
                  >
                    <span className="absolute inset-0 rounded-full group-hover:bg-green-500/10 transition-colors duration-200" />
                    <Share2 className="w-[18px] h-[18px] relative" />
                  </button>

                  {/* Like */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLike() }}
                    className={`group relative flex items-center gap-1.5 px-2.5 py-2.5 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-pink-400/50 focus-visible:outline-none ${liked ? 'text-rose-400' : 'text-white/50 hover:text-rose-400'}`}
                    aria-label={liked ? 'Unlike' : 'Like'}
                  >
                    <span className="absolute inset-0 rounded-full group-hover:bg-pink-500/10 transition-colors duration-200" />
                    <Heart className={`w-[18px] h-[18px] relative transition-transform duration-200 ${liked ? 'fill-current scale-110' : ''}`} />
                    {likeCount > 0 && <span className="text-xs relative">{likeCount}</span>}
                  </button>

                  {/* Tip */}
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/creator/${post.creatorAddress}`) }}
                    className="group relative flex items-center gap-1.5 px-2.5 py-2.5 rounded-full text-white/50 hover:text-amber-400 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none"
                    aria-label="Tip creator"
                  >
                    <span className="absolute inset-0 rounded-full group-hover:bg-amber-500/10 transition-colors duration-200" />
                    <Zap className="w-[18px] h-[18px] relative" />
                  </button>
                </div>

                {readingTime && (
                  <span className="flex items-center gap-1 text-[11px] text-white/60">
                    <BookOpen className="w-3 h-3" aria-hidden="true" />
                    {readingTime}
                  </span>
                )}
              </div>
            </div>

            {/* Collapsible comments with animation */}
            <AnimatePresence>
              {showComments && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <PostComments contentId={post.id} isSubscribed={hasAccess} walletAddress={walletAddress} userTier={userTier} creatorAddress={post.creatorAddress} />
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          onClose={() => setLightboxImages(null)}
        />
      )}

      {showReader && post.body && (
        <ArticleReader
          title={post.title}
          body={post.body}
          creator={{ name: post.creatorLabel, address: post.creatorAddress }}
          publishedAt={post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
          readingTime={readingTime || ''}
          onClose={() => setShowReader(false)}
        />
      )}
    </m.article>
  )
})

// ─── Main Feed Page ───

type SortOrder = 'newest' | 'oldest'
type ContentTypeFilter = 'all' | 'posts' | 'images' | 'articles'
type FeedTab = 'all' | 'subscribed' | 'free'

export default function FeedPage() {
  const { connected, address: publicKey, signMessage } = useWallet()
  const { getAccessPasses } = useWalletRecords()
  const { blockHeight } = useBlockHeight()
  const { getPostsForCreator, unlockPost } = useContentFeed()
  const { getCreatorProfile } = useSupabase()

  const [passes, setPasses] = useState<AccessPass[]>([])
  const [passesLoading, setPassesLoading] = useState(true)
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [feedSearchQuery, setFeedSearchQuery] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all')
  // Feature 2: Feed tabs (All | Subscribed | Free) stored in URL search params
  const searchParams = useSearchParams()
  const feedTabRouter = useRouter()
  const initialTab = (searchParams.get('tab') as FeedTab) || 'all'
  const [feedTab, setFeedTab] = useState<FeedTab>(initialTab)

  const handleFeedTabChange = useCallback((tab: FeedTab) => {
    setFeedTab(tab)
    const url = new URL(window.location.href)
    if (tab === 'all') url.searchParams.delete('tab')
    else url.searchParams.set('tab', tab)
    feedTabRouter.replace(url.pathname + url.search, { scroll: false })
  }, [feedTabRouter])

  const [discoveryPosts, setDiscoveryPosts] = useState<FeedPost[]>([])
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, { name?: string; imageUrl?: string | null }>>({})
  const creatorProfilesRef = useRef<Record<string, { name?: string; imageUrl?: string | null }>>({})
  creatorProfilesRef.current = creatorProfiles
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

  // Fetch access passes from wallet.
  // Use a ref for getAccessPasses to prevent effect re-cancellation from unstable
  // callback chain (decrypt → extractPlaintext → getAccessPasses reference changes).
  const getAccessPassesRef = useRef(getAccessPasses)
  getAccessPassesRef.current = getAccessPasses

  const fetchPasses = useCallback(async () => {
    if (!connected) {
      setPasses([])
      setPassesLoading(false)
      return
    }
    setPassesLoading(true)
    try {
      const rawPasses = await getAccessPassesRef.current()
      const parsed: AccessPass[] = []
      for (const raw of rawPasses) {
        const pass = parseAccessPass(raw)
        if (pass) parsed.push(pass)
      }
      setPasses(parsed)
      // Retry once if empty (wallet adapter initialization race)
      if (parsed.length === 0) {
        setTimeout(async () => {
          try {
            const retry = await getAccessPassesRef.current()
            const retryParsed: AccessPass[] = []
            for (const raw of retry) {
              const pass = parseAccessPass(raw)
              if (pass) retryParsed.push(pass)
            }
            if (retryParsed.length > 0) setPasses(retryParsed)
          } catch { /* retry failed silently */ }
        }, 2000)
      }
    } catch {
      setPasses([])
    } finally {
      setPassesLoading(false)
    }
  }, [connected])

  useEffect(() => {
    fetchPasses()
  }, [connected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear feed when wallet disconnects to prevent stale data across wallet switches
  useEffect(() => {
    if (!connected) {
      setFeedPosts([])
      setError(null)
    }
  }, [connected])

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

  // Fetch creator profiles from Supabase for subscribed creators (populates cache + local state)
  useEffect(() => {
    if (subscribedCreators.length === 0) return
    let cancelled = false
    ;(async () => {
      const profiles: Record<string, { name?: string; imageUrl?: string | null }> = {}
      await Promise.allSettled(
        subscribedCreators.map(async (address) => {
          // Check cache first
          const cached = getCachedCreator(address)
          if (cached?.image_url || cached?.display_name) {
            profiles[address] = { name: cached.display_name || undefined, imageUrl: cached.image_url }
            return
          }
          // Fetch from Supabase
          const profile = await getCreatorProfile(address)
          if (profile && !cancelled) {
            cacheSingleCreator({
              address,
              display_name: profile.display_name,
              bio: profile.bio,
              category: profile.category,
              image_url: profile.image_url,
              cover_url: profile.cover_url,
              creator_hash: profile.creator_hash,
            })
            profiles[address] = { name: profile.display_name || undefined, imageUrl: profile.image_url }
          }
        })
      )
      if (!cancelled) setCreatorProfiles(profiles)
    })()
    return () => { cancelled = true }
  }, [subscribedCreators, getCreatorProfile])

  // Stories row data: subscribed creators with labels + profile images
  const storiesCreators = useMemo(() => {
    return subscribedCreators.map(address => {
      const profile = creatorProfiles[address]
      const cached = getCachedCreator(address)
      return {
        address,
        name: profile?.name || cached?.display_name || getCreatorLabel(address),
        imageUrl: profile?.imageUrl || cached?.image_url || null,
      }
    })
  }, [subscribedCreators, creatorProfiles])

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
          const cached = getCachedCreator(creator)
          const profile = creatorProfilesRef.current[creator]
          return posts.map((post): FeedPost => ({
            ...post,
            creatorAddress: creator,
            creatorLabel: profile?.name || cached?.display_name || getCreatorLabel(creator),
            creatorCategory: getCreatorCategory(creator),
            creatorImageUrl: profile?.imageUrl || cached?.image_url || null,
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
    // Don't decide feed state until passes finish loading — otherwise the
    // "no subscriptions" empty state flashes before passes arrive.
    if (passesLoading) return
    if (connected && subscribedCreators.length > 0) {
      fetchFeed()
    } else if (connected && passes.length > 0 && subscribedCreators.length === 0) {
      // All passes expired
      setFeedPosts([])
      setLoading(false)
    } else if (connected) {
      setLoading(false)
    }
  }, [connected, passesLoading, subscribedCreators.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh feed every 60 seconds when tab is visible
  useEffect(() => {
    if (!connected || subscribedCreators.length === 0) return
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchFeed()
    }, 60000)
    return () => clearInterval(interval)
  }, [connected, subscribedCreators.length, fetchFeed])

  // Fetch public/free posts for discovery when user has no subscriptions
  useEffect(() => {
    if (!connected || subscribedCreators.length > 0) {
      setDiscoveryPosts([])
      return
    }
    let cancelled = false
    setDiscoveryLoading(true)
    const creators = FEATURED_CREATORS.map(c => c.address)
    Promise.allSettled(
      creators.map(async (creator) => {
        const posts = await getPostsForCreator(creator)
        const cached = getCachedCreator(creator)
        return posts
          .filter((p) => p.minTier === 0)
          .map((post): FeedPost => ({
            ...post,
            creatorAddress: creator,
            creatorLabel: cached?.display_name || getCreatorLabel(creator),
            creatorCategory: getCreatorCategory(creator),
            creatorImageUrl: cached?.image_url || null,
          }))
      })
    ).then((results) => {
      if (cancelled) return
      const all: FeedPost[] = []
      for (const r of results) {
        if (r.status === 'fulfilled') all.push(...r.value)
      }
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setDiscoveryPosts(all.slice(0, 20))
    }).catch(() => {}).finally(() => {
      if (!cancelled) setDiscoveryLoading(false)
    })
    return () => { cancelled = true }
  }, [connected, subscribedCreators.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Welcome sequence: check for pending welcome messages from subscribed creators
  useEffect(() => {
    if (!connected || !publicKey || subscribedCreators.length === 0) return
    ;(async () => {
      try {
        const walletHash = await computeWalletHash(publicKey)
        const timestamp = Date.now()
        subscribedCreators.forEach((creator) => {
          fetch(`/api/welcome-sequence?subscriber=${encodeURIComponent(publicKey)}&creator=${encodeURIComponent(creator)}&walletHash=${encodeURIComponent(walletHash)}&timestamp=${timestamp}`)
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
              if (data?.messages?.length) {
                data.messages.forEach((msg: { title: string; message: string }) => {
                  // Deliver as notification
                  fetch('/api/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      wallet: publicKey,
                      type: 'welcome_message',
                      title: msg.title,
                      message: msg.message,
                      walletAddress: publicKey,
                      walletHash,
                      timestamp: Date.now(),
                    }),
                  }).catch(() => { /* non-critical */ })
                })
              }
            })
            .catch(() => { /* non-critical */ })
        })
      } catch { /* non-critical */ }
    })()
  }, [connected, publicKey, subscribedCreators]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-unlock gated posts for subscribed creators.
  // Uses refs to keep signMessage current and avoid re-triggering on every render.
  const signMessageRef = useRef(signMessage)
  signMessageRef.current = signMessage
  const unlockRunningRef = useRef(false)
  const unlockedIdsRef = useRef(new Set<string>())

  useEffect(() => {
    if (!publicKey || feedPosts.length === 0 || activePasses.length === 0) return
    if (unlockRunningRef.current) return

    // Restore previously unlocked content from sessionStorage (avoids re-signing)
    let restoredAny = false
    for (const post of feedPosts) {
      if (post.body !== null || post.minTier === 0) continue
      try {
        const cached = sessionStorage.getItem(`veilsub:feed-unlock:${publicKey}:${post.id}`)
        if (cached) {
          const data = JSON.parse(cached)
          unlockedIdsRef.current.add(post.id)
          setFeedPosts((prev) =>
            prev.map((p) =>
              p.id === post.id
                ? { ...p, body: data.body, imageUrl: data.imageUrl || p.imageUrl, videoUrl: data.videoUrl || p.videoUrl }
                : p
            )
          )
          restoredAny = true
        }
      } catch { /* ignore corrupt cache */ }
    }
    if (restoredAny) return // Let restored state settle, next render will handle remaining

    // Find gated posts that the user has access to but haven't been unlocked yet
    const gatedPosts = feedPosts.filter((post) => {
      if (post.body !== null) return false // already has body
      if (post.minTier === 0) return false // free post
      if (unlockedIdsRef.current.has(post.id)) return false // already attempted
      const highestTier = creatorTierMap[post.creatorAddress] || 0
      return highestTier >= post.minTier
    })

    if (gatedPosts.length === 0) return

    unlockRunningRef.current = true

    ;(async () => {
      for (const post of gatedPosts) {
        if (unlockedIdsRef.current.has(post.id)) continue
        unlockedIdsRef.current.add(post.id)

        const creatorPasses = activePasses.filter(p => p.creator === post.creatorAddress)
        if (creatorPasses.length === 0) continue

        const currentSign = signMessageRef.current
        const wrappedSign = currentSign
          ? async (msg: Uint8Array) => {
              const result = await currentSign(msg)
              if (!result) throw new Error('Signing cancelled')
              return result
            }
          : null

        try {
          const result = await unlockPost(post.id, post.creatorAddress, publicKey, creatorPasses, wrappedSign)
          if (result) {
            // Cache in sessionStorage so navigation doesn't require re-signing
            try {
              sessionStorage.setItem(`veilsub:feed-unlock:${publicKey}:${post.id}`, JSON.stringify({
                body: result.body,
                imageUrl: result.imageUrl,
                videoUrl: result.videoUrl,
              }))
            } catch { /* storage full — non-critical */ }
            setFeedPosts((prev) =>
              prev.map((p) =>
                p.id === post.id
                  ? { ...p, body: result.body, imageUrl: result.imageUrl || p.imageUrl, videoUrl: result.videoUrl || p.videoUrl }
                  : p
              )
            )
          }
        } catch {
          // Non-critical — post stays locked, user can visit creator page
        }
      }
      unlockRunningRef.current = false
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedPosts.length, activePasses.length, publicKey])

  // Clear feed posts and reset unlock tracking when wallet changes
  useEffect(() => {
    setFeedPosts([])
    setLoading(true)
    unlockedIdsRef.current = new Set()
    unlockRunningRef.current = false
  }, [publicKey])

  // Lazy-loaded Fuse.js: trigger the dynamic import on first render,
  // and force a re-render once it arrives so the search index builds.
  const [fuseReady, setFuseReady] = useState(!!_FuseClass)
  useEffect(() => {
    if (_FuseClass) { setFuseReady(true); return }
    getFuseClass() // kicks off the import
    _fuseLoadPromise?.then(() => setFuseReady(true))
  }, [])

  // Fuse.js instance for feed search (only created after lazy load completes)
  const feedFuse = useMemo((): FuseType<FeedPost> | null => {
    const Fuse = _FuseClass
    if (!Fuse || !fuseReady) return null
    return new Fuse(feedPosts, {
      keys: ['title', 'body', 'preview', 'creatorLabel'],
      threshold: 0.4,
      ignoreLocation: true,
    })
  }, [feedPosts, fuseReady])

  // Apply filters, search, and sort (includes Feature 2: feed tabs)
  const filteredPosts = useMemo(() => {
    let result = feedPosts

    // Feature 2: Feed tab filter
    if (feedTab === 'subscribed') {
      const subSet = new Set(subscribedCreators)
      result = result.filter(p => subSet.has(p.creatorAddress))
    } else if (feedTab === 'free') {
      result = result.filter(p => p.minTier === 0)
    }

    // Apply search (Fuse may still be loading; fall back to basic substring match)
    if (feedSearchQuery.trim()) {
      if (feedFuse) {
        result = feedFuse.search(feedSearchQuery.trim()).map(r => r.item)
      } else {
        const q = feedSearchQuery.trim().toLowerCase()
        result = result.filter(p =>
          p.title?.toLowerCase().includes(q) ||
          p.body?.toLowerCase().includes(q) ||
          p.preview?.toLowerCase().includes(q) ||
          p.creatorLabel?.toLowerCase().includes(q)
        )
      }
    }

    // Filter by selected creator
    if (selectedCreator) {
      result = result.filter(p => p.creatorAddress === selectedCreator)
    }

    // Filter by content type
    if (contentTypeFilter !== 'all') {
      result = result.filter(p => {
        if (contentTypeFilter === 'images') return !!p.imageUrl
        if (contentTypeFilter === 'articles') {
          const bodyLen = p.body ? stripHtmlTags(p.body).length : 0
          return bodyLen > 300
        }
        // 'posts' = short text posts without images
        return !p.imageUrl && (p.body ? stripHtmlTags(p.body).length <= 300 : true)
      })
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB
    })

    return sorted
  }, [feedPosts, feedFuse, feedSearchQuery, selectedCreator, contentTypeFilter, sortOrder, feedTab, subscribedCreators])

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
      <main className="min-h-screen bg-background py-12 sm:py-16 pb-24 relative">
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
                  className="text-3xl sm:text-4xl font-bold text-white mb-2"
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
            <div className="rounded-2xl border border-white/[0.06] bg-surface-1 p-12 text-center">
              <Wallet className="w-12 h-12 text-white/20 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-lg font-medium text-white mb-2">
                Connect your wallet to see your personal feed
              </h2>
              <p className="text-sm text-white/50 max-w-md mx-auto mb-6">
                Your feed shows exclusive content from creators you support. Connect an Aleo wallet to get started.
              </p>
              <button
                onClick={() => {
                  const btn = document.querySelector('.wallet-sidebar-btn button') as HTMLButtonElement
                  btn?.click()
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-medium text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                <Wallet className="w-4 h-4" aria-hidden="true" />
                Connect Wallet
              </button>
              <p className="text-xs text-white/50 mt-4">
                Or <Link href="/explore" className="underline hover:text-white/70 transition-colors">explore creators</Link> to browse without connecting.
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
                    Reload posts
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty state: connected but no subscriptions */}
          {connected && !loading && subscribedCreators.length === 0 && !error && (
            <>
              <SubscriberWelcome />
              {/* Discovery feed: public posts from all creators */}
              {discoveryPosts.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-white/50" aria-hidden="true" />
                      <h2 className="text-sm font-medium text-white/70">Public posts from creators</h2>
                    </div>
                    <Link
                      href="/explore"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-border text-xs font-medium text-white/70 hover:bg-white/[0.1] transition-all"
                    >
                      <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                      Explore All
                    </Link>
                  </div>
                  <div className="space-y-6">
                    {discoveryPosts.map((post, i) => {
                      const highestTier = creatorTierMap[post.creatorAddress] || 0
                      return (
                        <FeedPostCard
                          key={post.id}
                          post={post}
                          hasAccess={highestTier >= post.minTier}
                          index={i}
                          walletAddress={publicKey}
                          userTier={highestTier || null}
                        />
                      )
                    })}
                  </div>
                  <div className="mt-6 text-center">
                    <Link
                      href="/explore"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
                    >
                      <Compass className="w-4 h-4" aria-hidden="true" />
                      Subscribe to unlock exclusive content
                    </Link>
                  </div>
                </div>
              ) : discoveryLoading ? (
                <FeedSkeleton />
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-surface-1 p-12 text-center">
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
                  {/* Recommendations for discovery */}
                  <div className="mt-8 max-w-md mx-auto text-left">
                    <RecommendationsCard
                      creatorAddress=""
                      maxItems={3}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty state: subscribed but no posts */}
          {connected && !loading && subscribedCreators.length > 0 && feedPosts.length === 0 && !error && (
            <div className="rounded-2xl border border-white/[0.06] bg-surface-1 p-12 text-center">
              <div className="relative w-16 h-16 mx-auto mb-5">
                <div className="absolute inset-0 rounded-2xl bg-white/[0.04] animate-pulse" />
                <div className="relative w-full h-full rounded-2xl bg-surface-1 border border-border flex items-center justify-center">
                  <FileText className="w-7 h-7 text-white/50" aria-hidden="true" />
                </div>
              </div>
              <h2 className="text-lg font-medium text-white mb-2">
                Your creators haven&apos;t posted yet
              </h2>
              <p className="text-sm text-white/50 max-w-md mx-auto mb-6">
                Check back soon! Once they publish exclusive content, it will appear right here in your feed.
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/[0.06] border border-border text-sm text-white/70 hover:bg-white/[0.1] transition-all"
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                Discover more creators
              </Link>
            </div>
          )}

          {/* Feed content */}
          {connected && feedPosts.length > 0 && (
            <>
              {/* Creator stories row */}
              {storiesCreators.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                  {storiesCreators.map(creator => (
                    <Link href={`/creator/${creator.address}`} key={creator.address}>
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/30 to-white/10 p-[2px]">
                          {creator.imageUrl ? (
                            <img
                              src={creator.imageUrl}
                              alt={creator.name || 'Creator'}
                              className="w-full h-full rounded-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement
                                img.style.display = 'none'
                                img.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full rounded-full bg-[var(--bg-base)] flex items-center justify-center text-sm font-bold text-white/80 ${creator.imageUrl ? 'hidden' : ''}`}>
                            {creator.name?.[0]?.toUpperCase() || '?'}
                          </div>
                        </div>
                        <span className="text-[11px] text-white/50 max-w-[56px] truncate">
                          {creator.name || 'Creator'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Feature 2: Feed tabs (All | Subscribed | Free) */}
              <div className="flex items-center gap-1 mb-4 border-b border-white/[0.06] relative" role="tablist" aria-label="Feed filter">
                {([
                  { key: 'all' as FeedTab, label: 'All' },
                  { key: 'subscribed' as FeedTab, label: 'Subscribed' },
                  { key: 'free' as FeedTab, label: 'Free' },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={feedTab === tab.key}
                    onClick={() => handleFeedTabChange(tab.key)}
                    className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                      feedTab === tab.key
                        ? 'text-white'
                        : 'text-white/50 hover:text-white/70'
                    }`}
                  >
                    {tab.label}
                    {feedTab === tab.key && (
                      <m.div
                        layoutId="feed-tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" aria-hidden="true" />
                <input
                  ref={feedSearchRef}
                  type="text"
                  value={feedSearchQuery}
                  onChange={(e) => setFeedSearchQuery(e.target.value)}
                  placeholder="Search your feed..."
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/50 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/30 transition-all text-sm"
                />
                {feedSearchQuery && (
                  <button
                    onClick={() => { setFeedSearchQuery(''); feedSearchRef.current?.focus() }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Content type tabs */}
              <div className="mb-3 flex items-center gap-1 border-b border-white/[0.06] pb-2">
                {([
                  { key: 'all' as ContentTypeFilter, label: 'All', icon: Rss },
                  { key: 'posts' as ContentTypeFilter, label: 'Posts', icon: FileText },
                  { key: 'images' as ContentTypeFilter, label: 'Images', icon: ImageIcon },
                  { key: 'articles' as ContentTypeFilter, label: 'Articles', icon: BookOpen },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setContentTypeFilter(tab.key); setShowSaved(false) }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      contentTypeFilter === tab.key && !showSaved
                        ? 'bg-white/[0.08] text-white/80'
                        : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" aria-hidden="true" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Filter bar */}
              <div className="mb-6 flex items-center gap-3 flex-wrap">
                {/* Creator filter chips */}
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  <button
                    onClick={() => { setSelectedCreator(null); setShowSaved(false) }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedCreator === null && !showSaved
                        ? 'bg-white/[0.06] border-white/15 text-white/70'
                        : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => { setShowSaved(!showSaved); setSelectedCreator(null) }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                      showSaved
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
                    }`}
                  >
                    <Bookmark className="w-3 h-3" aria-hidden="true" />
                    Saved
                  </button>
                  {feedCreators.map(([address, label]) => (
                    <button
                      key={address}
                      onClick={() => setSelectedCreator(selectedCreator === address ? null : address)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all truncate max-w-[160px] ${
                        selectedCreator === address
                          ? 'bg-white/[0.06] border-white/15 text-white/70'
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
                          sortOrder === 'newest' ? 'text-white/70 bg-white/[0.04]' : 'text-white/60 hover:bg-white/[0.04]'
                        }`}
                      >
                        Newest first
                      </button>
                      <button
                        onClick={() => { setSortOrder('oldest'); setShowSortMenu(false) }}
                        className={`block w-full text-left px-4 py-2.5 text-xs transition-colors ${
                          sortOrder === 'oldest' ? 'text-white/70 bg-white/[0.04]' : 'text-white/60 hover:bg-white/[0.04]'
                        }`}
                      >
                        Oldest first
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Saved posts view */}
              {showSaved ? (
                <SavedPosts />
              ) : (
                <>
                  {/* Post count / no results */}
                  {filteredPosts.length === 0 && feedSearchQuery.trim() ? (
                    <div className="rounded-2xl border border-white/[0.06] bg-surface-1 p-8 text-center mb-6">
                      <Search className="w-8 h-8 text-white/20 mx-auto mb-3" aria-hidden="true" />
                      <p className="text-sm text-white/50">No results for &ldquo;{feedSearchQuery}&rdquo;</p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/50 mb-4">
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
                          walletAddress={publicKey}
                          userTier={highestTier || null}
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
                </>
              )}

              {/* Privacy notice */}
              <div className="mt-8 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-white/50 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-white/50 leading-relaxed">
                    Gated content is server-protected. Post bodies are only delivered after subscription verification. Your subscription data never leaves your wallet.
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
