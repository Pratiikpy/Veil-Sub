'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Copy,
  Check,
  ExternalLink,
  Shield,
  Share2,
  Settings,
  Award,
  CheckCircle2,
  FileText,
  Sparkles,
  Wallet,
  ArrowDownToLine,
  Plus,
  ChevronRight,
  TrendingUp,
  Users,
  Coins,
  X,
  Pencil,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const CelebrationBurst = dynamic(() => import('@/components/CelebrationBurst'), { ssr: false })
import AddressAvatar from '@/components/ui/AddressAvatar'
import CreatePostForm from '@/components/CreatePostForm'
import ProfileEditor from '@/components/dashboard/ProfileEditor'
import PostsList from '@/components/dashboard/PostsList'
import { formatCredits, shortenAddress } from '@/lib/utils'
import { PLATFORM_FEE_PCT, PLATFORM_ADDRESS, DEPLOYED_PROGRAM_ID, MICROCREDITS_PER_CREDIT } from '@/lib/config'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useCreatorTiers, invalidateCreatorTierCache } from '@/hooks/useCreatorTiers'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import TransactionStatus from '@/components/TransactionStatus'
import { TIERS } from '@/types'
import type { CreatorProfile, TxStatus, CustomTierInfo, ContentPost } from '@/types'

const TierCreationDialog = dynamic(() => import('@/components/TierCreationDialog'), { ssr: false })
const ProveThresholdModal = dynamic(() => import('@/components/ProveThresholdModal'), { ssr: false })

