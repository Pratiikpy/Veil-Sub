'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { m } from 'framer-motion'
import { Lock, Unlock, Shield, RefreshCw, Loader2, FileText, ArrowRight, Flag, Image as ImageIcon, Video, ShieldCheck, Globe } from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useContentFeed } from '@/hooks/useContentFeed'
import { isE2EEncrypted, decryptContent as e2eDecrypt } from '@/lib/e2eEncryption'
import dynamic from 'next/dynamic'
const DisputeContentModal = dynamic(() => import('./DisputeContentModal'), { ssr: false })
const RichContentRenderer = dynamic(() => import('./RichContentRenderer'), { ssr: false })
const VideoEmbed = dynamic(() => import('./VideoEmbed'), { ssr: false })
const PostInteractions = dynamic(() => import('./PostInteractions'), { ssr: false })
const ImageLightbox = dynamic(() => import('./ImageLightbox'), { ssr: false })
const ArticleReader = dynamic(() => import('./ArticleReader'), { ssr: false })
import { estimateReadingTime, shortenAddress } from '@/lib/utils'
import { FEATURED_CREATORS } from '@/lib/config'
import type { AccessPass, ContentPost } from '@/types'

interface Props {
  creatorAddress: string
  userPasses: AccessPass[]
  connected: boolean
  walletAddress?: string | null
  refreshKey?: number
  blockHeight?: number | null
}

