'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Users,
  Coins,
  Tag,
  ExternalLink,
  AlertCircle,
  ArrowRight,
  Shield,
} from 'lucide-react'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { formatCredits, isValidAleoAddress, shortenAddress } from '@/lib/utils'
import { useCyclingPlaceholder } from '@/hooks/useCyclingPlaceholder'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import OnChainVerify from '@/components/OnChainVerify'
import type { CreatorProfile } from '@/types'

const SEARCH_PLACEHOLDERS = [
  'Enter creator\'s Aleo address (aleo1...)',
  'Search by aleo1 address...',
  'Paste a creator address to look up stats...',
  'Lookup on-chain subscription data...',
]

export default function ExplorerPage() {
  const { fetchCreatorStats, loading } = useCreatorStats()
  const [address, setAddress] = useState('')
  const [result, setResult] = useState<CreatorProfile | null>(null)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { placeholder, isAnimating } = useCyclingPlaceholder(SEARCH_PLACEHOLDERS)

  const handleSearch = async () => {
    if (loading) return
    const trimmed = address.trim()
    if (!trimmed) return

    if (!isValidAleoAddress(trimmed)) {
      setError('Invalid Aleo address format. Address should start with "aleo1" and be 63 characters.')
      setResult(null)
      setSearched(true)
      return
    }

    setError(null)
    setSearched(false)

    try {
      const stats = await fetchCreatorStats(trimmed)
      setResult(stats)
      setSearched(true)
    } catch {
      setError('Failed to fetch creator data. Please try again.')
      setSearched(true)
    }
  }

  const isRegistered = result?.tierPrice !== null && result?.tierPrice !== undefined

  return (
    <PageTransition>
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl font-bold text-white mb-2">On-Chain Explorer</h1>
            <p className="text-slate-400">
              Look up any creator&apos;s public stats directly from the Aleo blockchain.
              Only aggregate data is visible — subscriber identities are always private.
            </p>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={placeholder}
                  aria-label="Creator Aleo address"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm ${isAnimating ? 'placeholder-opacity-0' : 'placeholder-opacity-100'}`}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !address.trim()}
                className="px-6 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium text-sm hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Search
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </motion.div>
          )}

          {/* Results */}
          {searched && result && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Creator Header */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{shortenAddress(result.address)}</p>
                    <p className="text-xs text-slate-500">
                      {isRegistered ? 'Registered Creator' : 'Not Registered'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`https://explorer.aleo.org/testnet/address/${result.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    Aleo Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                  {isRegistered && (
                    <a
                      href={`/creator/${result.address}`}
                      className="px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      Subscribe <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {isRegistered ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <GlassCard delay={0}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-violet-400" />
                          <span className="text-xs text-slate-400">Subscribers</span>
                        </div>
                        <OnChainVerify
                          creatorAddress={result.address}
                          mappingName="subscriber_count"
                          displayedValue={result.subscriberCount}
                        />
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {result.subscriberCount}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Aggregate count only — no individual IDs visible
                      </p>
                    </GlassCard>

                    <GlassCard delay={0.1}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-slate-400">Total Revenue</span>
                        </div>
                        <OnChainVerify
                          creatorAddress={result.address}
                          mappingName="total_revenue"
                          displayedValue={result.totalRevenue}
                        />
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {formatCredits(result.totalRevenue)} <span className="text-sm text-slate-400">ALEO</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Sum of all subscriptions and tips
                      </p>
                    </GlassCard>

                    <GlassCard delay={0.2}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-slate-400">Base Price</span>
                        </div>
                        <OnChainVerify
                          creatorAddress={result.address}
                          mappingName="tier_prices"
                          displayedValue={result.tierPrice ?? 0}
                        />
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {formatCredits(result.tierPrice ?? 0)} <span className="text-sm text-slate-400">ALEO</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Premium = 2x, VIP = 5x this price
                      </p>
                    </GlassCard>
                  </div>

                  {/* Data Source */}
                  <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10 text-xs text-slate-400">
                    <p>
                      Data fetched from on-chain mappings via{' '}
                      <code className="px-1 py-0.5 rounded bg-white/10 text-violet-300">
                        api.explorer.provable.com
                      </code>
                      . All values are public aggregate data — no subscriber identities are
                      exposed.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Creator Not Registered
                  </h3>
                  <p className="text-sm text-slate-400">
                    This address has not called <code className="px-1 py-0.5 rounded bg-white/10 text-violet-300 text-xs">register_creator</code> on VeilSub.
                    No subscription data exists for this address.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Info */}
          {!searched && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-12"
            >
              <Search className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                Enter a creator&apos;s Aleo address to view their public on-chain stats.
              </p>
              <p className="text-slate-600 text-xs mt-2">
                Only aggregate data (subscriber count, total revenue, tier price) is publicly visible.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
