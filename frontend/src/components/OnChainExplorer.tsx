'use client'

import { useState } from 'react'
import { m } from 'framer-motion'
import {
  Globe,
  Search,
  Database,
  FileText,
  Users,
  Coins,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { DEPLOYED_PROGRAM_ID, getCreatorHash, saveCreatorHash } from '@/lib/config'
import { TIERS } from '@/types'
import GlassCard from '@/components/GlassCard'

// Use Next.js rewrite proxy to avoid leaking user IP to Provable API
const ALEO_API = '/api/aleo'

// Extracted static style to prevent re-renders
const HEADING_TIGHT_STYLE = { letterSpacing: '-0.02em' } as const

async function queryMapping(mappingName: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(`${ALEO_API}/program/${DEPLOYED_PROGRAM_ID}/mapping/${mappingName}/${key}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data === null || data === 'null') return null
    return String(data).replace(/"/g, '')
  } catch {
    return null
  }
}

interface CreatorStats {
  registered: boolean
  basePrice: number | null
  subscriberCount: number | null
  totalRevenue: number | null
  contentCount: number | null
}

interface ContentInfo {
  found: boolean
  minTier: number | null
  contentHash: string | null
  disputes: number | null
}

export default function OnChainExplorer() {
  const [creatorAddr, setCreatorAddr] = useState('')
  const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null)
  const [creatorLoading, setCreatorLoading] = useState(false)

  const [contentId, setContentId] = useState('')
  const [contentInfo, setContentInfo] = useState<ContentInfo | null>(null)
  const [contentLoading, setContentLoading] = useState(false)

  const [programDeployed, setProgramDeployed] = useState<boolean | null>(null)
  const [deployLoading, setDeployLoading] = useState(false)

  // v23: mappings use Poseidon2 field hashes, not raw addresses
  const CREATOR_HASH = '7077346389288357645876044527218031735459465201928260558184537791016616885101field'

  const lookupCreator = async () => {
    const input = creatorAddr.trim()
    if (!input.startsWith('aleo1') && !input.endsWith('field')) return
    setCreatorLoading(true)
    setCreatorStats(null)
    // All mappings use Poseidon2 hashes — convert raw address to hash
    let key: string
    if (input.endsWith('field')) {
      key = input
    } else {
      let hash = getCreatorHash(input)
      if (!hash) {
        // Not in local cache — try Supabase (fast) then on-chain recovery (slow)
        try {
          const r = await fetch(`/api/creators/recover-hash?address=${encodeURIComponent(input)}`)
          if (r.ok) {
            const { creator_hash } = await r.json()
            if (typeof creator_hash === 'string' && creator_hash.endsWith('field')) {
              saveCreatorHash(input, creator_hash)
              hash = creator_hash
            }
          }
        } catch { /* ignore — handled below */ }
      }
      if (!hash) {
        setCreatorStats({ registered: false, basePrice: null, subscriberCount: null, totalRevenue: null, contentCount: null })
        setCreatorLoading(false)
        return
      }
      key = hash
    }
    try {
      const [price, subs, rev, content] = await Promise.all([
        queryMapping('tier_prices', key),
        queryMapping('subscriber_count', key),
        queryMapping('total_revenue', key),
        queryMapping('content_count', key),
      ])
      const parseNum = (s: string | null): number | null => {
        if (!s) return null
        const n = parseInt(s.replace('u64', ''), 10)
        return Number.isFinite(n) ? n : null
      }
      setCreatorStats({
        registered: price !== null,
        basePrice: parseNum(price),
        subscriberCount: parseNum(subs),
        totalRevenue: parseNum(rev),
        contentCount: parseNum(content),
      })
    } catch {
      setCreatorStats({ registered: false, basePrice: null, subscriberCount: null, totalRevenue: null, contentCount: null })
    }
    setCreatorLoading(false)
  }

  const lookupContent = async () => {
    if (!contentId) return
    setContentLoading(true)
    setContentInfo(null)
    try {
      // Content IDs are hashed on-chain with BHP256. We query with the raw field value
      // since the API accepts the mapping key directly
      const [tier, hash, disputes] = await Promise.all([
        queryMapping('content_meta', contentId),
        queryMapping('content_hashes', contentId),
        queryMapping('content_disputes', contentId),
      ])
      const parsedTier = tier ? parseInt(tier.replace('u8', ''), 10) : null
      const parsedDisputes = disputes ? parseInt(disputes.replace('u64', ''), 10) : null
      setContentInfo({
        found: tier !== null,
        minTier: Number.isFinite(parsedTier) ? parsedTier : null,
        contentHash: hash || null,
        disputes: Number.isFinite(parsedDisputes) ? parsedDisputes : null,
      })
    } catch {
      setContentInfo({ found: false, minTier: null, contentHash: null, disputes: null })
    }
    setContentLoading(false)
  }

  const checkDeployment = async () => {
    setDeployLoading(true)
    setProgramDeployed(null)
    try {
      const res = await fetch(`${ALEO_API}/program/${DEPLOYED_PROGRAM_ID}`)
      setProgramDeployed(res.ok)
    } catch {
      setProgramDeployed(false)
    }
    setDeployLoading(false)
  }

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/5">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
          <Globe className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span className="text-sm text-emerald-300">
            No Wallet Required
          </span>
        </div>
        <h2
          className="text-2xl sm:text-3xl font-serif italic text-white mb-4"
          style={HEADING_TIGHT_STYLE}
        >
          On-Chain Explorer
        </h2>
        <p className="text-white/70 text-sm max-w-xl mx-auto">
          Query on-chain data directly from Aleo testnet. No wallet connection needed.
          Verify creator registrations, content metadata, and program deployment.
        </p>
      </m.div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Creator Lookup */}
        <GlassCard hover={false} className="!h-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-violet-400" aria-hidden="true" />
              <h3 className="text-white font-semibold">Creator Lookup</h3>
            </div>
            <div>
              <input
                type="text"
                value={creatorAddr}
                onChange={(e) => setCreatorAddr(e.target.value)}
                placeholder="Poseidon2 field hash or aleo1..."
                aria-label="Creator address or hash"
                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-border text-white text-base placeholder:text-white/60 focus:outline-none focus:border-violet-500/[0.3] focus:shadow-accent-md transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setCreatorAddr(CREATOR_HASH)}
                className="mt-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none rounded"
              >
                Use platform creator hash
              </button>
            </div>
            <button
              onClick={lookupCreator}
              disabled={creatorLoading || (!creatorAddr.startsWith('aleo1') && !creatorAddr.endsWith('field'))}
              className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-shimmer focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
            >
              {creatorLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" /> : <Search className="w-4 h-4" aria-hidden="true" />}
              Query On-Chain
            </button>
            {creatorStats && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 text-sm">
                  {creatorStats.registered ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
                  )}
                  <span className={creatorStats.registered ? 'text-emerald-300' : 'text-red-300'}>
                    {creatorStats.registered ? 'Registered Creator' : 'Not Registered'}
                  </span>
                </div>
                {creatorStats.registered && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Base Price</span>
                      <span className="text-white font-mono">
                        {creatorStats.basePrice !== null ? `${(creatorStats.basePrice / 1_000_000).toFixed(2)} ALEO` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Subscribers</span>
                      <span className="text-white font-mono">{creatorStats.subscriberCount ?? '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Total Revenue</span>
                      <span className="text-white font-mono">
                        {creatorStats.totalRevenue !== null ? `${(creatorStats.totalRevenue / 1_000_000).toFixed(2)} ALEO` : '—'}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-400/70 mt-2 italic leading-relaxed">
                      Note: Raw counts above are from the subscriber_count / total_revenue mappings (backward compat).
                      The contract also stores Pedersen commitments (subscriber_commit, revenue_commit) which provide
                      cryptographic privacy. In v30, raw counts will be removed. Public-facing pages already show
                      threshold badges instead of exact numbers.
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Content Published</span>
                      <span className="text-white font-mono">{creatorStats.contentCount ?? '—'}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Right Column: Content + Deployment */}
        <div className="space-y-8">
          {/* Content Lookup */}
          <GlassCard hover={false} className="!h-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-violet-400" aria-hidden="true" />
                <h3 className="text-white font-semibold">Content Verification</h3>
              </div>
              <div>
                <input
                  type="text"
                  value={contentId}
                  onChange={(e) => setContentId(e.target.value)}
                  placeholder="Content hash (field value)"
                  aria-label="Content hash to verify"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-border text-white text-base placeholder:text-white/60 focus:outline-none focus:border-violet-500/[0.3] focus:shadow-accent-md transition-all duration-300"
                />
              </div>
              <button
                onClick={lookupContent}
                disabled={contentLoading || !contentId}
                className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-shimmer focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
              >
                {contentLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" /> : <Search className="w-4 h-4" aria-hidden="true" />}
                Verify Content
              </button>
              {contentInfo && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-sm">
                    {contentInfo.found ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
                    )}
                    <span className={contentInfo.found ? 'text-emerald-300' : 'text-red-300'}>
                      {contentInfo.found ? 'Content Found On-Chain' : 'Not Found'}
                    </span>
                  </div>
                  {contentInfo.found && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">Min Tier Required</span>
                        <span className="text-white">{TIERS.find(t => t.id === contentInfo.minTier)?.name || `Tier ${contentInfo.minTier}`}</span>
                      </div>
                      {contentInfo.contentHash && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Integrity Hash</span>
                          <span className="text-white font-mono text-xs truncate max-w-[160px]">{contentInfo.contentHash}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">Disputes Filed</span>
                        <span className={`font-mono ${contentInfo.disputes && contentInfo.disputes > 0 ? 'text-amber-400' : 'text-white'}`}>
                          {contentInfo.disputes ?? 0}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Deployment Status */}
          <GlassCard hover={false} className="!h-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-violet-400" aria-hidden="true" />
                <h3 className="text-white font-semibold">Program Deployment</h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Coins className="w-4 h-4" aria-hidden="true" />
                <span className="font-mono text-xs break-all">{DEPLOYED_PROGRAM_ID}</span>
              </div>
              <button
                onClick={checkDeployment}
                disabled={deployLoading}
                className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-shimmer focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
              >
                {deployLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" /> : <Search className="w-4 h-4" aria-hidden="true" />}
                Check Deployment
              </button>
              {programDeployed !== null && (
                <div className="flex items-center gap-2 text-sm pt-2 border-t border-white/5">
                  {programDeployed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-300">Deployed on Aleo Testnet</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
                      <span className="text-red-300">Not Found on Testnet</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}
