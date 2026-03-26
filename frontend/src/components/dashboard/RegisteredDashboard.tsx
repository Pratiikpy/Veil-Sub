'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Copy,
  Check,
  ExternalLink,
  Shield,
  Settings,
  FileText,
  ArrowDownToLine,
  Plus,
  ChevronRight,
  Users,
  Coins,
  X,
  Pencil,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'

const CelebrationBurst = dynamic(() => import('@/components/CelebrationBurst'), { ssr: false })
import AddressAvatar from '@/components/ui/AddressAvatar'
import CreatePostForm from '@/components/CreatePostForm'
import ProfileEditor from '@/components/dashboard/ProfileEditor'
import PostsList from '@/components/dashboard/PostsList'
import { formatCredits, formatUsd, shortenAddress } from '@/lib/utils'
import { PLATFORM_FEE_PCT, PLATFORM_ADDRESS, DEPLOYED_PROGRAM_ID, MICROCREDITS_PER_CREDIT, getCreatorHash } from '@/lib/config'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useCreatorTiers, invalidateCreatorTierCache } from '@/hooks/useCreatorTiers'
import { useCreatorPerks } from '@/hooks/useCreatorPerks'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import TransactionStatus from '@/components/TransactionStatus'
import { TIERS } from '@/types'
import type { CreatorProfile, TxStatus, CustomTierInfo, ContentPost } from '@/types'

const TierCreationDialog = dynamic(() => import('@/components/TierCreationDialog'), { ssr: false })
const ProveThresholdModal = dynamic(() => import('@/components/ProveThresholdModal'), { ssr: false })

// ── Perk Editor (syncs to Supabase via useCreatorPerks) ──
interface PerkEditorProps {
  creatorAddress: string
  tierId: number
  onClose: () => void
}