// ── Tiny inline sparkline SVG (no dependency needed) ──
function Sparkline({ data, color = '#8B5CF6', width = 80, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" className="inline-block">
      <polyline points={points} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ── Perk Editor (localStorage-backed) ──
interface PerkEditorProps {
  creatorAddress: string
  tierId: number
  onClose: () => void
}

function getPerkKey(address: string, tierId: number) {
  return `veilsub_tier_perks_${address}_${tierId}`
}

function PerkEditor({ creatorAddress, tierId, onClose }: PerkEditorProps) {
  const [perks, setPerks] = useState<string[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(getPerkKey(creatorAddress, tierId))
      if (saved) setPerks(JSON.parse(saved))
      else setPerks([''])
    } catch {
      setPerks([''])
    }
  }, [creatorAddress, tierId])

  const save = () => {
    const filtered = perks.filter((p) => p.trim())
    try {
      localStorage.setItem(getPerkKey(creatorAddress, tierId), JSON.stringify(filtered))
    } catch { /* localStorage full */ }
    toast.success('Perks saved')
    onClose()
  }

  const updatePerk = (index: number, value: string) => {
    setPerks((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const addPerk = () => setPerks((prev) => [...prev, ''])

  const removePerk = (index: number) => {
    setPerks((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <m.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="pt-3 space-y-2">
        {perks.map((perk, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              type="text"
              value={perk}
              onChange={(e) => updatePerk(i, e.target.value)}
              placeholder={`Perk ${i + 1}...`}
              maxLength={80}
              className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-border text-white placeholder-subtle text-xs focus:outline-none focus:border-violet-500 transition-all"
            />
            <button
              onClick={() => removePerk(i)}
              className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              aria-label="Remove perk"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <button
            onClick={addPerk}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-border text-xs text-white/60 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add perk
          </button>
          <button
            onClick={save}
            className="px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-xs text-violet-300 hover:bg-violet-500/25 transition-all"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </m.div>
  )
}

// ── Main RegisteredDashboard ──
interface RegisteredDashboardProps {
  publicKey: string
  stats: CreatorProfile | null
  refreshKey: number
  setRefreshKey: (fn: (k: number) => number) => void
  creatorLink: string
}

export default function RegisteredDashboard({
  publicKey,
  stats,
  refreshKey,
  setRefreshKey,
  creatorLink,
}: RegisteredDashboardProps) {
  const [copied, setCopied] = useState(false)
  const [showTierDialog, setShowTierDialog] = useState(false)
  const [showProveThreshold, setShowProveThreshold] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawTxStatus, setWithdrawTxStatus] = useState<TxStatus>('idle')
  const [withdrawTxId, setWithdrawTxId] = useState<string | null>(null)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [hasShownConfetti, setHasShownConfetti] = useState(false)
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null)
  const [composeExpanded, setComposeExpanded] = useState(false)
  const [editingTierId, setEditingTierId] = useState<number | null>(null)
  const [showAllPosts, setShowAllPosts] = useState(false)
  const [showWithdrawPanel, setShowWithdrawPanel] = useState(false)
  const [showProfileEditor, setShowProfileEditor] = useState(false)

  const { withdrawCreatorRevenue, withdrawPlatformFees } = useVeilSub()
  const { tiers: creatorTiers, tierCount: creatorTierCount, refetch: refetchTiers } = useCreatorTiers(publicKey)
  const { startPolling, stopPolling } = useTransactionPoller()
  const composeRef = useRef<HTMLDivElement>(null)

  // Fake sparkline data (placeholder until real analytics data is available)
  const revenueSpark = useMemo(() => [0, 1, 1, 2, 3, 2, 4, 5, 4, 6, 7, 5, 8], [])
  const subscriberSpark = useMemo(() => [0, 0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 7], [])
  const postSpark = useMemo(() => [0, 1, 1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 5], [])

  // Completion steps for getting-started checklist
  const completedSteps = [
    true, // Registration always done
    Object.keys(creatorTiers).length > 0, // Custom tier
    (stats?.contentCount ?? 0) > 0, // Posted content
    copied, // Shared link
  ].filter(Boolean).length

  useEffect(() => {
    if (completedSteps === 4 && !hasShownConfetti) {
      setShowConfetti(true)
      setHasShownConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [completedSteps, hasShownConfetti])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/creator/${publicKey}`
      )
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Clipboard unavailable. Select and copy the URL manually.')
    }
  }

  const handleWithdraw = async (type: 'creator' | 'platform') => {
    if (withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting') return
    const amount = parseFloat(withdrawAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setWithdrawTxStatus('signing')
    setWithdrawError(null)
    try {
      const microcredits = Math.round(amount * MICROCREDITS_PER_CREDIT)
      const result = type === 'platform'
        ? await withdrawPlatformFees(microcredits)
        : await withdrawCreatorRevenue(microcredits)
      if (result) {
        setWithdrawTxId(result)
        setWithdrawTxStatus('broadcasting')
        startPolling(result, (pollResult) => {
          if (pollResult.status === 'confirmed') {
            setWithdrawTxStatus('confirmed')
            stopPolling()
            setWithdrawAmount('')
            toast.success(`${type === 'platform' ? 'Platform fee' : 'Revenue'} withdrawal complete!`)
          } else if (pollResult.status === 'failed') {
            setWithdrawTxStatus('failed')
            setWithdrawError('Withdrawal could not be completed. Check your on-chain balance and try again.')
            stopPolling()
          }
        })
      } else {
        setWithdrawTxStatus('idle')
        toast.error('Wallet did not approve the withdrawal. Check your balance and try again.')
      }
    } catch (err: unknown) {
      setWithdrawTxStatus('failed')
      setWithdrawError(err instanceof Error ? err.message : 'Withdrawal could not be completed')
      toast.error('Withdrawal could not be completed')
    }
  }

  // USD estimate: rough $0.50/ALEO placeholder for display
  const revenueAleo = (stats?.totalRevenue ?? 0) / MICROCREDITS_PER_CREDIT
  const revenueUsd = (revenueAleo * 0.5).toFixed(2)

  // Build tier display list
  const tierList = useMemo(() => {
    const basePrice = stats?.tierPrice ?? 0
    const confirmedIds = Object.entries(creatorTiers)
      .filter(([, c]) => c.price > 0)
      .map(([id]) => Number(id))
      .sort((a, b) => a - b)
    const tierIds = confirmedIds.length > 0
      ? [1, ...confirmedIds]
      : TIERS.map((t) => t.id)
    const colorPalette = [
      { border: 'border-green-500/20', bg: 'bg-green-500/5', text: 'text-green-300', accent: 'bg-green-500/15' },
      { border: 'border-blue-500/20', bg: 'bg-blue-500/5', text: 'text-blue-300', accent: 'bg-blue-500/15' },
      { border: 'border-violet-500/20', bg: 'bg-violet-500/5', text: 'text-violet-300', accent: 'bg-violet-500/15' },
      { border: 'border-pink-500/20', bg: 'bg-pink-500/5', text: 'text-pink-300', accent: 'bg-pink-500/15' },
      { border: 'border-amber-500/20', bg: 'bg-amber-500/5', text: 'text-amber-300', accent: 'bg-amber-500/15' },
    ]
    return tierIds.map((id, i) => {
      const hardcoded = TIERS.find((t) => t.id === id)
      const custom = creatorTiers[id]
      const tierPrice = custom ? custom.price : basePrice * (hardcoded?.priceMultiplier ?? id)
      const tierName = custom?.name || hardcoded?.name || `Tier ${id}`
      const colors = colorPalette[i % colorPalette.length]
      return { id, name: tierName, price: tierPrice, isCustom: !!custom, colors }
    })
  }, [stats?.tierPrice, creatorTiers])

  // Expand compose when editing a post
  useEffect(() => {
    if (editingPost) {
      setComposeExpanded(true)
      composeRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [editingPost])

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════
          SECTION 1: Top Stats Bar
         ═══════════════════════════════════════════════════════ */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl bg-surface-1 border border-border"
      >
        {/* Status row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-white">Your Page is Live</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-border text-xs text-white/70 hover:bg-white/[0.08] transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <Link
              href={`/creator/${publicKey}`}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-border text-xs text-white/70 hover:bg-white/[0.08] transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View page
            </Link>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Revenue */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span className="text-[11px] text-white/60 uppercase tracking-wider">Revenue</span>
            </div>
            <p className="text-xl font-bold text-white tabular-nums">
              {revenueAleo > 0 ? `~$${revenueUsd}` : '\u2014'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/50">
                {revenueAleo > 0 ? `${formatCredits(stats?.totalRevenue ?? 0)} ALEO` : 'No revenue yet'}
              </span>
              <Sparkline data={revenueSpark} color="#34d399" width={60} height={20} />
            </div>
          </div>

          {/* Subscribers */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
              <span className="text-[11px] text-white/60 uppercase tracking-wider">Subscribers</span>
            </div>
            <p className="text-xl font-bold text-white tabular-nums">
              {(stats?.subscriberCount ?? 0) > 0 ? stats?.subscriberCount : '\u2014'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/50">
                shown as &quot;{stats?.subscriberThreshold ?? 'New'}&quot; publicly
              </span>
              <Sparkline data={subscriberSpark} color="#60a5fa" width={60} height={20} />
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
              <span className="text-[11px] text-white/60 uppercase tracking-wider">Posts</span>
            </div>
            <p className="text-xl font-bold text-white tabular-nums">
              {(stats?.contentCount ?? 0) > 0 ? stats?.contentCount : '\u2014'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/50">
                {(stats?.contentCount ?? 0) > 0 ? 'published' : 'No posts yet'}
              </span>
              <Sparkline data={postSpark} color="#a78bfa" width={60} height={20} />
            </div>
          </div>
        </div>

        {/* Withdraw button */}
        {(stats?.totalRevenue ?? 0) > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            {!showWithdrawPanel ? (
              <button
                onClick={() => setShowWithdrawPanel(true)}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-600/90 text-sm font-semibold text-white hover:bg-emerald-500 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <ArrowDownToLine className="w-4 h-4" aria-hidden="true" />
                Withdraw {formatCredits(stats?.totalRevenue ?? 0)} ALEO
              </button>
            ) : (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Amount in ALEO"
                      step="0.1"
                      min="0.001"
                      aria-label="Withdrawal amount in ALEO"
                      className="w-full px-4 py-2.5 pr-14 rounded-xl bg-black/40 border border-emerald-500/20 text-white text-base placeholder-subtle focus:outline-none focus:border-emerald-400/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(((stats?.totalRevenue ?? 0) / MICROCREDITS_PER_CREDIT).toString())}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                      aria-label="Fill maximum amount"
                    >
                      Max
                    </button>
                  </div>
                  <button
                    onClick={() => handleWithdraw('creator')}
                    disabled={withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting' || !withdrawAmount}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.98]"
                  >
                    <ArrowDownToLine className="w-4 h-4" aria-hidden="true" />
                    {withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting' ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                </div>
                {publicKey === PLATFORM_ADDRESS && (
                  <button
                    onClick={() => handleWithdraw('platform')}
                    disabled={withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting' || !withdrawAmount}
                    className="w-full px-4 py-2 rounded-xl bg-amber-600/80 text-sm font-medium text-white hover:bg-amber-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Withdraw Platform Fees
                  </button>
                )}
                {withdrawTxStatus !== 'idle' && (
                  <TransactionStatus status={withdrawTxStatus} txId={withdrawTxId} errorMessage={withdrawError} />
                )}
                <button
                  onClick={() => setShowWithdrawPanel(false)}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  Cancel
                </button>
              </m.div>
            )}
          </div>
        )}
      </m.div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: Compose Box (Always Visible)
         ═══════════════════════════════════════════════════════ */}
      <m.div
        ref={composeRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {!composeExpanded && !editingPost ? (
          <div
            onClick={() => setComposeExpanded(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setComposeExpanded(true) }}
            role="button"
            tabIndex={0}
            className="p-4 rounded-xl bg-surface-1 border border-border cursor-text hover:border-violet-500/30 transition-all group flex items-center gap-3"
          >
            <AddressAvatar address={publicKey} size={36} className="shrink-0" />
            <p className="text-white/40 text-sm group-hover:text-white/60 transition-colors">
              What&apos;s on your mind? Start writing...
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-surface-1 border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-0">
              <span className="text-xs text-white/60 font-medium">
                {editingPost ? 'Edit Post' : 'New Post'}
              </span>
              <button
                onClick={() => { setComposeExpanded(false); setEditingPost(null) }}
                className="p-1 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-all"
                aria-label="Collapse editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CreatePostForm
              creatorAddress={publicKey}
              onPostCreated={() => {
                setEditingPost(null)
                setComposeExpanded(false)
                setRefreshKey((k) => k + 1)
              }}
              editingPost={editingPost}
              onEditComplete={() => {
                setEditingPost(null)
                setComposeExpanded(false)
                setRefreshKey((k) => k + 1)
              }}
            />
          </div>
        )}
      </m.div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: Getting Started Checklist (conditional)
         ═══════════════════════════════════════════════════════ */}
      {completedSteps < 4 && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="p-5 rounded-2xl bg-gradient-to-br from-violet-600/10 via-violet-500/5 to-transparent border border-violet-500/20 relative overflow-hidden"
        >
          {showConfetti && <CelebrationBurst color="bg-green-400" />}

          {completedSteps >= 3 ? (
            /* Collapsed badge when almost done */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" aria-hidden="true" />
                <span className="text-sm font-medium text-white">
                  {4 - completedSteps} step remaining
                </span>
              </div>
              <span className="text-xs text-violet-300">{completedSteps}/4</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-white mb-0.5 flex items-center gap-2">
                    Getting Started
                  </h2>
                  <p className="text-xs text-white/60">
                    {4 - completedSteps} step{4 - completedSteps !== 1 ? 's' : ''} remaining
                  </p>
                </div>
                <div className="text-sm font-bold text-violet-300">{completedSteps}/4</div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  {
                    done: true,
                    label: 'Register as creator',
                    detail: 'On-chain registration complete',
                  },
                  {
                    done: Object.keys(creatorTiers).length > 0,
                    label: 'Create a custom tier',
                    detail: 'Set flexible pricing',
                    action: () => setShowTierDialog(true),
                    actionLabel: 'Create Tier',
                  },
                  {
                    done: (stats?.contentCount ?? 0) > 0,
                    label: 'Publish your first post',
                    detail: 'Share tier-gated content',
                    action: () => setComposeExpanded(true),
                    actionLabel: 'Write Post',
                  },
                  {
                    done: copied,
                    label: 'Share your page',
                    detail: copied ? 'Link copied!' : 'Invite subscribers',
                    action: copyLink,
                    actionLabel: 'Copy Link',
                  },
                ].map((step) => (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      step.done
                        ? 'bg-green-500/5 border-green-500/15'
                        : 'bg-white/[0.03] border-border'
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" aria-hidden="true" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${step.done ? 'text-white/50 line-through' : 'text-white'}`}>
                        {step.label}
                      </p>
                      <p className="text-[11px] text-white/50">{step.detail}</p>
                    </div>
                    {!step.done && step.action && (
                      <button
                        onClick={step.action}
                        className="px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/20 text-[11px] text-violet-300 hover:bg-violet-500/25 transition-all shrink-0"
                      >
                        {step.actionLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </m.div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SECTION 4: Recent Posts
         ═══════════════════════════════════════════════════════ */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {!showAllPosts ? (
          <div className="p-5 rounded-2xl bg-surface-1 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-400" aria-hidden="true" />
                <h2 className="text-base font-semibold text-white">Recent Posts</h2>
              </div>
              <button
                onClick={() => setShowAllPosts(true)}
                className="text-xs text-violet-300 hover:text-violet-200 transition-colors flex items-center gap-1"
              >
                View all posts <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mini post list (just titles) -- delegates full list to PostsList */}
            <div className="text-sm text-white/60">
              <PostsList
                key={refreshKey}
                address={publicKey}
                onEditPost={(post) => {
                  setEditingPost(post)
                  setComposeExpanded(true)
                  composeRef.current?.scrollIntoView({ behavior: 'smooth' })
                }}
              />
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-surface-1 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-400" aria-hidden="true" />
                <h2 className="text-base font-semibold text-white">All Posts</h2>
              </div>
              <button
                onClick={() => setShowAllPosts(false)}
                className="text-xs text-white/60 hover:text-white transition-colors"
              >
                Show less
              </button>
            </div>
            <PostsList
              key={refreshKey}
              address={publicKey}
              onEditPost={(post) => {
                setEditingPost(post)
                setComposeExpanded(true)
                composeRef.current?.scrollIntoView({ behavior: 'smooth' })
              }}
            />
          </div>
        )}
      </m.div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5: Your Tiers (Horizontal Scroll)
         ═══════════════════════════════════════════════════════ */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-violet-400" aria-hidden="true" />
            <h2 className="text-base font-semibold text-white">Your Tiers</h2>
            {creatorTierCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-medium">
                <Shield className="w-3 h-3" aria-hidden="true" />
                {creatorTierCount} on-chain
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {tierList.map((tier) => (
            <div
              key={tier.id}
              className={`shrink-0 w-48 p-4 rounded-xl border ${tier.colors.border} ${tier.colors.bg} group relative`}
            >
              <p className={`text-sm font-medium ${tier.colors.text} mb-1`}>{tier.name}</p>
              <p className="text-lg font-bold text-white">
                {formatCredits(tier.price)}{' '}
                <span className="text-xs font-normal text-white/60">ALEO</span>
              </p>
              <p className="text-[11px] text-white/50 mt-1">
                {tier.isCustom ? 'Custom price' : `Tier ${tier.id}`}
              </p>

              {/* Hover edit button */}
              <button
                onClick={() => setEditingTierId(editingTierId === tier.id ? null : tier.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/[0.05] text-white/40 hover:text-white/80 hover:bg-white/[0.1] opacity-0 group-hover:opacity-100 transition-all"
                aria-label={`Edit ${tier.name} perks`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {/* Inline perk editor */}
              <AnimatePresence>
                {editingTierId === tier.id && (
                  <PerkEditor
                    creatorAddress={publicKey}
                    tierId={tier.id}
                    onClose={() => setEditingTierId(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* + Create Tier card */}
          <button
            onClick={() => setShowTierDialog(true)}
            className="shrink-0 w-48 p-4 rounded-xl border-2 border-dashed border-border hover:border-violet-500/30 flex flex-col items-center justify-center gap-2 text-white/40 hover:text-violet-300 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] group-hover:bg-violet-500/10 flex items-center justify-center transition-all">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">Create Tier</span>
          </button>
        </div>
      </m.div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6: Activity Feed
         ═══════════════════════════════════════════════════════ */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-2xl bg-surface-1 border border-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-violet-400" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white">Activity</h2>
        </div>

        {(stats?.subscriberCount ?? 0) > 0 || (stats?.totalRevenue ?? 0) > 0 || (stats?.contentCount ?? 0) > 0 ? (
          <div className="space-y-2">
            {(stats?.subscriberCount ?? 0) > 0 && (
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02]">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-sm text-white/80 flex-1">
                  {stats?.subscriberCount} active subscriber{(stats?.subscriberCount ?? 0) !== 1 ? 's' : ''}
                </span>
                <span className="text-[11px] text-white/40">on-chain</span>
              </div>
            )}
            {(stats?.totalRevenue ?? 0) > 0 && (
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02]">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-white/80 flex-1">
                  Revenue accumulated: {formatCredits(stats?.totalRevenue ?? 0)} ALEO
                </span>
                <span className="text-[11px] text-white/40">total</span>
              </div>
            )}
            {(stats?.contentCount ?? 0) > 0 && (
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02]">
                <div className="w-2 h-2 rounded-full bg-violet-400" />
                <span className="text-sm text-white/80 flex-1">
                  {stats?.contentCount} post{(stats?.contentCount ?? 0) !== 1 ? 's' : ''} published on-chain
                </span>
                <span className="text-[11px] text-white/40">total</span>
              </div>
            )}
            <p className="text-[11px] text-white/40 mt-2 italic">
              All activity is anonymized. No subscriber addresses or identities are ever visible.
              Public visitors see threshold badges (e.g. &quot;{stats?.subscriberThreshold ?? '50+'}&quot;) instead of exact counts.
            </p>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-white/50">Activity will appear as subscribers interact with your content</p>
            <p className="text-[11px] text-white/40 mt-1">Subscriptions, tips, and post views -- all anonymized</p>
          </div>
        )}
      </m.div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7: Quick Actions & Settings (inline)
         ═══════════════════════════════════════════════════════ */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid sm:grid-cols-2 gap-4"
      >
        {/* Prove Reputation */}
        <div className="p-4 rounded-xl bg-surface-1 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-violet-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-white">Prove Reputation</h3>
          </div>
          <p className="text-[11px] text-white/60 mb-3">
            Prove your subscriber count exceeds a threshold without revealing the exact number.
          </p>
          <button
            onClick={() => setShowProveThreshold(true)}
            className="px-4 py-2 rounded-lg bg-violet-500/15 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/25 transition-all active:scale-[0.98]"
          >
            Generate Proof
          </button>
        </div>

        {/* Profile Settings */}
        <div className="p-4 rounded-xl bg-surface-1 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-violet-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-white">Profile Settings</h3>
          </div>
          <p className="text-[11px] text-white/60 mb-3">
            Edit your display name, bio, and creator page details.
          </p>
          <button
            onClick={() => setShowProfileEditor(!showProfileEditor)}
            className="px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-xs text-white/70 hover:bg-white/[0.08] transition-all active:scale-[0.98]"
          >
            {showProfileEditor ? 'Hide Editor' : 'Edit Profile'}
          </button>
        </div>
      </m.div>

      {/* Inline Profile Editor (toggle) */}
      <AnimatePresence>
        {showProfileEditor && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ProfileEditor address={publicKey} />
          </m.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          SECTION 8: Verified On-Chain links
         ═══════════════════════════════════════════════════════ */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 rounded-xl bg-surface-1 border border-border"
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-green-400" aria-hidden="true" />
          <h3 className="text-sm font-medium text-green-300">Verified On-Chain</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { href: `https://testnet.explorer.provable.com/program/${DEPLOYED_PROGRAM_ID}`, label: 'Provable Explorer' },
            { href: `https://testnet.aleoscan.io/program?id=${DEPLOYED_PROGRAM_ID}`, label: 'Aleoscan' },
            { href: `https://testnet.explorer.provable.com/address/${publicKey}`, label: 'Your On-Chain Activity' },
            { href: `https://testnet.aleoscan.io/address?a=${publicKey}`, label: 'Your Aleoscan Profile' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-border text-xs text-white hover:border-green-500/30 transition-all"
            >
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
              {link.label}
            </a>
          ))}
        </div>
      </m.div>

      {/* Platform fee note */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-center py-2"
      >
        <p className="text-[11px] text-white/40">
          VeilSub takes a {PLATFORM_FEE_PCT}% platform fee. {100 - PLATFORM_FEE_PCT}% of all payments go directly to you via private transfer. Subscriber identities are never revealed.
        </p>
      </m.div>

      {/* Modals */}
      <TierCreationDialog
        isOpen={showTierDialog}
        onClose={() => setShowTierDialog(false)}
        creatorAddress={publicKey}
        onSuccess={() => {
          toast.success('New tier created!')
          invalidateCreatorTierCache(publicKey)
          refetchTiers()
        }}
      />
      <ProveThresholdModal
        isOpen={showProveThreshold}
        onClose={() => setShowProveThreshold(false)}
        currentSubscriberCount={stats?.subscriberCount}
      />
    </div>
  )
}
