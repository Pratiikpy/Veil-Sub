'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { m } from 'framer-motion'
import { Lock, Unlock, Shield, RefreshCw, Loader2, FileText, ArrowRight, Flag, Image as ImageIcon, Video, ShieldCheck, Globe, DollarSign, StickyNote, Pencil, Trash2, ThumbsUp } from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useContentFeed } from '@/hooks/useContentFeed'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useContentActions } from '@/hooks/useContentActions'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { isE2EEncrypted, decryptContent as e2eDecrypt } from '@/lib/e2eEncryption'
import dynamic from 'next/dynamic'
const DisputeContentModal = dynamic(() => import('./DisputeContentModal'), { ssr: false })
const RichContentRenderer = dynamic(() => import('./RichContentRenderer'), { ssr: false })
const VideoEmbed = dynamic(() => import('./VideoEmbed'), { ssr: false })
const PostInteractions = dynamic(() => import('./PostInteractions'), { ssr: false })
const ImageLightbox = dynamic(() => import('./ImageLightbox'), { ssr: false })
const ArticleReader = dynamic(() => import('./ArticleReader'), { ssr: false })
import ProfileHoverCard from './ProfileHoverCard'
import { estimateReadingTime, shortenAddress, formatCredits, formatUsd, creditsToMicrocredits, computeWalletHash } from '@/lib/utils'
import { FEATURED_CREATORS, FEES } from '@/lib/config'
import { toast } from 'sonner'
import type { AccessPass, ContentPost } from '@/types'

