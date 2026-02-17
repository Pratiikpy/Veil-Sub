'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Lock, Unlock, Star, MessageSquare, Crown, Shield, RefreshCw, Loader2, FileText, ArrowRight } from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useContentFeed } from '@/hooks/useContentFeed'
import type { AccessPass, ContentPost } from '@/types'

interface Props {
  creatorAddress: string
  userPasses: AccessPass[]
  connected: boolean
  walletAddress?: string | null
  refreshKey?: number
  blockHeight?: number | null
}

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
          className="rounded-xl border border-white/5 bg-white/[0.01] p-5 animate-pulse"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white/5" />
            <div className="flex-1 h-4 rounded bg-white/5" />
            <div className="w-16 h-5 rounded-full bg-white/5" />
          </div>
          <div className="space-y-2">
            <div className="h-3 rounded bg-white/[0.03] w-full" />
            <div className="h-3 rounded bg-white/[0.03] w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ContentFeed({ creatorAddress, userPasses, connected, walletAddress, refreshKey, blockHeight }: Props) {
  const { signMessage } = useWallet()
  const { getPostsForCreator, unlockPost, loading } = useContentFeed()
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [unlockedBodies, setUnlockedBodies] = useState<Record<string, string>>({})
  const [unlockingIds, setUnlockingIds] = useState<Set<string>>(new Set())
  const unlockingRef = useRef(new Set<string>())
  const failedUnlocksRef = useRef(new Set<string>())
  const unlockedBodiesRef = useRef<Record<string, string>>({})
  const signMessageRef = useRef(signMessage)
  const unlockRunningRef = useRef(false)
  const [error, setError] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  // Keep refs in sync without triggering effects
  signMessageRef.current = signMessage
  unlockedBodiesRef.current = unlockedBodies

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

  // One-shot auto-unlock: runs once when posts load and user has passes.
  // Does NOT re-run on signMessage/unlockedBodies/activePasses changes.
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

        const body = await unlockPost(post.id, creatorAddress, walletAddress, activePassesRef.current, wrappedSign)

        // Always clean up and process result — never discard a completed sign
        unlockingRef.current.delete(post.id)
        setUnlockingIds((prev) => {
          const next = new Set(prev)
          next.delete(post.id)
          return next
        })

        if (body) {
          setUnlockedBodies((prev) => ({ ...prev, [post.id]: body }))
        } else {
          failedUnlocksRef.current.add(post.id)
        }
      }
      unlockRunningRef.current = false
    })()

    // No cleanup that sets cancelled — we WANT in-flight unlocks to complete
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, highestTier, walletAddress, creatorAddress])

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-2">
        Exclusive Content
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Content is server-gated — locked posts are never sent to your browser until your AccessPass is verified.
      </p>

      {initialLoad && loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
          <p className="text-sm text-red-400 mb-3">Failed to load posts</p>
          <button
            onClick={fetchPosts}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.length === 0 && (
            <div className="p-8 rounded-xl bg-white/[0.02] border border-white/5 text-center">
              <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-1">No Posts Yet</h3>
              <p className="text-sm text-slate-500">
                This creator hasn&apos;t published any exclusive content yet. Check back soon!
              </p>
            </div>
          )}
          {posts.map((post, i) => {
            const tier = tierConfig[post.minTier] || tierConfig[1]
            const hasAccess = highestTier >= post.minTier
            const unlockedBody = unlockedBodies[post.id]
            const isUnlocking = unlockingIds.has(post.id)
            const displayBody = unlockedBody || post.body
            const unlocked = hasAccess && displayBody != null
            const Icon = tier.icon

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`relative rounded-xl border overflow-hidden ${
                  unlocked
                    ? `${tier.border} ${tier.bg}`
                    : 'border-white/5 bg-white/[0.01]'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        unlocked ? tier.lockBg : 'bg-white/5'
                      }`}
                    >
                      {unlocked ? (
                        <Icon className={`w-4 h-4 ${tier.text}`} />
                      ) : isUnlocking ? (
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3
                        className={`font-medium truncate ${
                          unlocked ? 'text-white' : 'text-slate-500'
                        }`}
                      >
                        {post.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs border shrink-0 ${
                          unlocked
                            ? `${tier.text} ${tier.lockBg} ${tier.border}`
                            : 'text-slate-600 bg-white/[0.03] border-white/[0.06]'
                        }`}
                      >
                        {tier.name}
                      </span>
                    </div>
                    {unlocked && (
                      <Unlock className={`w-3.5 h-3.5 shrink-0 ${tier.text}`} />
                    )}
                  </div>

                  {unlocked && displayBody ? (
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {displayBody}
                    </p>
                  ) : isUnlocking ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                      <p className="text-sm text-slate-400">Verifying access pass...</p>
                    </div>
                  ) : (
                    <div className="py-3">
                      {/* Blurred placeholder lines */}
                      <div className="space-y-2 mb-4">
                        <div className="h-3 rounded bg-gradient-to-r from-white/[0.06] to-white/[0.02] w-full blur-sm" />
                        <div className="h-3 rounded bg-gradient-to-r from-white/[0.05] to-white/[0.02] w-[85%] blur-sm" />
                        <div className="h-3 rounded bg-gradient-to-r from-white/[0.04] to-white/[0.01] w-[60%] blur-sm" />
                      </div>
                      {/* Pulsing lock icon */}
                      <div className="flex flex-col items-center gap-3">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${tier.lockBg}`}
                        >
                          <Lock className={`w-4.5 h-4.5 ${tier.text}`} />
                        </motion.div>
                        <button
                          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${tier.lockBg} ${tier.text} border ${tier.border} hover:brightness-125 active:scale-[0.98]`}
                          disabled
                        >
                          {connected
                            ? `Subscribe to ${tier.name} to unlock`
                            : 'Connect wallet to unlock'}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <p className="text-xs text-slate-600">
                          Content is server-protected — not visible in network requests
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    {post.contentId !== 'seed' && (
                      <p className="text-xs text-slate-600">
                        Published on-chain
                      </p>
                    )}
                    {post.createdAt && (
                      <p className="text-xs text-slate-600 ml-auto">
                        {timeAgo(post.createdAt)}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
      <div className="mt-4 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <p className="text-xs text-slate-500">
            Gated content is server-protected. Bodies are only delivered after AccessPass verification — never exposed in network requests.
          </p>
        </div>
      </div>
    </div>
  )
}