import { tierConfig } from '@/lib/tierConfig'

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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-8 animate-pulse"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05]" />
            <div className="flex-1 h-4 rounded bg-white/[0.05]" />
            <div className="w-16 h-5 rounded-full bg-white/[0.05]" />
          </div>
          <div className="space-y-2">
            <div className="h-3 rounded bg-surface-1 w-full" />
            <div className="h-3 rounded bg-surface-1 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ContentFeed({ creatorAddress, userPasses, connected, walletAddress, refreshKey, blockHeight }: Props) {
  const { signMessage } = useWallet()
  const { getPostsForCreator, unlockPost, loading, error: feedError, clearError } = useContentFeed()
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [unlockedBodies, setUnlockedBodies] = useState<Record<string, string>>({})
  const [unlockingIds, setUnlockingIds] = useState<Set<string>>(new Set())
  const unlockingRef = useRef(new Set<string>())
  const failedUnlocksRef = useRef(new Set<string>())
  const [failedUnlocks, setFailedUnlocks] = useState(new Set<string>())
  const [unlockedImages, setUnlockedImages] = useState<Record<string, string>>({})
  const [unlockedVideos, setUnlockedVideos] = useState<Record<string, string>>({})
  const [decryptedPreviews, setDecryptedPreviews] = useState<Record<string, string>>({})
  const unlockedBodiesRef = useRef<Record<string, string>>({})
  const signMessageRef = useRef(signMessage)
  const unlockRunningRef = useRef(false)
  const [error, setError] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [disputePost, setDisputePost] = useState<{ contentId: string; title: string } | null>(null)
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [readerPost, setReaderPost] = useState<ContentPost | null>(null)

  // Keep refs in sync without triggering effects
  signMessageRef.current = signMessage
  unlockedBodiesRef.current = unlockedBodies

  // Clear decrypted content when wallet disconnects or address changes
  useEffect(() => {
    if (!connected) {
      setUnlockedBodies({})
      setUnlockedImages({})
      setUnlockedVideos({})
      setDecryptedPreviews({})
      setFailedUnlocks(new Set())
      unlockingRef.current = new Set()
      failedUnlocksRef.current = new Set()
    }
  }, [connected, walletAddress])

  // Surface hook-level unlock errors to UI
  useEffect(() => {
    if (feedError?.operation === 'unlock') {
      // Update failed unlocks set for posts that failed at hook level
      clearError()
    }
  }, [feedError, clearError])

  const fetchPosts = useCallback(async () => {
    setError(false)
    try {
      const result = await getPostsForCreator(creatorAddress)
      setPosts(result)
    } catch {
      setError(true)
    }
    setInitialLoad(false)
  }, [creatorAddress, getPostsForCreator])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts, refreshKey])

  // Memoize activePasses to prevent new array reference on every render
  const activePasses = useMemo(() => {
    return blockHeight != null
      ? userPasses.filter(p => p.expiresAt === 0 || p.expiresAt > blockHeight)
      : userPasses
  }, [userPasses, blockHeight])

  const highestTier = useMemo(() => {
    return activePasses.reduce((max, p) => Math.max(max, p.tier), 0)
  }, [activePasses])

  // Keep refs in sync for the unlock function
  const activePassesRef = useRef(activePasses)
  activePassesRef.current = activePasses

  // Decrypt E2E-encrypted previews client-side so subscribers see teasers.
  // Non-subscribers see "[Encrypted preview]" since they lack the tier key.
  useEffect(() => {
    if (posts.length === 0) return
    const toDecrypt = posts.filter(
      (p) => p.preview && isE2EEncrypted(p.preview) && !decryptedPreviews[p.id]
    )
    if (toDecrypt.length === 0) return

    ;(async () => {
      const results: Record<string, string> = {}
      for (const post of toDecrypt) {
        if (!post.preview) continue
        // If subscriber has a matching pass, decrypt with their tier
        const matchingPass = activePasses.find((ap) => ap.creator === creatorAddress)
        if (matchingPass) {
          // Try the post's minTier first (content was encrypted at this tier)
          try {
            results[post.id] = await e2eDecrypt(post.preview, creatorAddress, post.minTier)
            continue
          } catch {
            // Try subscriber's tier
            try {
              results[post.id] = await e2eDecrypt(post.preview, creatorAddress, matchingPass.tier)
              continue
            } catch {
              // Cannot decrypt
            }
          }
        }
        // Non-subscribers or decryption failure: show placeholder
        results[post.id] = 'This preview is end-to-end encrypted. Subscribe to read it.'
      }
      if (Object.keys(results).length > 0) {
        setDecryptedPreviews((prev) => ({ ...prev, ...results }))
      }
    })()
  }, [posts, activePasses, creatorAddress, decryptedPreviews])

  // Reset unlock state when the user's highest tier changes (e.g., after subscribing).
  // This allows previously-failed or not-yet-attempted unlocks to be retried.
  const prevHighestTierRef = useRef(highestTier)
  useEffect(() => {
    if (highestTier > prevHighestTierRef.current) {
      // Tier increased — clear failed unlocks so the auto-unlock loop retries them
      failedUnlocksRef.current = new Set()
      setFailedUnlocks(new Set())
      unlockRunningRef.current = false
    }
    prevHighestTierRef.current = highestTier
  }, [highestTier])

  // Auto-unlock: runs when posts load and user has passes, and re-runs when
  // highestTier changes (e.g., after subscribing) so newly-accessible posts get unlocked.
  // Always processes results even if component re-renders mid-sign.
  useEffect(() => {
    if (!walletAddress || highestTier === 0 || posts.length === 0) return
    if (unlockRunningRef.current) return

    const gatedPosts = posts.filter(
      (p) => p.gated && p.body === null && highestTier >= p.minTier &&
        !unlockedBodiesRef.current[p.id] && !unlockingRef.current.has(p.id) && !failedUnlocksRef.current.has(p.id)
    )
    if (gatedPosts.length === 0) return

    unlockRunningRef.current = true

    ;(async () => {
      for (const post of gatedPosts) {
        // Skip if already resolved while we were waiting
        if (unlockedBodiesRef.current[post.id] || failedUnlocksRef.current.has(post.id)) continue
        unlockingRef.current.add(post.id)
        setUnlockingIds((prev) => new Set(prev).add(post.id))

        const currentSign = signMessageRef.current
        const wrappedSign = currentSign
          ? async (msg: Uint8Array) => {
              const result = await currentSign(msg)
              if (!result) throw new Error('Signing cancelled')
              return result
            }
          : null

        const result = await unlockPost(post.id, creatorAddress, walletAddress, activePassesRef.current, wrappedSign)

        // Always clean up and process result — never discard a completed sign
        unlockingRef.current.delete(post.id)
        setUnlockingIds((prev) => {
          const next = new Set(prev)
          next.delete(post.id)
          return next
        })

        if (result) {
          setUnlockedBodies((prev) => ({ ...prev, [post.id]: result.body }))
          const imgUrl = result.imageUrl
          if (imgUrl) {
            setUnlockedImages((prev) => ({ ...prev, [post.id]: imgUrl }))
          }
          const vidUrl = result.videoUrl
          if (vidUrl) {
            setUnlockedVideos((prev) => ({ ...prev, [post.id]: vidUrl }))
          }
        } else {
          failedUnlocksRef.current.add(post.id)
          setFailedUnlocks((prev) => new Set(prev).add(post.id))
          // feedError will be set by hook — component consumes it via useEffect
        }
      }
      unlockRunningRef.current = false
    })()

    // No cleanup that sets cancelled — we WANT in-flight unlocks to complete
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, highestTier, walletAddress, creatorAddress])

  const retryUnlock = useCallback(async (post: ContentPost) => {
    if (!walletAddress || unlockingRef.current.has(post.id)) return
    // Remove from failed set
    failedUnlocksRef.current.delete(post.id)
    setFailedUnlocks((prev) => {
      const next = new Set(prev)
      next.delete(post.id)
      return next
    })
    // Mark as unlocking
    unlockingRef.current.add(post.id)
    setUnlockingIds((prev) => new Set(prev).add(post.id))

    const currentSign = signMessageRef.current
    const wrappedSign = currentSign
      ? async (msg: Uint8Array) => {
          const result = await currentSign(msg)
          if (!result) throw new Error('Signing cancelled')
          return result
        }
      : null

    const result = await unlockPost(post.id, creatorAddress, walletAddress, activePassesRef.current, wrappedSign)

    unlockingRef.current.delete(post.id)
    setUnlockingIds((prev) => {
      const next = new Set(prev)
      next.delete(post.id)
      return next
    })

    if (result) {
      setUnlockedBodies((prev) => ({ ...prev, [post.id]: result.body }))
      const imgUrl = result.imageUrl
      if (imgUrl) {
        setUnlockedImages((prev) => ({ ...prev, [post.id]: imgUrl }))
      }
      const vidUrl = result.videoUrl
      if (vidUrl) {
        setUnlockedVideos((prev) => ({ ...prev, [post.id]: vidUrl }))
      }
    } else {
      failedUnlocksRef.current.add(post.id)
      setFailedUnlocks((prev) => new Set(prev).add(post.id))
    }
  }, [walletAddress, creatorAddress, unlockPost])

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-2">
        Content
      </h2>
      <p className="text-xs text-white/60 mb-4">
        Free posts are visible to everyone. Gated content is end-to-end encrypted and decrypted in your browser after AccessPass verification.
      </p>

      {initialLoad && loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="p-4 sm:p-6 lg:p-8 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
          <p className="text-sm text-red-400 mb-4">Could not load exclusive content. Your AccessPass is safe—check your connection and retry.</p>
          <button
            onClick={fetchPosts}
            aria-label="Retry loading posts"
            className="px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-violet-400/50"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.length === 0 && (
            <div className="p-4 sm:p-6 lg:p-8 rounded-xl bg-surface-1 border border-white/[0.05] text-center">
              <FileText className="w-10 h-10 text-white/60 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-white font-medium mb-1">No Exclusive Content Yet</h3>
              <p className="text-sm text-white/70">
                This creator hasn&apos;t published any gated content. Once they do, your AccessPass verification will unlock it instantly—with zero on-chain footprint.
              </p>
            </div>
          )}
          {posts.map((post, i) => {
            const isFreePost = post.minTier === 0
            const tier = tierConfig[post.minTier] || tierConfig[1]
            const hasAccess = isFreePost || highestTier >= post.minTier
            const unlockedBody = unlockedBodies[post.id]
            const unlockedImage = unlockedImages[post.id]
            const unlockedVideo = unlockedVideos[post.id]
            const isUnlocking = unlockingIds.has(post.id)
            const isFailed = failedUnlocks.has(post.id)
            const displayBody = unlockedBody || post.body
            const displayImage = unlockedImage || post.imageUrl
            const displayVideo = unlockedVideo || post.videoUrl
            // Free posts are always unlocked (body comes from API); gated posts need tier access
            const unlocked = isFreePost ? displayBody != null : (hasAccess && displayBody != null)
            const Icon = isFreePost ? Globe : tier.icon
            const postIsE2E = !!post.e2e
            // Use decrypted preview for E2E posts, fall back to raw preview
            const displayPreview = decryptedPreviews[post.id] || post.preview

            return (
              <m.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`post-card-mobile relative rounded-xl border overflow-hidden ${
                  unlocked
                    ? `${tier.border} ${tier.bg}`
                    : 'border-white/5 bg-white/[0.01]'
                }`}
              >
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        unlocked ? tier.lockBg : 'bg-white/[0.05]'
                      }`}
                    >
                      {unlocked ? (
                        <Icon className={`w-4 h-4 ${tier.text}`} aria-hidden="true" />
                      ) : isUnlocking ? (
                        <Loader2 className="w-4 h-4 text-white/70 animate-spin" aria-hidden="true" />
                      ) : (
                        <Lock className="w-4 h-4 text-white/60" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3
                        className={`font-medium truncate ${
                          unlocked ? 'text-white' : 'text-white/60'
                        }`}
                      >
                        {post.title}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs border shrink-0 ${
                          isFreePost
                            ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                            : unlocked
                              ? `${tier.text} ${tier.lockBg} ${tier.border}`
                              : 'text-white/60 bg-surface-1 border-border'
                        }`}
                      >
                        {tier.name}
                      </span>
                    </div>
                    {postIsE2E && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0"
                        title="End-to-end encrypted — only subscribers can read this"
                      >
                        <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                        E2E
                      </span>
                    )}
                    {unlocked && (
                      <Unlock className={`w-3.5 h-3.5 shrink-0 ${tier.text}`} aria-hidden="true" />
                    )}
                  </div>

                  {/* Gated image placeholder — shown when post has image but content is locked */}
                  {!unlocked && post.hasImage && !isUnlocking && (
                    <div className="mb-4 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center h-20 sm:h-24 lg:h-28">
                      <div className="flex items-center gap-2 text-white/60">
                        <ImageIcon className="w-5 h-5" aria-hidden="true" />
                        <span className="text-xs">Image content -- AccessPass required</span>
                      </div>
                    </div>
                  )}

                  {/* Gated video placeholder — shown when post has video but content is locked */}
                  {!unlocked && post.hasVideo && !isUnlocking && (
                    <div className="mb-4 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center h-20 sm:h-24 lg:h-28">
                      <div className="flex items-center gap-2 text-white/60">
                        <Video className="w-5 h-5" aria-hidden="true" />
                        <span className="text-xs">Video content -- AccessPass required</span>
                      </div>
                    </div>
                  )}

                  {/* Unlocked image — click to open lightbox */}
                  {unlocked && displayImage && (
                    <div
                      className="mb-4 rounded-lg overflow-hidden border border-white/[0.06] aspect-video bg-white/[0.02] cursor-zoom-in"
                      onClick={() => {
                        const imgs = displayImage.includes(',')
                          ? displayImage.split(',').map((s: string) => s.trim()).filter(Boolean)
                          : [displayImage]
                        setLightboxImages(imgs)
                        setLightboxIndex(0)
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayImage.includes(',') ? displayImage.split(',')[0].trim() : displayImage}
                        alt={`Image for ${post.title}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement
                          img.style.display = 'none'
                          const fallback = img.nextElementSibling as HTMLElement | null
                          if (fallback) fallback.classList.remove('hidden')
                        }}
                      />
                      <div className="hidden h-20 sm:h-24 lg:h-28 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-center">
                        <div className="flex items-center gap-2 text-white/50">
                          <ImageIcon className="w-5 h-5" aria-hidden="true" />
                          <span className="text-xs">Image unavailable</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Unlocked video */}
                  {unlocked && displayVideo && (
                    <div className="mb-4">
                      <VideoEmbed url={displayVideo} title={post.title} />
                    </div>
                  )}

                  {unlocked && displayBody ? (
                    <div>
                      <RichContentRenderer html={displayBody} />
                      {displayBody.length > 500 && (
                        <button
                          onClick={() => setReaderPost(post)}
                          className="mt-3 flex items-center gap-1.5 text-xs text-violet-400/70 hover:text-violet-300 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                          Read in focus mode
                        </button>
                      )}
                    </div>
                  ) : isUnlocking ? (
                    <div className="flex items-center gap-2 py-4" role="status" aria-live="polite">
                      <Loader2 className="w-4 h-4 text-violet-400 animate-spin" aria-hidden="true" />
                      <p className="text-sm text-white/70">Proving your access to unlock content...</p>
                    </div>
                  ) : isFailed && hasAccess ? (
                    <div className="flex items-center gap-4 py-4">
                      <p className="text-sm text-white/60">Couldn&apos;t verify your access. This is usually temporary.</p>
                      <button
                        onClick={() => retryUnlock(post)}
                        aria-label="Retry unlocking post content"
                        className="px-4 py-2 rounded-lg text-xs font-medium bg-white/[0.08] border border-white/[0.1] text-white hover:bg-white/[0.12] active:scale-[0.98] transition-all inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-violet-400/50"
                      >
                        <RefreshCw className="w-3 h-3" aria-hidden="true" />
                        Try again
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Visible preview lines with gradient blur fade */}
                      <div className="relative overflow-hidden">
                        {displayPreview ? (
                          <div>
                            <p className="text-sm text-white/70 leading-relaxed">
                              {displayPreview}
                            </p>
                            {/* Fake continuation lines (blurred) to suggest more content */}
                            <div className="mt-3 space-y-2" aria-hidden="true">
                              <div className="h-3.5 rounded bg-white/[0.06] w-full" style={{ filter: 'blur(4px)' }} />
                              <div className="h-3.5 rounded bg-white/[0.05] w-[90%]" style={{ filter: 'blur(5px)' }} />
                              <div className="h-3.5 rounded bg-white/[0.04] w-[75%]" style={{ filter: 'blur(6px)' }} />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5" aria-hidden="true">
                            <div className="h-3.5 rounded bg-white/[0.08] w-full" />
                            <div className="h-3.5 rounded bg-white/[0.07] w-[95%]" />
                            <div className="h-3.5 rounded bg-white/[0.06] w-full" style={{ filter: 'blur(3px)' }} />
                            <div className="h-3.5 rounded bg-white/[0.05] w-[88%]" style={{ filter: 'blur(4px)' }} />
                            <div className="h-3.5 rounded bg-white/[0.04] w-[70%]" style={{ filter: 'blur(5px)' }} />
                          </div>
                        )}
                        {/* Gradient overlay — fades content into background */}
                        <div
                          className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
                          style={{
                            background: 'linear-gradient(to bottom, transparent 0%, var(--bg-base) 85%)',
                          }}
                        />
                      </div>

                      {/* Subscribe CTA — the main conversion element */}
                      <div className="relative -mt-4 flex flex-col items-center gap-3 py-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tier.lockBg} border ${tier.border}`}>
                          <Lock className={`w-4 h-4 ${tier.text}`} aria-hidden="true" />
                        </div>
                        <p className="text-sm text-white/80 font-medium text-center">
                          {connected
                            ? 'Subscribe to continue reading'
                            : 'Connect wallet to unlock'}
                        </p>
                        <button
                          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 active:scale-[0.98] ${
                            tier.color === 'violet'
                              ? 'bg-white text-black hover:bg-white/90'
                              : `${tier.lockBg} ${tier.text} border ${tier.border} hover:brightness-125`
                          }`}
                          disabled
                        >
                          {connected
                            ? `From ${tier.name} tier`
                            : 'Connect wallet'}
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <p className="text-[11px] text-white/40">
                          {postIsE2E
                            ? 'End-to-end encrypted — the server cannot read this content'
                            : 'Content is server-protected and never exposed in network requests'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Interactions bar */}
                  {unlocked && (
                    <div className="mt-3 pt-2 border-t border-white/[0.04]">
                      <PostInteractions
                        contentId={post.id}
                        readingTime={displayBody ? estimateReadingTime(displayBody) : undefined}
                      />
                    </div>
                  )}

                  {/* Free post CTA — subtle nudge to subscribe for more */}
                  {isFreePost && unlocked && (
                    <div className="mt-3 pt-2 border-t border-emerald-500/10">
                      <p className="text-xs text-white/40 text-center">
                        Enjoying this free post? <span className="text-violet-400">Subscribe</span> to unlock exclusive content from this creator.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    {post.contentId !== 'seed' && (
                      <p className="text-xs text-white/60">
                        Published via veilsub_v29.aleo
                      </p>
                    )}
                    <div className="flex items-center gap-4 ml-auto">
                      {unlocked && post.contentId !== 'seed' && (
                        <button
                          onClick={() => setDisputePost({ contentId: post.contentId, title: post.title })}
                          className="text-xs text-white/60 hover:text-red-400 transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none rounded px-1"
                        >
                          <Flag className="w-3 h-3" aria-hidden="true" />
                          Dispute
                        </button>
                      )}
                      {post.createdAt && (
                        <p className="text-xs text-white/60">
                          {timeAgo(post.createdAt)}
                          {post.updatedAt && ' (edited)'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </m.div>
            )
          })}
        </div>
      )}
      <div className="mt-4 p-4 rounded-lg bg-violet-500/5 border border-violet-500/10">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-white/70 shrink-0" aria-hidden="true" />
          <p className="text-xs text-white/60">
            Gated content is end-to-end encrypted. The server stores only ciphertext it cannot read. Decryption happens in your browser using keys derived from your AccessPass.
          </p>
        </div>
      </div>

      {disputePost && activePasses.length > 0 && (
        <DisputeContentModal
          isOpen={!!disputePost}
          onClose={() => setDisputePost(null)}
          contentId={disputePost.contentId}
          contentTitle={disputePost.title}
          accessPassPlaintext={activePasses[0].rawPlaintext}
        />
      )}

      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}

      {readerPost && (unlockedBodies[readerPost.id] || readerPost.body) && (
        <ArticleReader
          title={readerPost.title}
          body={unlockedBodies[readerPost.id] || readerPost.body || ''}
          creator={{
            name: FEATURED_CREATORS.find(c => c.address === creatorAddress)?.label || '',
            address: creatorAddress,
          }}
          publishedAt={readerPost.createdAt ? new Date(readerPost.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
          readingTime={estimateReadingTime(unlockedBodies[readerPost.id] || readerPost.body || '')}
          onClose={() => setReaderPost(null)}
        />
      )}
    </div>
  )
}