interface Props {
  creatorAddress: string
  userPasses: AccessPass[]
  connected: boolean
  walletAddress?: string | null
  refreshKey?: number
  blockHeight?: number | null
  viewMode?: 'feed' | 'grid'
  onViewModeChange?: (mode: 'feed' | 'grid') => void
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

export default function ContentFeed({ creatorAddress, userPasses, connected, walletAddress, refreshKey, blockHeight, viewMode, onViewModeChange }: Props) {
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
  const [feedFilter, setFeedFilter] = useState<'all' | 'posts' | 'notes'>('all')

  // Track IDs that were just unlocked in this session (for blur-reveal animation)
  const [justUnlockedIds, setJustUnlockedIds] = useState<Set<string>>(new Set())

  // PPV payment state
  const [ppvPayingId, setPpvPayingId] = useState<string | null>(null)
  const ppvPayingRef = useRef(false)
  const [ppvConfirmId, setPpvConfirmId] = useState<string | null>(null)
  const { tip, getCreditsRecords, publicKey } = useVeilSub()
  const { updateContent, deleteContent } = useContentActions()
  const { startPolling: startPpvPolling } = useTransactionPoller()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Anonymous endorsement tracking
  const [endorseCounts, setEndorseCounts] = useState<Record<string, number>>({})
  const [endorsedIds, setEndorsedIds] = useState<Set<string>>(new Set())
  const [endorsingId, setEndorsingId] = useState<string | null>(null)

  // PPV unlock tracking (server-backed with localStorage cache)
  const [ppvUnlocked, setPpvUnlocked] = useState<Set<string>>(new Set())
  const ppvLoadedRef = useRef(false)

  // Load PPV unlocks from server on wallet connection
  useEffect(() => {
    if (!walletAddress || ppvLoadedRef.current) return
    ppvLoadedRef.current = true

    ;(async () => {
      try {
        const walletHash = await computeWalletHash(walletAddress)
        const res = await fetch(`/api/posts/ppv-unlock?walletHash=${walletHash}`)
        if (res.ok) {
          const data = await res.json()
          if (data.unlockedPosts && Array.isArray(data.unlockedPosts)) {
            setPpvUnlocked(new Set(data.unlockedPosts))
            // Update localStorage cache
            try { if (walletAddress) localStorage.setItem(`veilsub_ppv_unlocked_${walletAddress}`, JSON.stringify(data.unlockedPosts)) } catch { /* ignore */ }
          }
        }
      } catch {
        // Fall back to localStorage if server is unavailable
        try {
          const stored = walletAddress ? localStorage.getItem(`veilsub_ppv_unlocked_${walletAddress}`) : null
          if (stored) setPpvUnlocked(new Set(JSON.parse(stored)))
        } catch { /* ignore */ }
      }
    })()
  }, [walletAddress])

  // Reset PPV loaded state when wallet changes
  useEffect(() => {
    if (!walletAddress) {
      ppvLoadedRef.current = false
      setPpvUnlocked(new Set())
    }
  }, [walletAddress])

  const markPpvUnlocked = useCallback((postId: string) => {
    setPpvUnlocked(prev => {
      const next = new Set(prev)
      next.add(postId)
      try { if (walletAddress) localStorage.setItem(`veilsub_ppv_unlocked_${walletAddress}`, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }, [walletAddress])

  // PPV payment: execute a real tip transaction, then unlock on confirmation
  const handlePpvPayment = useCallback(async (postId: string, ppvPrice: number) => {
    if (ppvPayingRef.current) return // ref-based guard prevents double-click across async ticks
    ppvPayingRef.current = true
    if (ppvPayingId) { ppvPayingRef.current = false; return } // state-based guard still used for UI
    setPpvPayingId(postId)
    setPpvConfirmId(null)

    try {
      // Get a credits record for payment
      const records = await getCreditsRecords()
      if (!records || records.length === 0) {
        toast.error('No credits records found. You need ALEO credits in your wallet.')
        setPpvPayingId(null)
        return
      }

      // Find a record with enough balance
      const needed = ppvPrice + FEES.TIP // FEES.TIP is already in microcredits
      const paymentRecord = records.find((r: string) => {
        try {
          const match = r.match(/microcredits:\s*(\d+)u64/)
          return match ? parseInt(match[1]) >= needed : false
        } catch { return false }
      })

      if (!paymentRecord) {
        toast.error(`Insufficient balance. Need at least ${formatCredits(needed)} ALEO.`)
        setPpvPayingId(null)
        return
      }

      toast.info('Submitting PPV payment transaction...')

      const txId = await tip(paymentRecord, creatorAddress, ppvPrice)

      if (txId) {
        toast.info('Payment submitted. Waiting for on-chain confirmation...')
        // Poll for confirmation before unlocking content
        startPpvPolling(txId, async (result) => {
          if (result.status === 'confirmed') {
            toast.success('PPV payment submitted! Unlocking content...')
            markPpvUnlocked(postId)
            setJustUnlockedIds((prev) => new Set(prev).add(postId))
            // Persist unlock to server with proper authentication
            if (walletAddress) {
              try {
                const walletHash = await computeWalletHash(walletAddress)
                const timestamp = Date.now()
                await fetch('/api/posts/ppv-unlock', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    postId,
                    txId: result.resolvedTxId || txId,
                    walletAddress,
                    walletHash,
                    timestamp,
                    creatorAddress,
                  }),
                }).catch(() => {
                  toast.warning('Unlock saved locally but server backup failed. Your access is preserved on this device.')
                })
              } catch { /* ignore API tracking failures */ }
            }
          } else if (result.status === 'timeout') {
            // Shield Wallet often doesn't report final status — unlock but warn
            toast.warning('Payment submitted but not yet confirmed on-chain.', { duration: 6000 })
            markPpvUnlocked(postId)
            setJustUnlockedIds((prev) => new Set(prev).add(postId))
            // Persist unlock to server with proper authentication
            if (walletAddress) {
              try {
                const walletHash = await computeWalletHash(walletAddress)
                const timestamp = Date.now()
                await fetch('/api/posts/ppv-unlock', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    postId,
                    txId,
                    walletAddress,
                    walletHash,
                    timestamp,
                    creatorAddress,
                  }),
                }).catch(() => { /* server save is best-effort */ })
              } catch { /* ignore API tracking failures */ }
            }
          } else if (result.status === 'failed') {
            toast.error('PPV payment failed on-chain. Content not unlocked.')
          }
          setPpvPayingId(null)
          ppvPayingRef.current = false
        })
        return // Don't clear ppvPayingId yet — polling callback handles it
      } else {
        toast.error('PPV payment failed or was cancelled. Content not unlocked.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed'
      toast.error(msg)
    } finally {
      setPpvPayingId(null)
      ppvPayingRef.current = false
    }
  }, [ppvPayingId, getCreditsRecords, tip, creatorAddress, markPpvUnlocked, walletAddress, startPpvPolling])

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

  // Decrypt E2E-encrypted note bodies client-side.
  // Notes with e2e flag or E2E-prefixed body need subscriber-tier key to decrypt.
  useEffect(() => {
    if (posts.length === 0 || highestTier === 0) return
    const encryptedNotes = posts.filter(
      (p) => p.postType === 'note' && p.body && isE2EEncrypted(p.body) && !unlockedBodies[p.id]
    )
    if (encryptedNotes.length === 0) return

    ;(async () => {
      const results: Record<string, string> = {}
      for (const note of encryptedNotes) {
        if (!note.body) continue
        const matchingPass = activePasses.find((ap) => ap.creator === creatorAddress)
        if (matchingPass) {
          // Try the note's minTier first (encrypted at this tier)
          try {
            results[note.id] = await e2eDecrypt(note.body, creatorAddress, note.minTier)
            continue
          } catch {
            // Try subscriber's actual tier
            try {
              results[note.id] = await e2eDecrypt(note.body, creatorAddress, matchingPass.tier)
              continue
            } catch {
              // Cannot decrypt — subscriber may not have the right tier
            }
          }
        }
      }
      if (Object.keys(results).length > 0) {
        setUnlockedBodies((prev) => ({ ...prev, ...results }))
      }
    })()
  }, [posts, activePasses, creatorAddress, highestTier, unlockedBodies])

  // Reset unlock state when the user's highest tier changes (e.g., after subscribing).
  // This allows previously-failed or not-yet-attempted unlocks to be retried.
  // Also handles the transition from tier 0 (not subscribed) to any tier (newly subscribed).
  const prevHighestTierRef = useRef(highestTier)
  useEffect(() => {
    if (highestTier > prevHighestTierRef.current) {
      // Tier increased — clear ALL unlock tracking so the auto-unlock loop retries everything
      failedUnlocksRef.current = new Set()
      setFailedUnlocks(new Set())
      unlockingRef.current = new Set()
      setUnlockingIds(new Set())
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
          setJustUnlockedIds((prev) => new Set(prev).add(post.id))
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
      setJustUnlockedIds((prev) => new Set(prev).add(post.id))
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

  // Filter posts by type
  const filteredPosts = useMemo(() => {
    if (feedFilter === 'all') return posts
    if (feedFilter === 'notes') return posts.filter(p => p.postType === 'note')
    return posts.filter(p => p.postType !== 'note')
  }, [posts, feedFilter])

  const noteCount = useMemo(() => posts.filter(p => p.postType === 'note').length, [posts])
  const postCount = useMemo(() => posts.filter(p => p.postType !== 'note').length, [posts])

  // Fetch endorsement counts for all loaded posts (batched with Promise.all instead of N+1 sequential)
  useEffect(() => {
    if (posts.length === 0) return
    let cancelled = false

    ;(async () => {
      const counts: Record<string, number> = {}
      const results = await Promise.allSettled(
        posts.map(async (post) => {
          const res = await fetch(`/api/social?type=reactions&contentId=${encodeURIComponent(post.id)}`)
          if (res.ok) {
            const { counts: reactionCounts } = await res.json()
            if (reactionCounts?.endorse > 0) {
              return { id: post.id, count: reactionCounts.endorse as number }
            }
          }
          return null
        })
      )
      if (cancelled) return
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          counts[result.value.id] = result.value.count
        }
      }
      if (Object.keys(counts).length > 0) {
        setEndorseCounts(prev => ({ ...prev, ...counts }))
      }
    })()

    return () => { cancelled = true }
  }, [posts])

  // Load user's endorsed posts from localStorage
  useEffect(() => {
    if (!walletAddress) {
      setEndorsedIds(new Set())
      return
    }
    try {
      const stored = localStorage.getItem(`veilsub_endorsed_${walletAddress}`)
      if (stored) setEndorsedIds(new Set(JSON.parse(stored)))
    } catch { /* ignore */ }
  }, [walletAddress])

  // Check if user has a valid pass for the current creator
  const hasActivePass = useMemo(() => {
    return activePasses.some(p => p.creator === creatorAddress)
  }, [activePasses, creatorAddress])

  const handleEndorse = useCallback(async (postId: string) => {
    if (!walletAddress || !hasActivePass || endorsingId || endorsedIds.has(postId)) return
    setEndorsingId(postId)

    try {
      const walletHash = await computeWalletHash(walletAddress)
      const timestamp = Date.now()

      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reaction',
          contentId: postId,
          reactionType: 'endorse',
          delta: 1,
          walletAddress,
          walletHash,
          timestamp,
        }),
      })

      if (res.ok) {
        const { count } = await res.json()
        setEndorseCounts(prev => ({ ...prev, [postId]: count }))
        setEndorsedIds(prev => {
          const next = new Set(prev)
          next.add(postId)
          try { localStorage.setItem(`veilsub_endorsed_${walletAddress}`, JSON.stringify([...next])) } catch { /* quota */ }
          return next
        })
        toast.success('Endorsement recorded anonymously')
      } else {
        toast.error('Could not record endorsement')
      }
    } catch {
      toast.error('Endorsement failed — check your connection')
    } finally {
      setEndorsingId(null)
    }
  }, [walletAddress, hasActivePass, endorsingId, endorsedIds])

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-2">
        Content
      </h2>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/60">
          Free posts are visible to everyone. Gated content is end-to-end encrypted and decrypted in your browser after subscription verification.
        </p>
        {onViewModeChange && (
          <div className="flex items-center rounded-lg border border-border overflow-hidden ml-3 shrink-0">
            <button
              onClick={() => onViewModeChange('feed')}
              className={`p-2 transition-colors ${viewMode === 'feed' ? 'bg-white/[0.06] text-white/70' : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'}`}
              aria-label="List view"
              title="List view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-white/[0.06] text-white/70' : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'}`}
              aria-label="Grid view"
              title="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* Feed filter tabs */}
      {posts.length > 0 && (
        <div className="flex gap-1 p-1 rounded-lg bg-white/[0.02] border border-border mb-4" role="tablist" aria-label="Content filter">
          {([
            { id: 'all' as const, label: 'All', count: posts.length },
            { id: 'posts' as const, label: 'Posts', count: postCount },
            { id: 'notes' as const, label: 'Notes', count: noteCount },
          ]).map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={feedFilter === tab.id}
              onClick={() => setFeedFilter(tab.id)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                feedFilter === tab.id
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/50 hover:text-white/60'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 text-[11px] ${feedFilter === tab.id ? 'text-white/60' : 'text-white/50'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {initialLoad && loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="p-4 sm:p-6 lg:p-8 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
          <p className="text-sm text-red-400 mb-4">Could not load exclusive content. Your subscription pass is safe—check your connection and retry.</p>
          <button
            onClick={fetchPosts}
            aria-label="Retry loading posts"
            className="px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.length === 0 && (
            <div className="p-4 sm:p-6 lg:p-8 rounded-xl bg-surface-1 border border-white/[0.05] text-center">
              <FileText className="w-10 h-10 text-white/60 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-white font-medium mb-1">
                {feedFilter === 'notes' ? 'No Notes Yet' : feedFilter === 'posts' ? 'No Posts Yet' : 'No Exclusive Content Yet'}
              </h3>
              <p className="text-sm text-white/70">
                {feedFilter === 'notes'
                  ? 'This creator hasn\'t shared any notes. Notes are short, free, public updates.'
                  : 'This creator hasn\'t published any gated content. Once they do, your subscription verification will unlock it instantly\u2014with zero on-chain footprint.'}
              </p>
            </div>
          )}
          {filteredPosts.map((post, i) => {
            const isNote = post.postType === 'note'
            const isPPV = !!(post.ppvPrice && post.ppvPrice > 0)
            const isPPVUnlocked = ppvUnlocked.has(post.id)

            // --- Note rendering (compact, may be encrypted for subscribers-only) ---
            if (isNote) {
              const creatorInfo = FEATURED_CREATORS.find(c => c.address === creatorAddress)
              const noteIsEncrypted = !!post.e2e || (post.body && isE2EEncrypted(post.body))
              const noteDecryptedBody = unlockedBodies[post.id]
              const noteDisplayBody = noteDecryptedBody || post.body
              const noteHasAccess = !noteIsEncrypted || highestTier >= post.minTier
              const noteUnlocked = !noteIsEncrypted || (noteHasAccess && noteDisplayBody != null && !isE2EEncrypted(noteDisplayBody))
              return (
                <m.div
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`rounded-xl border p-4 ${noteIsEncrypted ? 'border-violet-500/15 bg-violet-500/[0.02]' : 'border-white/[0.06] bg-white/[0.015]'}`}
                >
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${noteIsEncrypted ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                      {noteIsEncrypted && !noteUnlocked ? (
                        <Lock className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
                      ) : (
                        <StickyNote className={`w-3.5 h-3.5 ${noteIsEncrypted ? 'text-violet-400' : 'text-emerald-400'}`} aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ProfileHoverCard address={creatorAddress}>
                          <span className="text-xs font-medium text-white/80 hover:text-white/60 transition-colors cursor-pointer">
                            {creatorInfo?.label || shortenAddress(creatorAddress)}
                          </span>
                        </ProfileHoverCard>
                        <span className="text-[11px] text-white/50">{post.createdAt ? timeAgo(post.createdAt) : ''}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${noteIsEncrypted ? 'bg-violet-500/10 text-violet-400 border border-violet-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'}`}>
                          {noteIsEncrypted ? 'Subscribers Only' : 'Note'}
                        </span>
                        {noteIsEncrypted && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                            E2E
                          </span>
                        )}
                      </div>
                      {noteUnlocked ? (
                        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">
                          {noteDisplayBody}
                        </p>
                      ) : (
                        <div className="py-3">
                          <div className="flex items-center gap-2 text-white/60">
                            <Lock className="w-4 h-4 text-violet-400" aria-hidden="true" />
                            <p className="text-sm">
                              {connected && highestTier > 0
                                ? 'Decrypting...'
                                : 'This note is end-to-end encrypted. Subscribe to read it.'}
                            </p>
                          </div>
                        </div>
                      )}
                      {post.imageUrl && (
                        <div
                          className="mt-2 rounded-lg overflow-hidden border border-white/[0.06] max-h-60 cursor-zoom-in"
                          onClick={() => {
                            setLightboxImages([post.imageUrl as string])
                            setLightboxIndex(0)
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.imageUrl}
                            alt=""
                            className="w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="mt-2">
                        <PostInteractions contentId={post.id} creatorAddress={creatorAddress} postTitle="Note" />
                      </div>
                      {/* Anonymous endorsement badge */}
                      {(endorseCounts[post.id] > 0 || (connected && hasActivePass)) && (
                        <div className="mt-2 flex items-center gap-2">
                          {endorseCounts[post.id] > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300">
                              <Shield className="w-3 h-3" aria-hidden="true" />
                              {endorseCounts[post.id]} verified subscriber{endorseCounts[post.id] !== 1 ? 's' : ''} endorse{endorseCounts[post.id] === 1 ? 's' : ''} this
                            </span>
                          )}
                          {connected && hasActivePass && !endorsedIds.has(post.id) && (
                            <button
                              onClick={() => handleEndorse(post.id)}
                              disabled={endorsingId === post.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-white/50 hover:text-amber-300 hover:bg-amber-500/10 border border-white/[0.06] hover:border-amber-500/20 transition-all disabled:opacity-40"
                              aria-label="Endorse this post as a verified subscriber"
                            >
                              <ThumbsUp className="w-3 h-3" aria-hidden="true" />
                              <Shield className="w-2.5 h-2.5" aria-hidden="true" />
                              {endorsingId === post.id ? 'Endorsing...' : 'Endorse'}
                            </button>
                          )}
                          {connected && hasActivePass && endorsedIds.has(post.id) && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-amber-400/60">
                              <ThumbsUp className="w-3 h-3 fill-current" aria-hidden="true" />
                              Endorsed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </m.div>
              )
            }

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
            // PPV posts require PPV unlock in ADDITION to tier access
            const tierUnlocked = isFreePost ? displayBody != null : (hasAccess && displayBody != null)
            const unlocked = isPPV ? (tierUnlocked && isPPVUnlocked) : tierUnlocked
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
                      {isPPV && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/25 text-amber-300 shrink-0">
                          <DollarSign className="w-3 h-3" aria-hidden="true" />
                          PPV
                        </span>
                      )}
                    </div>
                    {postIsE2E && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0"
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
                        <span className="text-xs">Image content -- subscription required</span>
                      </div>
                    </div>
                  )}

                  {/* Gated video placeholder — shown when post has video but content is locked */}
                  {!unlocked && post.hasVideo && !isUnlocking && (
                    <div className="mb-4 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center h-20 sm:h-24 lg:h-28">
                      <div className="flex items-center gap-2 text-white/60">
                        <Video className="w-5 h-5" aria-hidden="true" />
                        <span className="text-xs">Video content -- subscription required</span>
                      </div>
                    </div>
                  )}

                  {/* Unlocked image — click to open lightbox */}
                  {unlocked && displayImage && (
                    <div
                      className={`mb-4 rounded-lg overflow-hidden border border-white/[0.06] aspect-video bg-white/[0.02] cursor-zoom-in${justUnlockedIds.has(post.id) ? ' content-unlock-reveal' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const imgs = displayImage.includes(',')
                          ? displayImage.split(',').map((s: string) => s.trim()).filter(Boolean)
                          : [displayImage]
                        setLightboxImages(imgs)
                        setLightboxIndex(0)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          const imgs = displayImage.includes(',')
                            ? displayImage.split(',').map((s: string) => s.trim()).filter(Boolean)
                            : [displayImage]
                          setLightboxImages(imgs)
                          setLightboxIndex(0)
                        }
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
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                      <div
                        style={{ display: 'none' }}
                        className="h-20 sm:h-24 lg:h-28 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-center"
                      >
                        <div className="flex items-center gap-2 text-white/50">
                          <ImageIcon className="w-5 h-5" aria-hidden="true" />
                          <span className="text-xs">Image unavailable</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Unlocked video */}
                  {unlocked && displayVideo && (
                    <div className={`mb-4${justUnlockedIds.has(post.id) ? ' content-unlock-reveal' : ''}`}>
                      <VideoEmbed url={displayVideo} title={post.title} />
                    </div>
                  )}

                  {/* PPV paywall — shown for all PPV posts where user has tier access but hasn't paid PPV yet */}
                  {isPPV && !isPPVUnlocked && tierUnlocked && displayBody ? (
                    <div className="relative">
                      <div className="relative overflow-hidden">
                        <p className="text-sm text-white/70 leading-relaxed">
                          {displayBody.replace(/<[^>]*>/g, '').slice(0, 120)}...
                        </p>
                        <div className="mt-2 space-y-2" aria-hidden="true">
                          <div className="h-3.5 rounded bg-white/[0.06] w-full" style={{ filter: 'blur(5px)' }} />
                          <div className="h-3.5 rounded bg-white/[0.05] w-[85%]" style={{ filter: 'blur(6px)' }} />
                        </div>
                        <div
                          className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
                          style={{ background: 'linear-gradient(to bottom, transparent 0%, var(--bg-base) 85%)' }}
                        />
                      </div>
                      <div className="relative -mt-2 flex flex-col items-center gap-2.5 py-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/25">
                          <DollarSign className="w-5 h-5 text-amber-300" aria-hidden="true" />
                        </div>
                        {ppvConfirmId === post.id ? (
                          <>
                            <p className="text-sm text-white/80 font-medium text-center">
                              Pay {formatCredits(post.ppvPrice!)} ALEO
                              <span className="text-white/50 ml-1 text-xs">({formatUsd(post.ppvPrice!)})</span>
                              {' '}to unlock?
                            </p>
                            <p className="text-[11px] text-white/50">
                              Includes 5% platform fee + ~{formatCredits(FEES.TIP)} ALEO network fee
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setPpvConfirmId(null)
                                  handlePpvPayment(post.id, post.ppvPrice!)
                                }}
                                disabled={ppvPayingId === post.id}
                                className="px-5 py-2 rounded-xl text-sm font-medium bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 active:scale-[0.98] transition-all disabled:opacity-40"
                              >
                                {ppvPayingId === post.id ? (
                                  <span className="flex items-center gap-1.5">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                    Processing...
                                  </span>
                                ) : 'Confirm Payment'}
                              </button>
                              <button
                                onClick={() => setPpvConfirmId(null)}
                                disabled={ppvPayingId === post.id}
                                className="px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.05] border border-white/[0.1] text-white/60 hover:bg-white/[0.08] transition-all disabled:opacity-40"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-white/80 font-medium">
                              Unlock this post &mdash; {formatCredits(post.ppvPrice!)} ALEO
                              <span className="text-white/50 ml-1 text-xs">({formatUsd(post.ppvPrice!)})</span>
                            </p>
                            <button
                              onClick={() => {
                                if (ppvPayingId) return
                                setPpvConfirmId(post.id)
                              }}
                              disabled={!connected || ppvPayingId === post.id}
                              className="px-6 py-2 rounded-xl text-sm font-medium bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {ppvPayingId === post.id ? (
                                <span className="flex items-center gap-1.5">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  Processing payment...
                                </span>
                              ) : connected ? 'Pay to Read' : 'Connect wallet'}
                            </button>
                          </>
                        )}
                        <p className="text-[11px] text-white/50">One-time payment via private Aleo tip</p>
                      </div>
                    </div>
                  ) : unlocked && displayBody ? (
                    <div className={justUnlockedIds.has(post.id) ? 'content-unlock-reveal' : undefined}>
                      <RichContentRenderer html={displayBody} />
                      {displayBody.length > 500 && (
                        <button
                          onClick={() => setReaderPost(post)}
                          className="mt-3 flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                          Read in focus mode
                        </button>
                      )}
                    </div>
                  ) : isUnlocking ? (
                    <div className="flex items-center gap-2 py-4" role="status" aria-live="polite">
                      <Loader2 className="w-4 h-4 text-white/60 animate-spin" aria-hidden="true" />
                      <p className="text-sm text-white/70">Proving your access to unlock content...</p>
                    </div>
                  ) : isFailed && hasAccess ? (
                    <div className="flex items-center gap-4 py-4">
                      <p className="text-sm text-white/60">Couldn&apos;t verify your access. This is usually temporary.</p>
                      <button
                        onClick={() => retryUnlock(post)}
                        aria-label="Retry unlocking post content"
                        className="px-4 py-2 rounded-lg text-xs font-medium bg-white/[0.08] border border-white/[0.1] text-white hover:bg-white/[0.12] active:scale-[0.98] transition-all inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white/30"
                      >
                        <RefreshCw className="w-3 h-3" aria-hidden="true" />
                        Retry unlock
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
                        <p className="text-[11px] text-white/50">
                          {postIsE2E
                            ? 'End-to-end encrypted — the server cannot read this content'
                            : 'Content is server-protected and never exposed in network requests'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Anonymous endorsement badge */}
                  {unlocked && (endorseCounts[post.id] > 0 || (connected && hasActivePass)) && (
                    <div className="mt-3 flex items-center gap-2">
                      {endorseCounts[post.id] > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300">
                          <Shield className="w-3 h-3" aria-hidden="true" />
                          {endorseCounts[post.id]} verified subscriber{endorseCounts[post.id] !== 1 ? 's' : ''} endorse{endorseCounts[post.id] === 1 ? 's' : ''} this
                        </span>
                      )}
                      {connected && hasActivePass && !endorsedIds.has(post.id) && (
                        <button
                          onClick={() => handleEndorse(post.id)}
                          disabled={endorsingId === post.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-white/50 hover:text-amber-300 hover:bg-amber-500/10 border border-white/[0.06] hover:border-amber-500/20 transition-all disabled:opacity-40"
                          aria-label="Endorse this post as a verified subscriber"
                        >
                          <ThumbsUp className="w-3 h-3" aria-hidden="true" />
                          <Shield className="w-2.5 h-2.5" aria-hidden="true" />
                          {endorsingId === post.id ? 'Endorsing...' : 'Endorse'}
                        </button>
                      )}
                      {connected && hasActivePass && endorsedIds.has(post.id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-amber-400/60">
                          <ThumbsUp className="w-3 h-3 fill-current" aria-hidden="true" />
                          Endorsed
                        </span>
                      )}
                    </div>
                  )}

                  {/* Interactions bar */}
                  {unlocked && (
                    <div className="mt-3 pt-2 border-t border-white/[0.04]">
                      <PostInteractions
                        contentId={post.id}
                        readingTime={displayBody ? estimateReadingTime(displayBody) : undefined}
                        creatorAddress={creatorAddress}
                        postTitle={post.title || ''}
                      />
                    </div>
                  )}

                  {/* Free post CTA — subtle nudge to subscribe for more */}
                  {isFreePost && unlocked && (
                    <div className="mt-3 pt-2 border-t border-emerald-500/10">
                      <p className="text-xs text-white/50 text-center">
                        Enjoying this free post? <span className="text-white/60">Subscribe</span> to unlock exclusive content from this creator.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4">
                      {/* Owner actions: Edit & Delete (only for connected creator) */}
                      {walletAddress && walletAddress === creatorAddress && post.contentId !== 'seed' && (
                        <>
                          <button
                            onClick={() => {
                              // Navigate to dashboard edit — uses window.location to signal edit intent
                              window.location.href = `/dashboard?edit=${post.id}`
                            }}
                            className="text-xs text-white/60 hover:text-blue-400 transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded px-1"
                            aria-label={`Edit post: ${post.title}`}
                          >
                            <Pencil className="w-3 h-3" aria-hidden="true" />
                            Edit
                          </button>
                          {deleteConfirmId === post.id ? (
                            <span className="flex items-center gap-1.5">
                              <button
                                onClick={async () => {
                                  setDeletingId(post.id)
                                  try {
                                    await deleteContent(post.contentId, post.contentId)
                                    toast.success('Post deleted')
                                    setPosts((prev) => prev.filter((p) => p.id !== post.id))
                                  } catch {
                                    toast.error('Failed to delete post')
                                  } finally {
                                    setDeletingId(null)
                                    setDeleteConfirmId(null)
                                  }
                                }}
                                disabled={deletingId === post.id}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:outline-none rounded px-1"
                              >
                                {deletingId === post.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                                )}
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-xs text-white/50 hover:text-white/70 transition-colors rounded px-1"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(post.id)}
                              className="text-xs text-white/60 hover:text-red-400 transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded px-1"
                              aria-label={`Delete post: ${post.title}`}
                            >
                              <Trash2 className="w-3 h-3" aria-hidden="true" />
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                      {unlocked && post.contentId !== 'seed' && (
                        <button
                          onClick={() => setDisputePost({ contentId: post.contentId, title: post.title })}
                          className="text-xs text-white/60 hover:text-red-400 transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded px-1"
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
      <div className="mt-4 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-white/70 shrink-0" aria-hidden="true" />
          <p className="text-xs text-white/60">
            Gated content is end-to-end encrypted. The server stores only ciphertext it cannot read. Decryption happens in your browser using keys derived from your subscription pass.
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
