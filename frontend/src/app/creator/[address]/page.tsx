'use client'

import { useEffect, useState, use } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Heart,
  Sparkles,
  Lock,
  Users,
  Coins,
  ExternalLink,
  RefreshCw,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import SubscribeModal from '@/components/SubscribeModal'
import TipModal from '@/components/TipModal'
import RenewModal from '@/components/RenewModal'
import ContentFeed from '@/components/ContentFeed'
import CreatorQRCode from '@/components/CreatorQRCode'
import {
  shortenAddress,
  formatCredits,
  parseRecordPlaintext,
} from '@/lib/utils'
import { TIERS } from '@/types'
import type { CreatorProfile, SubscriptionTier, AccessPass } from '@/types'

export default function CreatorPage({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = use(params)
  const { connected } = useWallet()
  const { fetchCreatorStats } = useCreatorStats()
  const { getAccessPasses } = useVeilSub()
  const { blockHeight } = useBlockHeight()

  const [stats, setStats] = useState<CreatorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null)
  const [showTip, setShowTip] = useState(false)
  const [userPasses, setUserPasses] = useState<AccessPass[]>([])
  const [renewPass, setRenewPass] = useState<AccessPass | null>(null)

  // Fetch creator stats
  useEffect(() => {
    fetchCreatorStats(address).then((s) => {
      setStats(s)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [address, fetchCreatorStats])

  // Fetch user's access passes for this creator
  useEffect(() => {
    if (!connected) {
      setUserPasses([])
      return
    }
    getAccessPasses().then((records) => {
      const passes = records
        .map((r) => {
          const parsed = parseRecordPlaintext(r)
          return {
            owner: parsed.owner ?? '',
            creator: parsed.creator ?? '',
            tier: parseInt(parsed.tier ?? '0', 10),
            passId: parsed.pass_id ?? '',
            expiresAt: parseInt(parsed.expires_at ?? '0', 10),
            rawPlaintext: r,
          }
        })
        .filter((p) => p.creator === address && !isNaN(p.tier))
      setUserPasses(passes)
    }).catch(() => {
      setUserPasses([])
    })
  }, [connected, address, getAccessPasses])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading creator...</div>
      </div>
    )
  }

  const isRegistered = stats?.tierPrice !== null && stats?.tierPrice !== undefined
  const basePrice = stats?.tierPrice ?? 0

  const getPassExpiry = (pass: AccessPass) => {
    if (blockHeight === null || pass.expiresAt === 0) return null
    if (pass.expiresAt <= blockHeight) return { expired: true, daysLeft: 0 }
    const blocksLeft = pass.expiresAt - blockHeight
    const daysLeft = Math.round((blocksLeft * 3) / 86400)
    return { expired: false, daysLeft }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Creator Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {shortenAddress(address)}
              </h1>
              <a
                href={`https://explorer.aleo.org/testnet/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300"
              >
                View on Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Stats Row */}
          {isRegistered && (
            <div className="flex flex-wrap gap-6 mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-slate-300">
                  {stats?.subscriberCount ?? 0} subscribers
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-300">
                  {formatCredits(stats?.totalRevenue ?? 0)} ALEO earned
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {!isRegistered ? (
          <div className="text-center py-20">
            <Lock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Creator Not Found
            </h2>
            <p className="text-slate-400">
              This address hasn&apos;t registered as a creator yet.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* User's Existing Passes */}
            {userPasses.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-xl bg-green-500/5 border border-green-500/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-300">
                    Your AccessPasses ({userPasses.length})
                  </span>
                  <span className="text-xs text-slate-500 ml-auto">Only you can see this</span>
                </div>
                <div className="space-y-2">
                  {userPasses.map((pass, i) => {
                    const tierInfo = TIERS.find((t) => t.id === pass.tier)
                    const tierColor =
                      pass.tier === 3
                        ? 'text-violet-300 bg-violet-500/10 border-violet-500/20'
                        : pass.tier === 2
                          ? 'text-blue-300 bg-blue-500/10 border-blue-500/20'
                          : 'text-green-300 bg-green-500/10 border-green-500/20'
                    const expiry = getPassExpiry(pass)

                    return (
                      <div
                        key={pass.passId || i}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                      >
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${tierColor}`}
                        >
                          {tierInfo?.name ?? `Tier ${pass.tier}`}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          ID: {pass.passId.length > 16 ? `${pass.passId.slice(0, 8)}...${pass.passId.slice(-6)}` : pass.passId}
                        </span>

                        {/* Expiry display */}
                        {expiry !== null && (
                          <span className="ml-auto flex items-center gap-1.5">
                            {expiry.expired ? (
                              <>
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                <span className="text-xs text-red-400">Expired</span>
                                <button
                                  onClick={() => setRenewPass(pass)}
                                  className="ml-2 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/20 transition-colors flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Renew
                                </button>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span className="text-xs text-slate-400">
                                  ~{expiry.daysLeft}d left
                                </span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Subscription Tiers */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">
                Subscription Tiers
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {TIERS.map((tier, i) => {
                  const tierPrice = basePrice * tier.priceMultiplier
                  const hasThisTier = userPasses.some(
                    (p) => p.tier === tier.id
                  )

                  return (
                    <motion.div
                      key={tier.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`relative p-6 rounded-xl border transition-all ${
                        tier.id === 3
                          ? 'bg-gradient-to-b from-violet-500/10 to-purple-500/5 border-violet-500/30'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {tier.id === 3 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30">
                          <span className="text-xs font-medium text-violet-300">
                            Popular
                          </span>
                        </div>
                      )}

                      <h3 className="text-white font-semibold mb-1">
                        {tier.name}
                      </h3>
                      <p className="text-2xl font-bold text-white mb-1">
                        {formatCredits(tierPrice)}{' '}
                        <span className="text-sm font-normal text-slate-400">
                          ALEO
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mb-4">
                        {tier.description}
                      </p>

                      <ul className="space-y-2 mb-6">
                        {tier.features.map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-2 text-xs text-slate-400"
                          >
                            <Sparkles className="w-3 h-3 text-violet-400" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {hasThisTier ? (
                        <div className="w-full py-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-center text-sm text-green-400">
                          Active
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedTier(tier)}
                          disabled={!connected}
                          className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all active:scale-[0.98] ${
                            tier.id === 3
                              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                              : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {connected ? 'Subscribe' : 'Connect wallet'}
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Dynamic Content Feed */}
            <ContentFeed
              creatorAddress={address}
              userPasses={userPasses}
              connected={connected}
              blockHeight={blockHeight}
            />

            {/* Tip Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">
                    Send a Private Tip
                  </h2>
                  <p className="text-sm text-slate-400">
                    Show appreciation with a private ALEO transfer. The creator
                    receives 95% via private transfer — 5% platform fee.
                  </p>
                </div>
                <button
                  onClick={() => setShowTip(true)}
                  disabled={!connected}
                  className="px-6 py-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300 font-medium text-sm hover:bg-pink-500/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Heart className="w-4 h-4" />
                  Tip
                </button>
              </div>
            </motion.div>

            {/* Share QR Code */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CreatorQRCode creatorAddress={address} />
            </motion.div>

            {/* Privacy Notice */}
            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-400 space-y-1">
                  <p>
                    <strong className="text-violet-300">
                      Privacy guarantee:
                    </strong>{' '}
                    Your subscription creates a private AccessPass record visible
                    only to you. The creator receives payment via{' '}
                    <code className="px-1 py-0.5 rounded bg-white/10 text-violet-300">
                      credits.aleo/transfer_private
                    </code>{' '}
                    and sees only aggregate stats (total subscribers, total
                    revenue). Your identity is never linked on-chain. Subscription
                    expiry is checked locally — no on-chain trace when you access content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTier && (
        <SubscribeModal
          isOpen={!!selectedTier}
          onClose={() => setSelectedTier(null)}
          tier={selectedTier}
          creatorAddress={address}
          basePrice={basePrice}
        />
      )}
      <TipModal
        isOpen={showTip}
        onClose={() => setShowTip(false)}
        creatorAddress={address}
      />
      {renewPass && (
        <RenewModal
          isOpen={!!renewPass}
          onClose={() => setRenewPass(null)}
          pass={renewPass}
          basePrice={basePrice}
        />
      )}
    </div>
  )
}
