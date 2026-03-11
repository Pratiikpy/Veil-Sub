'use client'

import { useState, useRef, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Copy,
  Check,
  ExternalLink,
  Shield,
  Share2,
  Lock,
  Percent,
  Settings,
  Award,
  CheckCircle2,
  Circle,
  LayoutDashboard,
  FileText,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import StatsPanel from '@/components/StatsPanel'
import CreatorQRCode from '@/components/CreatorQRCode'
import CreatePostForm from '@/components/CreatePostForm'
import ProfileEditor from '@/components/dashboard/ProfileEditor'
import PostsList from '@/components/dashboard/PostsList'
import ShareText from '@/components/dashboard/ShareText'
import { formatCredits, shortenAddress, creditsToMicrocredits } from '@/lib/utils'
import { PLATFORM_FEE_PCT, PLATFORM_ADDRESS, DEPLOYED_PROGRAM_ID, MICROCREDITS_PER_CREDIT } from '@/lib/config'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useCreatorTiers, invalidateCreatorTierCache } from '@/hooks/useCreatorTiers'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import TransactionStatus from '@/components/TransactionStatus'
import { TIERS } from '@/types'
import type { CreatorProfile, TxStatus, CustomTierInfo } from '@/types'

const ActivityChart = dynamic(() => import('@/components/ActivityChart'), { ssr: false })
const TierDistribution = dynamic(() => import('@/components/TierDistribution'), { ssr: false })
const TierCreationDialog = dynamic(() => import('@/components/TierCreationDialog'), { ssr: false })
const RevokeAccessPanel = dynamic(() => import('@/components/RevokeAccessPanel'), { ssr: false })
const ProveThresholdModal = dynamic(() => import('@/components/ProveThresholdModal'), { ssr: false })

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

