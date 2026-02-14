'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Lock, Unlock, Star, MessageSquare, Crown, Shield, RefreshCw } from 'lucide-react'
import { useContentFeed } from '@/hooks/useContentFeed'
import type { AccessPass, ContentPost } from '@/types'

interface Props {
  creatorAddress: string
  userPasses: AccessPass[]
  connected: boolean
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

export default function ContentFeed({ creatorAddress, userPasses, connected, refreshKey, blockHeight }: Props) {
  const { getPostsForCreator, loading } = useContentFeed()
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [error, setError] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

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

  const activePasses = blockHeight != null
    ? userPasses.filter(p => p.expiresAt === 0 || p.expiresAt > blockHeight)
    : userPasses
  const highestTier = activePasses.reduce(
    (max, p) => Math.max(max, p.tier),
    0
  )

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-2">
        Exclusive Content
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Content gating is client-side — your AccessPass record is checked locally in your browser. No server ever sees your pass.
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
          {posts.map((post, i) => {
            const tier = tierConfig[post.minTier] || tierConfig[1]
            const unlocked = highestTier >= post.minTier
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

                  {unlocked ? (
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {post.body}
                    </p>
                  ) : (
                    <div className="relative">
                      <p className="text-sm text-slate-600 blur-sm select-none" aria-hidden>
                        {post.body.slice(0, 120)}...
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm text-slate-500 bg-[#0a0a0f]/80 px-3 py-1.5 rounded-lg">
                          {connected
                            ? `Subscribe to ${tier.name} or higher to unlock`
                            : 'Connect wallet and subscribe to unlock'}
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
            Content is gated by your AccessPass — checked locally in your browser. Zero server involvement.
          </p>
        </div>
      </div>
    </div>
  )
}
