'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import {
  Settings,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Info,
  Share2,
  Lock,
  Percent,
  ArrowRight,
  Sparkles,
  Trash2,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { useSupabase } from '@/hooks/useSupabase'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import StatsPanel from '@/components/StatsPanel'
import TransactionStatus from '@/components/TransactionStatus'
import CreatorQRCode from '@/components/CreatorQRCode'
import CreatePostForm from '@/components/CreatePostForm'
import { useContentFeed } from '@/hooks/useContentFeed'
import ActivityChart from '@/components/ActivityChart'
import TierDistribution from '@/components/TierDistribution'
import PageTransition from '@/components/PageTransition'
import CelebrationBurst from '@/components/CelebrationBurst'
import { creditsToMicrocredits, formatCredits, shortenAddress } from '@/lib/utils'
import { PLATFORM_FEE_PCT, PROGRAM_ID } from '@/lib/config'
import { TIERS } from '@/types'
import type { TxStatus, CreatorProfile } from '@/types'

function ShareText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Clipboard not available. Please copy manually.')
    }
  }

  return (
    <div className="relative">
      <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 whitespace-pre-wrap break-all">
        {text}
      </div>
      <button
        onClick={copy}
        className="mt-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2 active:scale-[0.98]"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied' : 'Copy to clipboard'}
      </button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse mb-8">
          <div className="h-8 w-52 rounded-lg bg-white/[0.06] mb-3" />
          <div className="h-4 w-80 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="max-w-lg animate-pulse">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-5 h-5 rounded bg-white/[0.06]" />
              <div className="h-5 w-40 rounded-lg bg-white/[0.06]" />
            </div>
            <div className="mb-6">
              <div className="h-4 w-48 rounded bg-white/[0.04] mb-2" />
              <div className="h-12 w-full rounded-xl bg-white/[0.04]" />
              <div className="h-3 w-52 rounded bg-white/[0.03] mt-2" />
            </div>
            <div className="h-20 w-full rounded-lg bg-white/[0.03] mb-6" />
            <div className="h-12 w-full rounded-xl bg-white/[0.06]" />
          </div>
        </div>
      </div>
    </div>
  )
}