function PerkEditor({ creatorAddress, tierId, onClose }: PerkEditorProps) {
  const { perks: savedPerksMap, savePerks } = useCreatorPerks(creatorAddress)
  const [perks, setPerks] = useState<string[]>([])

  useEffect(() => {
    const existing = savedPerksMap[tierId]
    if (existing && existing.length > 0) {
      setPerks(existing)
    } else {
      setPerks([''])
    }
  }, [savedPerksMap, tierId])

  const save = async () => {
    const filtered = perks.filter((p) => p.trim())
    await savePerks(tierId, filtered)
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
              className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-border text-white placeholder-subtle text-xs focus:outline-none focus:border-white/30 transition-all"
            />
            <button
              onClick={() => removePerk(i)}
              className="p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
            className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs text-white/70 hover:bg-white/15 transition-all"
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
  profileName?: string | null
  profileImageUrl?: string | null
}

export default function RegisteredDashboard({
  publicKey,
  stats,
  refreshKey,
  profileName,
  profileImageUrl,
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

  // On-chain withdrawable balance (current creator_revenue mapping value)
  const [onChainRevenue, setOnChainRevenue] = useState<number | null>(null)

  const { withdrawCreatorRevenue, withdrawPlatformFees } = useVeilSub()
  const { connected } = useWallet()
  const { tiers: creatorTiers, tierCount: creatorTierCount, refetch: refetchTiers, error: tiersError } = useCreatorTiers(publicKey)
  const { startPolling, stopPolling } = useTransactionPoller()
  const composeRef = useRef<HTMLDivElement>(null)

  // Fetch on-chain total_revenue mapping — this is the lifetime cumulative revenue.
  // Note: The contract decrements total_revenue on withdrawal, so this IS the
  // current withdrawable balance (not a separate creator_revenue mapping).
  useEffect(() => {
    const fetchOnChainRevenue = async () => {
      const creatorHash = getCreatorHash(publicKey)
      if (!creatorHash) return
      try {
        const res = await fetch(`/api/aleo/program/${DEPLOYED_PROGRAM_ID}/mapping/total_revenue/${creatorHash}`)
        if (res.ok) {
          const text = await res.text()
          const cleaned = text.replace(/['"u64\s]/g, '')
          const value = parseInt(cleaned, 10)
          if (Number.isFinite(value)) {
            setOnChainRevenue(value)
          }
        }
      } catch {
        // Fall back to stats.totalRevenue from useCreatorStats
      }
    }
    fetchOnChainRevenue()
  }, [publicKey, refreshKey])

  // Detect wallet disconnect during withdrawal transaction
  useEffect(() => {
    if (
      connected === false &&
      (withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting')
    ) {
      setWithdrawTxStatus('failed')
      setWithdrawError('Wallet disconnected. Please reconnect and try again.')
      stopPolling()
    }
  }, [connected, withdrawTxStatus, stopPolling])

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
    // Validate amount doesn't exceed available balance (on-chain value if available, else lifetime total)
    const availableMicrocredits = onChainRevenue ?? (stats?.totalRevenue ?? 0)
    const maxAmount = availableMicrocredits / MICROCREDITS_PER_CREDIT
    if (amount > maxAmount) {
      toast.error(`Maximum available: ${maxAmount.toFixed(6)} ALEO`)
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
            setRefreshKey((k) => k + 1)  // Trigger stats refresh
            toast.success(`${type === 'platform' ? 'Platform fee' : 'Revenue'} withdrawal complete!`)
            // Reset status after 3s so user can initiate another withdrawal
            setTimeout(() => setWithdrawTxStatus('idle'), 3000)
          } else if (pollResult.status === 'failed') {
            setWithdrawTxStatus('failed')
            setWithdrawError('Withdrawal could not be completed. Check your on-chain balance and try again.')
            stopPolling()
          } else if (pollResult.status === 'timeout') {
            // Shield Wallet delegates proving and never reports 'confirmed' —
            // the transaction IS broadcast, so treat timeout as likely success.
            setWithdrawTxStatus('confirmed')
            stopPolling()
            setWithdrawAmount('')
            setRefreshKey((k) => k + 1)
            toast.success(`${type === 'platform' ? 'Platform fee' : 'Revenue'} withdrawal complete! (confirmation was slow)`)
            setTimeout(() => setWithdrawTxStatus('idle'), 3000)
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

  // USD estimate using centralized ALEO_USD_ESTIMATE from utils
  const revenueAleo = (stats?.totalRevenue ?? 0) / MICROCREDITS_PER_CREDIT
  const revenueUsdStr = formatUsd(stats?.totalRevenue ?? 0)

  // Build tier display list (monochrome)
  const tierList = useMemo(() => {
    const basePrice = stats?.tierPrice ?? 0
    const confirmedIds = Object.entries(creatorTiers)
      .filter(([, c]) => c.price > 0)
      .map(([id]) => Number(id))
      .sort((a, b) => a - b)
    const tierIds = confirmedIds.length > 0
      ? Array.from(new Set([1, ...confirmedIds]))
      : TIERS.map((t) => t.id)
    return tierIds.map((id) => {
      const hardcoded = TIERS.find((t) => t.id === id)
      const custom = creatorTiers[id]
      const tierPrice = custom ? custom.price : basePrice * (hardcoded?.priceMultiplier ?? id)
      const tierName = custom?.name || hardcoded?.name || `Tier ${id}`
      return { id, name: tierName, price: tierPrice, isCustom: !!custom }
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
          SECTION 1: Creator Profile Header + Stats
         ═══════════════════════════════════════════════════════ */}
      {/* Profile header */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        {profileImageUrl ? (
          <img src={profileImageUrl} alt="" className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-white/[0.06]" />
        ) : (
          <AddressAvatar address={publicKey} size={48} className="shrink-0 rounded-full ring-2 ring-white/[0.06]" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">
            {profileName || shortenAddress(publicKey)}
          </h1>
          <p className="text-sm text-white/50">
            {shortenAddress(publicKey)} · Creator{(stats?.subscriberCount ?? 0) > 0 ? ` · ${stats?.subscriberThreshold ?? '0'} subscribers` : ' · New subscribers'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={copyLink}
            className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.97]"
            aria-label={copied ? 'Link copied' : 'Copy creator link'}
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <Link
            href={`/creator/${publicKey}`}
            className="px-3.5 py-2 rounded-lg bg-white/[0.08] border border-white/[0.06] text-sm text-white/80 hover:text-white hover:bg-white/[0.12] transition-all flex items-center gap-1.5 active:scale-[0.97]"
          >
            <Eye className="w-4 h-4" />
            View My Page
          </Link>
        </div>
      </m.div>

      {/* 3 Big Stat Cards */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className="grid grid-cols-3 gap-4"
      >
        {/* Revenue Card */}
        <div className="p-5 rounded-xl bg-surface-1 border border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-3">
            <Coins className="w-4 h-4 text-white/50" aria-hidden="true" />
            <span className="text-xs text-white/50 font-medium">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums tracking-tight">
            {revenueAleo > 0 ? revenueUsdStr : '$0.00'}
          </p>
          <p className="text-xs text-white/50 mt-1">
            {revenueAleo > 0 ? `${formatCredits(stats?.totalRevenue ?? 0)} ALEO` : 'No revenue yet'}
          </p>
        </div>

        {/* Subscribers Card */}
        <div className="p-5 rounded-xl bg-surface-1 border border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-3">
            <Users className="w-4 h-4 text-white/50" aria-hidden="true" />
            <span className="text-xs text-white/50 font-medium">Subscribers</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums tracking-tight">
            {stats?.subscriberCount ?? 0}
          </p>
          <p className="text-xs text-white/50 mt-1">
            Shown as &ldquo;{stats?.subscriberThreshold ?? 'New'}&rdquo; publicly
          </p>
        </div>

        {/* Posts Card */}
        <div className="p-5 rounded-xl bg-surface-1 border border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-3">
            <FileText className="w-4 h-4 text-white/50" aria-hidden="true" />
            <span className="text-xs text-white/50 font-medium">Posts</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums tracking-tight">
            {stats?.contentCount ?? 0}
          </p>
          <p className="text-xs text-white/50 mt-1">
            {(stats?.contentCount ?? 0) > 0 ? 'Published on-chain' : 'No posts yet'}
          </p>
        </div>
      </m.div>

      {/* Withdrawal Card (compact — only shows when there's revenue) */}
      {(stats?.totalRevenue ?? 0) > 0 && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-4 rounded-xl bg-surface-1 border border-white/[0.06]"
        >
          {!showWithdrawPanel ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/50 mb-0.5">Available to withdraw</p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {formatCredits(onChainRevenue ?? stats?.totalRevenue ?? 0)} ALEO
                  <span className="text-sm font-normal text-white/50 ml-2">{formatUsd(onChainRevenue ?? stats?.totalRevenue ?? 0)}</span>
                </p>
              </div>
              <button
                onClick={() => setShowWithdrawPanel(true)}
                className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/[0.08] text-sm font-semibold text-white hover:bg-white/15 transition-all flex items-center gap-2 active:scale-[0.97]"
              >
                <ArrowDownToLine className="w-4 h-4" aria-hidden="true" />
                Withdraw
              </button>
            </div>
          ) : (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <p className="text-xs text-white/50">
                Available: {formatCredits(onChainRevenue ?? stats?.totalRevenue ?? 0)} ALEO ({formatUsd(onChainRevenue ?? stats?.totalRevenue ?? 0)})
              </p>
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
                    className="w-full px-4 py-2.5 pr-14 rounded-xl bg-black/40 border border-white/[0.08] text-white text-base placeholder-subtle focus:outline-none focus:border-white/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(((onChainRevenue ?? stats?.totalRevenue ?? 0) / MICROCREDITS_PER_CREDIT).toString())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-white/50 bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
                    aria-label="Fill maximum amount"
                  >
                    Max
                  </button>
                </div>
                <button
                  onClick={() => handleWithdraw('creator')}
                  disabled={withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting' || !withdrawAmount}
                  className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/[0.08] text-sm font-semibold text-white hover:bg-white/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.97]"
                >
                  <ArrowDownToLine className="w-4 h-4" aria-hidden="true" />
                  {withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting' ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>
              {publicKey === PLATFORM_ADDRESS && (
                <button
                  onClick={() => handleWithdraw('platform')}
                  disabled={withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting' || !withdrawAmount}
                  className="w-full px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-sm font-medium text-white/70 hover:bg-white/[0.1] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Withdraw Platform Fees
                </button>
              )}
              {withdrawTxStatus !== 'idle' && (
                <TransactionStatus status={withdrawTxStatus} txId={withdrawTxId} errorMessage={withdrawError} />
              )}
              <button
                onClick={() => setShowWithdrawPanel(false)}
                className="text-xs text-white/50 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
            </m.div>
          )}
        </m.div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: Compose Box (Twitter-style)
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
            className="p-4 rounded-xl bg-surface-1 border border-white/[0.06] cursor-text hover:border-white/[0.12] transition-all group flex items-center gap-3 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:outline-none"
          >
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <AddressAvatar address={publicKey} size={40} className="shrink-0 rounded-full" />
            )}
            <span className="text-white/50 text-sm group-hover:text-white/50 transition-colors flex-1">
              What&apos;s on your mind, {profileName?.split(' ')[0] || 'creator'}?
            </span>
            <span className="text-xs text-white/20 shrink-0">Publish</span>
          </div>
        ) : (
          <div className="rounded-xl bg-surface-1 border border-white/[0.06] overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-0">
              <span className="text-xs text-white/50 font-medium">
                {editingPost ? 'Edit Post' : 'New Post'}
              </span>
              <button
                onClick={() => { setComposeExpanded(false); setEditingPost(null) }}
                className="p-1 rounded-lg text-white/50 hover:text-white/70 hover:bg-white/[0.05] transition-all"
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
          SECTION 3: Getting Started (only shown when < 3 steps done)
         ═══════════════════════════════════════════════════════ */}
      {completedSteps < 3 && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="p-4 rounded-xl bg-surface-1 border border-white/[0.06] relative overflow-hidden"
        >
          {showConfetti && <CelebrationBurst color="bg-green-400" />}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white">
              Setup {completedSteps}/4
            </p>
            <div className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-white/30 transition-all duration-500"
                style={{ width: `${(completedSteps / 4) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { done: true, label: 'Register' },
              { done: Object.keys(creatorTiers).length > 0, label: 'Create tier', action: () => setShowTierDialog(true) },
              { done: (stats?.contentCount ?? 0) > 0, label: 'First post', action: () => setComposeExpanded(true) },
              { done: copied, label: 'Share page', action: copyLink },
            ].filter((s) => !s.done).map((step) => (
              <button
                key={step.label}
                onClick={step.action}
                className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white/70 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                {step.label}
              </button>
            ))}
          </div>
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
        <div className="p-5 rounded-xl bg-surface-1 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">
              {showAllPosts ? 'All Posts' : 'Recent Posts'}
            </h2>
            <button
              onClick={() => setShowAllPosts(!showAllPosts)}
              className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1"
            >
              {showAllPosts ? 'Show less' : <>View all <ChevronRight className="w-3.5 h-3.5" /></>}
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
      </m.div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5: Subscription Tiers (compact horizontal)
         ═══════════════════════════════════════════════════════ */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-5 rounded-xl bg-surface-1 border border-white/[0.06]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">
            Tiers
            {creatorTierCount > 0 && (
              <span className="ml-2 text-xs font-normal text-white/50">
                {creatorTierCount} on-chain
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowTierDialog(true)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.06] text-xs text-white/60 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Tier
          </button>
        </div>

        {tiersError && (
          <p className="text-xs text-white/50 mb-3">Could not load custom tiers. Showing default tier only.</p>
        )}

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {tierList.map((tier) => (
            <div
              key={tier.id}
              className="shrink-0 w-44 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] group relative"
            >
              <p className="text-sm font-medium text-white/80 mb-1">{tier.name}</p>
              <p className="text-lg font-bold text-white tabular-nums">
                {formatCredits(tier.price)}{' '}
                <span className="text-xs font-normal text-white/50">ALEO</span>
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">{formatUsd(tier.price)}/mo</p>

              <button
                onClick={() => setEditingTierId(editingTierId === tier.id ? null : tier.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg text-white/50 hover:text-white/70 hover:bg-white/[0.06] opacity-0 group-hover:opacity-100 transition-all"
                aria-label={`Edit ${tier.name} perks`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

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
        </div>
      </m.div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6: Settings row (Edit Profile + Prove Reputation)
         ═══════════════════════════════════════════════════════ */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-3"
      >
        <button
          onClick={() => setShowProfileEditor(!showProfileEditor)}
          className="px-4 py-2.5 rounded-xl bg-surface-1 border border-white/[0.06] text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-2"
        >
          <Settings className="w-4 h-4 text-white/50" />
          {showProfileEditor ? 'Close Editor' : 'Edit Profile'}
        </button>
        <button
          onClick={() => setShowProveThreshold(true)}
          className="px-4 py-2.5 rounded-xl bg-surface-1 border border-white/[0.06] text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-2"
        >
          <Shield className="w-4 h-4 text-white/50" />
          Prove Reputation
        </button>
        <a
          href={`https://testnet.explorer.provable.com/program/${DEPLOYED_PROGRAM_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-xl bg-surface-1 border border-white/[0.06] text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4 text-white/50" />
          Explorer
        </a>
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
            <ProfileEditor address={publicKey} onProfileUpdated={() => setRefreshKey((k) => k + 1)} />
          </m.div>
        )}
      </AnimatePresence>

      {/* Footer note */}
      <p className="text-center text-[11px] text-white/50 py-1">
        {PLATFORM_FEE_PCT}% platform fee &middot; {100 - PLATFORM_FEE_PCT}% to you via private transfer &middot; Subscriber identities never revealed
      </p>

      {/* Modals */}
      <TierCreationDialog
        isOpen={showTierDialog}
        onClose={() => setShowTierDialog(false)}
        creatorAddress={publicKey}
        existingTierIds={Object.keys(creatorTiers).map(Number)}
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