type TabId = (typeof TABS)[number]['id']

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
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [copied, setCopied] = useState(false)
  const [showTierDialog, setShowTierDialog] = useState(false)
  const [showProveThreshold, setShowProveThreshold] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawTxStatus, setWithdrawTxStatus] = useState<TxStatus>('idle')
  const [withdrawTxId, setWithdrawTxId] = useState<string | null>(null)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const { withdrawCreatorRevenue, withdrawPlatformFees } = useVeilSub()
  const { tiers: creatorTiers, tierCount: creatorTierCount, refetch: refetchTiers } = useCreatorTiers(publicKey)
  const { startPolling, stopPolling } = useTransactionPoller()
  const tabListRef = useRef<HTMLDivElement>(null)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/creator/${publicKey}`
      )
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Clipboard not available. Please copy manually.')
    }
  }

  const handleWithdraw = async (type: 'creator' | 'platform') => {
    if (withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting') return
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0) {
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
            toast.success(`${type === 'platform' ? 'Platform fee' : 'Revenue'} withdrawal confirmed!`)
          } else if (pollResult.status === 'failed') {
            setWithdrawTxStatus('failed')
            setWithdrawError('Transaction failed on-chain')
            stopPolling()
          }
        })
      } else {
        setWithdrawTxStatus('idle')
        toast.error('Wallet rejected the transaction. Please try again.')
      }
    } catch (err: unknown) {
      setWithdrawTxStatus('failed')
      setWithdrawError(err instanceof Error ? err.message : 'Withdrawal failed')
      toast.error('Withdrawal failed')
    }
  }

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const tabIds = TABS.map((t) => t.id)
      const currentIndex = tabIds.indexOf(activeTab)
      let nextIndex = currentIndex

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextIndex = (currentIndex + 1) % tabIds.length
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length
      } else if (e.key === 'Home') {
        e.preventDefault()
        nextIndex = 0
      } else if (e.key === 'End') {
        e.preventDefault()
        nextIndex = tabIds.length - 1
      } else {
        return
      }

      setActiveTab(tabIds[nextIndex])
      const nextButton = tabListRef.current?.querySelector(
        `[data-tab="${tabIds[nextIndex]}"]`
      ) as HTMLButtonElement | null
      nextButton?.focus()
    },
    [activeTab]
  )

  return (
    <div>
      {/* Sticky Tab Bar */}
      <div className="sticky top-16 z-30 -mx-4 px-4 pt-2 pb-0 bg-[var(--bg)]/80 backdrop-blur-md border-b border-border">
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Dashboard sections"
          className="flex overflow-x-auto scrollbar-hide gap-1"
          onKeyDown={handleTabKeyDown}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                data-tab={tab.id}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                  isActive
                    ? 'border-[var(--accent)] text-white'
                    : 'border-transparent text-white/60 hover:text-white/70 hover:border-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <m.div
            key="overview"
            role="tabpanel"
            id="panel-overview"
            aria-labelledby="tab-overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-8 pt-6"
          >
            {/* Share Link */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl glass flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <div className="flex-1">
                <p className="text-sm text-violet-300 font-medium mb-1">
                  Your creator page
                </p>
                <p className="text-xs text-white/70 break-all">
                  {creatorLink || `/creator/${shortenAddress(publicKey || '')}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-all duration-300 flex items-center gap-2 active:scale-[0.98]"
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
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-all duration-300 flex items-center gap-2 active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4" />
                  View
                </Link>
              </div>
            </m.div>

            {/* Getting Started Checklist */}
            {((stats?.subscriberCount ?? 0) === 0 || (stats?.contentCount ?? 0) === 0 || Object.keys(creatorTiers).length === 0) && (
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="p-5 rounded-xl bg-gradient-to-r from-violet-500/[0.06] to-transparent border border-violet-500/15"
              >
                <h2 className="text-sm font-semibold text-white mb-3">Getting Started</h2>
                <div className="space-y-2.5">
                  {[
                    {
                      done: true,
                      label: 'Register as a creator',
                      detail: 'On-chain registration complete',
                    },
                    {
                      done: Object.keys(creatorTiers).length > 0,
                      label: 'Create a custom tier',
                      detail: 'Set pricing for your subscription tiers',
                      action: () => setShowTierDialog(true),
                      actionLabel: 'Create Tier',
                    },
                    {
                      done: (stats?.contentCount ?? 0) > 0,
                      label: 'Publish your first post',
                      detail: 'Create gated content for subscribers',
                      tabSwitch: 'content' as TabId,
                    },
                    {
                      done: false,
                      label: 'Share your creator page',
                      detail: 'Invite subscribers with your link',
                      action: copyLink,
                      actionLabel: 'Copy Link',
                    },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-3">
                      {step.done ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-white/60 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${step.done ? 'text-white/60 line-through' : 'text-white'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-white/60">{step.detail}</p>
                      </div>
                      {!step.done && step.action && (
                        <button
                          onClick={step.action}
                          className="shrink-0 px-3 py-1 rounded-lg bg-white/[0.06] border border-border text-xs text-violet-300 hover:bg-violet-500/10 transition-all"
                        >
                          {step.actionLabel}
                        </button>
                      )}
                      {!step.done && 'tabSwitch' in step && step.tabSwitch && (
                        <button
                          onClick={() => setActiveTab(step.tabSwitch as TabId)}
                          className="shrink-0 px-3 py-1 rounded-lg bg-white/[0.06] border border-border text-xs text-violet-300 hover:bg-violet-500/10 transition-all"
                        >
                          Go to Content
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </m.div>
            )}

            {/* On-Chain Stats */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-lg font-semibold text-white mb-4">
                On-Chain Stats
              </h2>
              <StatsPanel
                creatorAddress={publicKey}
                refreshKey={refreshKey}
              />
            </m.div>

            {/* QR Code */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <CreatorQRCode creatorAddress={publicKey} />
            </m.div>

            {/* Profile Editor */}
            <ProfileEditor address={publicKey} />

            {/* Share Your Page */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-xl bg-surface-1 border border-border"
            >
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-semibold text-white">
                  Share Your Page
                </h2>
              </div>
              <p className="text-sm text-white/70 mb-4">
                Copy a ready-made message to share on social media or messaging apps.
              </p>
              <ShareText
                text={`Support me privately on VeilSub — no one will know you subscribed. Powered by Aleo zero-knowledge proofs.\n${creatorLink || `/creator/${publicKey}`}`}
              />
              <div className="mt-4 pt-4 border-t border-border/75">
                <p className="text-xs text-violet-300 font-medium mb-2">Direct Link</p>
                <p className="text-[11px] text-white/60 mb-2">
                  Share your creator page link. Subscribers pay privately — you receive a CreatorReceipt record but cannot identify individual subscribers.
                </p>
                <ShareText
                  text={`${creatorLink || `/creator/${publicKey}`}`}
                />
              </div>
            </m.div>

            {/* Verified On-Chain */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-4 rounded-xl bg-surface-1 border border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-medium text-green-300">Verified On-Chain</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://testnet.explorer.provable.com/program/${DEPLOYED_PROGRAM_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-border text-xs text-white hover:text-white hover:border-green-500/30 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Provable Explorer
                </a>
                <a
                  href={`https://testnet.aleoscan.io/program?id=${DEPLOYED_PROGRAM_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-border text-xs text-white hover:text-white hover:border-green-500/30 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Aleoscan
                </a>
                <a
                  href={`https://testnet.explorer.provable.com/program/${DEPLOYED_PROGRAM_ID}/mapping/tier_prices/${publicKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-border text-xs text-white hover:text-white hover:border-green-500/30 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  Your tier_prices entry
                </a>
              </div>
            </m.div>
          </m.div>
        )}

        {activeTab === 'content' && (
          <m.div
            key="content"
            role="tabpanel"
            id="panel-content"
            aria-labelledby="tab-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-8 pt-6"
          >
            {/* Create Post */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CreatePostForm
                creatorAddress={publicKey}
                onPostCreated={() => setRefreshKey((k) => k + 1)}
              />
            </m.div>

            {/* Posts List */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <PostsList address={publicKey} />
            </m.div>

            {/* Content Gating Explainer */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-xl bg-surface-1 border border-border"
            >
              <h2 className="text-lg font-semibold text-white mb-3">
                How Content Gating Works
              </h2>
              <div className="space-y-3 text-sm text-white/70">
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
                  You see total subscribers and revenue — never individual
                  subscriber identities.
                </p>
              </div>
            </m.div>

            {/* Revoke Subscriber Access */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <RevokeAccessPanel />
            </m.div>

            {/* Active Gated Content Note */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-xl bg-surface-1 border border-border"
            >
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-green-300 font-medium mb-1">
                    Exclusive content is live
                  </p>
                  <p className="text-xs text-white/70">
                    Your subscribers can now see tier-gated exclusive content on your creator page.
                    Content visibility is determined by each subscriber&apos;s AccessPass — checked
                    locally in their browser, with no server involved. Subscriptions expire after ~30 days
                    and can be renewed.
                  </p>
                </div>
              </div>
            </m.div>
          </m.div>
        )}

        {activeTab === 'analytics' && (
          <m.div
            key="analytics"
            role="tabpanel"
            id="panel-analytics"
            aria-labelledby="tab-analytics"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-8 pt-6"
          >
            {/* Revenue Stats Summary */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Analytics
                </h2>
                <span className="text-xs text-white/60">All values verified on-chain</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Subscribers', value: stats?.subscriberCount ?? 0, suffix: '' },
                  { label: 'Total Revenue', value: stats?.totalRevenue ? formatCredits(stats.totalRevenue) : '0', suffix: 'ALEO' },
                  { label: 'Posts Published', value: stats?.contentCount ?? 0, suffix: '' },
                  { label: 'Base Price', value: stats?.tierPrice ? formatCredits(stats.tierPrice) : '0', suffix: 'ALEO' },
                ].map((stat, i) => (
                  <m.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-4 rounded-xl bg-surface-1 border border-border hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.1)] transition-all duration-300"
                  >
                    <p className="text-[11px] text-white/60 uppercase tracking-wider mb-1.5">{stat.label}</p>
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {stat.value}
                      {stat.suffix && <span className="text-xs font-normal text-white/60 ml-1">{stat.suffix}</span>}
                    </p>
                  </m.div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <ActivityChart creatorAddress={publicKey} />
                <TierDistribution creatorAddress={publicKey} />
              </div>
            </m.div>

            {/* Tier Pricing Breakdown */}
            {stats?.tierPrice != null && (
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    Your Tier Pricing
                  </h2>
                  {Object.keys(creatorTiers).length > 0 && (
                    <span className="text-xs text-green-400/80">Custom prices active</span>
                  )}
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {TIERS.map((tier) => {
                    const custom = creatorTiers[tier.id]
                    const tierPrice = custom ? custom.price : (stats?.tierPrice ?? 0) * tier.priceMultiplier
                    const tierName = custom?.name || tier.name
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
                          {tierName}
                        </p>
                        <p className="text-xl font-bold text-white">
                          {formatCredits(tierPrice)}{' '}
                          <span className="text-xs font-normal text-white/60">ALEO</span>
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          {custom ? 'Custom price' : `${tier.priceMultiplier}x base price`}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </m.div>
            )}

            {/* Platform Fee Info */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-4 rounded-xl bg-surface-1 border border-border"
            >
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-medium text-white">Platform Fee</h3>
              </div>
              <p className="text-xs text-white/70">
                VeilSub takes a {PLATFORM_FEE_PCT}% platform fee on subscriptions and tips.
                {100 - PLATFORM_FEE_PCT}% goes directly to you via private transfer.
                Both payments are private — subscribers remain anonymous to you and to the platform.
              </p>
            </m.div>
          </m.div>
        )}

        {activeTab === 'settings' && (
          <m.div
            key="settings"
            role="tabpanel"
            id="panel-settings"
            aria-labelledby="tab-settings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-8 pt-6"
          >
            {/* Custom Tier Management */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl bg-surface-1 border border-border"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-violet-400" />
                  <h2 className="text-lg font-semibold text-white">Custom Tiers</h2>
                  {creatorTierCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-medium">
                      <Shield className="w-3 h-3" />
                      {creatorTierCount} on-chain
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowTierDialog(true)}
                  className="px-3 py-1.5 rounded-lg bg-white text-xs font-medium text-black hover:bg-white/90 transition-all duration-300 active:scale-[0.98]"
                >
                  + New Tier
                </button>
              </div>
              <p className="text-xs text-white/60 mb-3">
                Create custom subscription tiers with flexible pricing. Subscribers choose from your tiers when subscribing.
                {creatorTierCount > 0 && ' Your custom tiers are stored on-chain via create_custom_tier.'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(creatorTiers).length > 0 ? (
                  Object.entries(creatorTiers).map(([idStr, tier]: [string, CustomTierInfo]) => {
                    const id = Number(idStr)
                    const colors = id === 3 ? 'border-violet-500/20 bg-violet-500/5' : id === 2 ? 'border-blue-500/20 bg-blue-500/5' : 'border-green-500/20 bg-green-500/5'
                    const textColor = id === 3 ? 'text-violet-300' : id === 2 ? 'text-blue-300' : 'text-green-300'
                    return (
                      <div key={id} className={`p-3 rounded-lg border text-center ${colors}`}>
                        <p className={`text-xs font-medium ${textColor}`}>{tier.name}</p>
                        <p className="text-sm font-bold text-white mt-0.5">{formatCredits(tier.price)} <span className="text-[10px] font-normal text-white/60">ALEO</span></p>
                      </div>
                    )
                  })
                ) : (
                  [{id: 1, name: 'Supporter', mult: '1x'}, {id: 2, name: 'Premium', mult: '2x'}, {id: 3, name: 'VIP', mult: '5x'}].map((t) => (
                    <div key={t.id} className="p-3 rounded-lg bg-white/[0.03] border border-border text-center">
                      <p className="text-xs font-medium text-white">{t.name}</p>
                      <p className="text-[10px] text-white/60">Default {t.mult} base</p>
                    </div>
                  ))
                )}
              </div>
            </m.div>

            {/* Prove Reputation (ZK Threshold Proof) */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-5 rounded-xl bg-surface-1 border border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-violet-400" />
                  <h2 className="text-lg font-semibold text-white">Prove Reputation</h2>
                </div>
                <button
                  onClick={() => setShowProveThreshold(true)}
                  className="px-3 py-1.5 rounded-lg bg-white text-xs font-medium text-black hover:bg-white/90 transition-all duration-300 active:scale-[0.98]"
                >
                  Generate Proof
                </button>
              </div>
              <p className="text-xs text-white/60 mb-2">
                Prove your subscriber count exceeds a threshold without revealing the exact number.
                Uses zero-knowledge verification on-chain — third parties see only that the proof succeeded.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 p-3 rounded-lg bg-white/[0.03] border border-border">
                  <p className="text-[10px] text-white/60 uppercase tracking-wider mb-0.5">Current Subscribers</p>
                  <p className="text-lg font-bold text-white tabular-nums">{stats?.subscriberCount ?? 0}</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-violet-500/[0.04] border border-violet-500/10">
                  <p className="text-[10px] text-violet-300/70 uppercase tracking-wider mb-0.5">Privacy Benefit</p>
                  <p className="text-xs text-white/70">Prove &quot;at least N&quot; without revealing exact count</p>
                </div>
              </div>
            </m.div>

            {/* Creator Revenue Withdrawal */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-5 rounded-xl bg-surface-1 border border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <Percent className="w-5 h-5 text-green-400" />
                <h3 className="text-sm font-semibold text-white">
                  {publicKey === PLATFORM_ADDRESS ? 'Withdraw Funds' : 'Withdraw Earnings'}
                </h3>
              </div>
              <p className="text-xs text-white/60 mb-3">
                {publicKey === PLATFORM_ADDRESS
                  ? `Withdraw your creator revenue or accumulated ${PLATFORM_FEE_PCT}% platform fees.`
                  : `Withdraw your accumulated subscription and tip revenue. ${100 - PLATFORM_FEE_PCT}% of all payments are yours.`}
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="number"
                  inputMode="decimal"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Amount in ALEO"
                  step="0.1"
                  min="0.001"
                  aria-label="Withdrawal amount in ALEO"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-border text-white text-base placeholder-subtle focus:outline-none focus:border-green-500/30 transition-all"
                />
                <button
                  onClick={() => handleWithdraw('creator')}
                  disabled={withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting' || !withdrawAmount}
                  className="px-4 py-2 rounded-lg bg-green-600/80 text-sm font-medium text-white hover:bg-green-600 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting' ? 'Withdrawing...' : 'Withdraw Revenue'}
                </button>
              </div>
              {publicKey === PLATFORM_ADDRESS && (
                <button
                  onClick={() => handleWithdraw('platform')}
                  disabled={withdrawTxStatus === 'signing' || withdrawTxStatus === 'broadcasting' || !withdrawAmount}
                  className="w-full px-4 py-2 rounded-lg bg-amber-600/80 text-sm font-medium text-white hover:bg-amber-600 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed mb-3"
                >
                  Withdraw Platform Fees
                </button>
              )}
              {withdrawTxStatus !== 'idle' && (
                <TransactionStatus status={withdrawTxStatus} txId={withdrawTxId} errorMessage={withdrawError} />
              )}
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Modals — always rendered regardless of active tab */}
      <TierCreationDialog
        isOpen={showTierDialog}
        onClose={() => setShowTierDialog(false)}
        onSuccess={() => {
          toast.success('Custom tier created on-chain!')
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