function PostsList({ address }: { address: string }) {
  const { signMessage } = useWallet()
  const { getPostsForCreator, deletePost } = useContentFeed()
  const [posts, setPosts] = useState<{ id: string; title: string; minTier: number; createdAt?: string; contentId?: string }[]>([])
  const [postsLoaded, setPostsLoaded] = useState(false)

  const tierLabels: Record<number, { name: string; color: string }> = {
    1: { name: 'Supporter', color: 'text-green-300 bg-green-500/10 border-green-500/20' },
    2: { name: 'Premium', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
    3: { name: 'VIP', color: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
  }

  const fetchPosts = useCallback(async () => {
    try {
      const result = await getPostsForCreator(address)
      setPosts(result.filter((p) => p.contentId !== 'seed'))
    } catch {
      // Content feed has its own fallback
    }
    setPostsLoaded(true)
  }, [address, getPostsForCreator])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleDelete = async (postId: string) => {
    const wrappedSign = signMessage
      ? async (msg: Uint8Array) => {
          const result = await signMessage(msg)
          if (!result) throw new Error('Signing cancelled')
          return result
        }
      : null
    const ok = await deletePost(address, postId, wrappedSign)
    if (ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      toast.success('Post deleted')
    } else {
      toast.error('Failed to delete post')
    }
  }

  if (!postsLoaded) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24 }}
      className="p-6 rounded-xl bg-white/[0.02] border border-white/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Your Posts</h2>
        <span className="text-xs text-slate-500 ml-auto">{posts.length} posts</span>
      </div>
      {posts.length === 0 ? (
        <p className="text-sm text-slate-500">No posts yet. Create your first post above.</p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const tier = tierLabels[post.minTier] || tierLabels[1]
            return (
              <div
                key={post.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${tier.color}`}>
                      {tier.name}
                    </span>
                    {post.createdAt && (
                      <span className="text-xs text-slate-600">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    )}
                    {post.contentId && post.contentId !== 'seed' && (
                      <span className="text-xs text-green-500/60">on-chain</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
                  title="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function ProfileEditor({ address }: { address: string }) {
  const { signMessage } = useWallet()
  const { getCreatorProfile, upsertCreatorProfile } = useSupabase()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [saved, setSaved] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getCreatorProfile(address).then((profile) => {
      if (cancelled) return
      if (profile) {
        setName(profile.display_name || '')
        setBio(profile.bio || '')
      }
      setProfileLoaded(true)
    }).catch(() => {
      if (cancelled) return
      setProfileLoaded(true)
    })
    return () => { cancelled = true }
  }, [address, getCreatorProfile])

  const handleSave = async () => {
    const wrappedSign = signMessage
      ? async (msg: Uint8Array) => {
          const result = await signMessage(msg)
          if (!result) throw new Error('Signing cancelled')
          return result
        }
      : null
    const result = await upsertCreatorProfile(address, name || undefined, bio || undefined, wrappedSign)
    if (result) {
      setSaved(true)
      toast.success('Profile saved!')
      setTimeout(() => setSaved(false), 2000)
    } else {
      toast.error('Failed to save profile. Please try again.')
    }
  }

  if (!profileLoaded) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="p-6 rounded-xl bg-white/[0.02] border border-white/10"
    >
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Profile</h2>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Display name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your creator name"
            maxLength={50}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell subscribers what you create..."
            maxLength={200}
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm resize-none"
          />
        </div>
        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 hover:bg-violet-500/20 transition-colors active:scale-[0.98]"
        >
          {saved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { address: publicKey, connected, signMessage } = useWallet()
  const { registerCreator } = useVeilSub()
  const { fetchCreatorStats } = useCreatorStats()
  const { startPolling, stopPolling } = useTransactionPoller()
  const { upsertCreatorProfile, getCreatorProfile } = useSupabase()

  const [price, setPrice] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bioText, setBioText] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [stats, setStats] = useState<CreatorProfile | null>(null)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creatorLink, setCreatorLink] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  // Set creator link on client only (avoid hydration mismatch)
  useEffect(() => {
    if (publicKey) {
      setCreatorLink(`${window.location.origin}/creator/${publicKey}`)
    }
  }, [publicKey])

  // Check if already registered
  useEffect(() => {
    if (!publicKey) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetchCreatorStats(publicKey).then((s) => {
      if (cancelled) return
      setStats(s)
      setIsRegistered(s.tierPrice !== null)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [publicKey, fetchCreatorStats, refreshKey])

  // Stop polling on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const handleRegister = async () => {
    if (txStatus !== 'idle' && txStatus !== 'failed') return
    const priceNum = parseFloat(price)
    if (!priceNum || priceNum <= 0) return

    setTxStatus('signing')
    try {
      const id = await registerCreator(creditsToMicrocredits(priceNum))
      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')
        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            if (result.resolvedTxId) setTxId(result.resolvedTxId)
            setTxStatus('confirmed')
            toast.success('Registered on-chain!')
            // Save profile (best-effort, non-blocking)
            if (publicKey) {
              const wrappedSign = signMessage
                ? async (msg: Uint8Array) => {
                    const r = await signMessage(msg)
                    if (!r) throw new Error('Signing cancelled')
                    return r
                  }
                : null
              upsertCreatorProfile(publicKey, displayName || undefined, bioText || undefined, wrappedSign)
            }
            setShowCelebration(true)
            celebrationTimerRef.current = setTimeout(() => {
              setShowCelebration(false)
              setIsRegistered(true)
              setRefreshKey((k) => k + 1)
            }, 4000)
          } else if (result.status === 'failed') {
            setTxStatus('failed')
          }
        })
      } else {
        setTxStatus('failed')
      }
    } catch (err) {
      setTxStatus('failed')
      setTxId(null)
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  const copyLink = async () => {
    if (!publicKey) return
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/creator/${publicKey}`
      )
      setCopied(true)
      toast.success('Link copied!')
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Clipboard not available. Please copy manually.')
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center">
          <Shield className="w-12 h-12 text-violet-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-slate-400 mb-8">
            Connect your Leo Wallet to access the creator dashboard.
          </p>
          <div className="text-left p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
            <p className="text-sm font-medium text-white">Getting Started</p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-sm text-slate-400">
                  Install{' '}
                  <a href="https://www.leo.app/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline">
                    Leo Wallet
                  </a>{' '}
                  browser extension
                </p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-sm text-slate-400">
                  Get testnet credits from the{' '}
                  <a href="https://faucet.aleo.org/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline">
                    Aleo Faucet
                  </a>
                </p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center">3</span>
                <p className="text-sm text-slate-400">
                  Click <strong className="text-white">&quot;Select Wallet&quot;</strong> above to connect
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <PageTransition className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            Creator Dashboard
          </h1>
          <p className="text-slate-400">
            {isRegistered
              ? 'Manage your subscription settings and view aggregate stats.'
              : 'Register as a creator to start accepting private subscriptions.'}
          </p>
        </motion.div>

        {showCelebration ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 relative"
          >
            <CelebrationBurst />
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Shield className="w-16 h-16 text-violet-400 mb-6" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-3">
              You&apos;re Registered!
            </h2>
            <p className="text-slate-400 text-center max-w-md mb-8">
              Your creator profile is live on-chain. Subscribers can now find you and subscribe privately.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="space-y-3 text-center"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Next steps</p>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Link
                  href={`/creator/${publicKey}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 hover:bg-violet-500/20 transition-colors active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4" />
                  View your page
                </Link>
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors active:scale-[0.98]"
                >
                  <Share2 className="w-4 h-4" />
                  Share your link
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : !isRegistered ? (
          /* Registration Form */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg"
          >
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-semibold text-white">
                  Register as Creator
                </h2>
              </div>

              {txStatus === 'idle' || txStatus === 'failed' ? (
                <>
                  <div className="mb-6">
                    <label className="block text-sm text-slate-400 mb-2">
                      Base subscription price (ALEO credits)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="5"
                        min="0.1"
                        step="0.1"
                        onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                        ALEO
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Premium tier = 2x, VIP tier = 5x this price.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm text-slate-400 mb-2">
                      Display name (optional)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your creator name"
                      maxLength={50}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm text-slate-400 mb-2">
                      Bio (optional)
                    </label>
                    <textarea
                      value={bioText}
                      onChange={(e) => setBioText(e.target.value)}
                      placeholder="Tell subscribers what you create..."
                      maxLength={200}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10 mb-6">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-400">
                        You&apos;ll never see who subscribes — only aggregate
                        subscriber count and total revenue. Privacy is the core
                        feature. VeilSub takes a {PLATFORM_FEE_PCT}% platform fee on all subscriptions and tips.
                      </p>
                    </div>
                  </div>

                  {txStatus === 'failed' && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                      <p className="text-xs text-red-400">Registration failed. Please try again.</p>
                    </div>
                  )}

                  <button
                    onClick={handleRegister}
                    disabled={!price || parseFloat(price) <= 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {txStatus === 'failed' ? 'Retry' : 'Register'}
                  </button>
                </>
              ) : (
                <TransactionStatus status={txStatus} txId={txId} />
              )}
            </div>
          </motion.div>
        ) : (
          /* Registered Creator Dashboard */
          <div className="space-y-8">
            {/* Share Link */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <div className="flex-1">
                <p className="text-sm text-violet-300 font-medium mb-1">
                  Your creator page
                </p>
                <p className="text-xs text-slate-400 break-all">
                  {creatorLink || `/creator/${shortenAddress(publicKey || '')}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2 active:scale-[0.98]"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <Link
                  href={`/creator/${publicKey}`}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2 active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4" />
                  View
                </Link>
              </div>
            </motion.div>

            {/* QR Code */}
            {publicKey && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <CreatorQRCode creatorAddress={publicKey} />
              </motion.div>
            )}

            {/* Profile Editor */}
            {publicKey && <ProfileEditor address={publicKey} />}

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="text-lg font-semibold text-white mb-4">
                On-Chain Stats
              </h2>
              {publicKey && (
                <StatsPanel
                  creatorAddress={publicKey}
                  refreshKey={refreshKey}
                />
              )}
            </motion.div>

            {/* Verified On-Chain */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.155 }}
              className="p-4 rounded-xl bg-green-500/5 border border-green-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-medium text-green-300">Verified On-Chain</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://testnet.explorer.provable.com/program/${PROGRAM_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-300 hover:text-white hover:border-green-500/30 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Provable Explorer
                </a>
                <a
                  href={`https://testnet.aleoscan.io/program?id=${PROGRAM_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-300 hover:text-white hover:border-green-500/30 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Aleoscan
                </a>
                {publicKey && (
                  <a
                    href={`https://testnet.explorer.provable.com/program/${PROGRAM_ID}/mapping/tier_prices/${publicKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-300 hover:text-white hover:border-green-500/30 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Your tier_prices entry
                  </a>
                )}
              </div>
            </motion.div>

            {/* Analytics */}
            {publicKey && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    Analytics
                  </h2>
                  <span className="text-xs text-slate-500">All values verified on-chain</span>
                </div>

                {/* 30-Day Overview Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Subscribers', value: stats?.subscriberCount ?? 0, suffix: '' },
                    { label: 'Total Revenue', value: stats?.totalRevenue ? formatCredits(stats.totalRevenue) : '0', suffix: 'ALEO' },
                    { label: 'Posts Published', value: stats?.contentCount ?? 0, suffix: '' },
                    { label: 'Base Price', value: stats?.tierPrice ? formatCredits(stats.tierPrice) : '0', suffix: 'ALEO' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.16 + i * 0.04 }}
                      className="p-4 rounded-xl bg-[#0a0a10]/60 backdrop-blur-xl border border-white/[0.10] shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:border-white/[0.16] transition-all"
                    >
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5">{stat.label}</p>
                      <p className="text-2xl font-bold text-white tabular-nums">
                        {stat.value}
                        {stat.suffix && <span className="text-xs font-normal text-slate-500 ml-1">{stat.suffix}</span>}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <ActivityChart creatorAddress={publicKey} />
                  <TierDistribution creatorAddress={publicKey} />
                </div>
              </motion.div>
            )}

            {/* Tier Pricing Breakdown */}
            {stats?.tierPrice != null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
              >
                <h2 className="text-lg font-semibold text-white mb-4">
                  Your Tier Pricing
                </h2>
                <div className="grid sm:grid-cols-3 gap-3">
                  {TIERS.map((tier) => {
                    const tierPrice = (stats?.tierPrice ?? 0) * tier.priceMultiplier
                    const colors =
                      tier.id === 3
                        ? 'border-violet-500/20 bg-violet-500/5'
                        : tier.id === 2
                          ? 'border-blue-500/20 bg-blue-500/5'
                          : 'border-green-500/20 bg-green-500/5'
                    const textColor =
                      tier.id === 3
                        ? 'text-violet-300'
                        : tier.id === 2
                          ? 'text-blue-300'
                          : 'text-green-300'
                    return (
                      <div
                        key={tier.id}
                        className={`p-4 rounded-xl border ${colors}`}
                      >
                        <p className={`text-sm font-medium ${textColor} mb-1`}>
                          {tier.name}
                        </p>
                        <p className="text-xl font-bold text-white">
                          {formatCredits(tierPrice)}{' '}
                          <span className="text-xs font-normal text-slate-500">ALEO</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {tier.priceMultiplier}x base price
                        </p>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Platform Fee Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-medium text-white">Platform Fee</h3>
              </div>
              <p className="text-xs text-slate-400">
                VeilSub takes a {PLATFORM_FEE_PCT}% platform fee on subscriptions and tips.
                {100 - PLATFORM_FEE_PCT}% goes directly to you via private transfer.
                Both payments are private — subscribers remain anonymous to you and to the platform.
              </p>
            </motion.div>

            {/* Create Post */}
            {publicKey && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                <CreatePostForm
                  creatorAddress={publicKey}
                  onPostCreated={() => setRefreshKey((k) => k + 1)}
                />
              </motion.div>
            )}

            {/* Posts List */}
            {publicKey && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
              >
                <PostsList address={publicKey} />
              </motion.div>
            )}

            {/* Content Gating Explainer */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-6 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <h2 className="text-lg font-semibold text-white mb-3">
                How Content Gating Works
              </h2>
              <div className="space-y-3 text-sm text-slate-400">
                <p>
                  Subscribers receive a private <strong className="text-white">AccessPass</strong> record
                  in their wallet with an expiry of ~30 days. This record proves they have access without
                  revealing their identity.
                </p>
                <p>
                  When a subscriber visits your gated content, they can prove
                  access by executing the <code className="px-1.5 py-0.5 rounded bg-white/10 text-violet-300 text-xs">verify_access</code> transition,
                  which consumes and re-creates their pass — proving ownership
                  cryptographically. Access checks have zero public footprint.
                </p>
                <p>
                  You see total subscribers and revenue. You never see individual
                  subscriber identities. That&apos;s the power of zero-knowledge proofs.
                </p>
              </div>
            </motion.div>

            {/* Share Your Page */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="p-6 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-semibold text-white">
                  Share Your Page
                </h2>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Copy a ready-made message to share on social media or messaging apps.
              </p>
              <ShareText
                text={`Support me privately on VeilSub — no one will know you subscribed. Powered by Aleo zero-knowledge proofs.\n${creatorLink || `/creator/${publicKey}`}`}
              />
            </motion.div>

            {/* Active Gated Content Note */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-xl bg-green-500/5 border border-green-500/20"
            >
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-green-300 font-medium mb-1">
                    Exclusive content is live
                  </p>
                  <p className="text-xs text-slate-400">
                    Your subscribers can now see tier-gated exclusive content on your creator page.
                    Content visibility is determined by each subscriber&apos;s AccessPass — checked
                    locally in their browser, with no server involved. Subscriptions expire after ~30 days
                    and can be renewed.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
