'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Lock,
  ShieldCheck,
  Fingerprint,
  RefreshCw,
  Zap,
  Search,
  Globe,
  Database,
  FileText,
  Users,
  Coins,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { parseAccessPass, shortenAddress } from '@/lib/utils'
import { PROGRAM_ID } from '@/lib/config'
import { TIERS } from '@/types'
import type { AccessPass, TxStatus } from '@/types'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import FloatingOrbs from '@/components/FloatingOrbs'
import StatusBadge from '@/components/StatusBadge'
import VerificationResult from '@/components/VerificationResult'
import TransactionStatus from '@/components/TransactionStatus'

const ALEO_API = process.env.NEXT_PUBLIC_ALEO_API_URL || 'https://api.explorer.provable.com/v1/testnet'

async function queryMapping(mappingName: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(`${ALEO_API}/program/${PROGRAM_ID}/mapping/${mappingName}/${key}`)
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
}

export default function VerifyPage() {
  const { connected } = useWallet()
  const { getAccessPasses, verifyAccess } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()

  const [passes, setPasses] = useState<AccessPass[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPass, setSelectedPass] = useState<AccessPass | null>(null)
  const [verifyTxStatus, setVerifyTxStatus] = useState<TxStatus>('idle')
  const [verifyTxId, setVerifyTxId] = useState<string | null>(null)
  const [verifyResult, setVerifyResult] = useState<
    'idle' | 'success' | 'failed'
  >('idle')

  // Stop polling on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  // Detect wallet disconnect during verification
  useEffect(() => {
    if (!connected && (verifyTxStatus === 'signing' || verifyTxStatus === 'broadcasting')) {
      setVerifyTxStatus('failed')
      setVerifyResult('failed')
      stopPolling()
    }
  }, [connected, verifyTxStatus, stopPolling])

  const loadPasses = useCallback(async () => {
    setLoading(true)
    try {
      const records = await getAccessPasses()
      const parsed = records
        .map((r) => parseAccessPass(r))
        .filter((p): p is NonNullable<typeof p> => p !== null && p.creator !== '')
      setPasses(parsed)
    } catch {
      setPasses([])
    }
    setLoading(false)
  }, [getAccessPasses])

  useEffect(() => {
    if (!connected) {
      setPasses([])
      return
    }
    loadPasses()
  }, [connected, loadPasses])

  const handleVerify = async (pass: AccessPass) => {
    setSelectedPass(pass)
    setVerifyResult('idle')
    setVerifyTxStatus('signing')
    setVerifyTxId(null)

    try {
      const txId = await verifyAccess(pass.rawPlaintext, pass.creator)
      if (txId) {
        setVerifyTxId(txId)
        setVerifyTxStatus('broadcasting')
        startPolling(txId, (result) => {
          if (result.status === 'confirmed') {
            if (result.resolvedTxId) setVerifyTxId(result.resolvedTxId)
            setVerifyTxStatus('confirmed')
            setVerifyResult('success')
          } else if (result.status === 'failed') {
            setVerifyTxStatus('failed')
            setVerifyResult('failed')
          }
        })
      } else {
        setVerifyTxStatus('failed')
        setVerifyResult('failed')
      }
    } catch {
      setVerifyTxStatus('failed')
      setVerifyResult('failed')
    }
  }

  // On-Chain Explorer component — no wallet needed
  function OnChainExplorer() {
    const [creatorAddr, setCreatorAddr] = useState('')
    const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null)
    const [creatorLoading, setCreatorLoading] = useState(false)

    const [contentId, setContentId] = useState('')
    const [contentInfo, setContentInfo] = useState<ContentInfo | null>(null)
    const [contentLoading, setContentLoading] = useState(false)

    const [programDeployed, setProgramDeployed] = useState<boolean | null>(null)
    const [deployLoading, setDeployLoading] = useState(false)

    const lookupCreator = async () => {
      if (!creatorAddr.startsWith('aleo1')) return
      setCreatorLoading(true)
      setCreatorStats(null)
      try {
        const [price, subs, rev, content] = await Promise.all([
          queryMapping('tier_prices', creatorAddr),
          queryMapping('subscriber_count', creatorAddr),
          queryMapping('total_revenue', creatorAddr),
          queryMapping('content_count', creatorAddr),
        ])
        setCreatorStats({
          registered: price !== null,
          basePrice: price ? parseInt(price.replace('u64', '')) : null,
          subscriberCount: subs ? parseInt(subs.replace('u64', '')) : null,
          totalRevenue: rev ? parseInt(rev.replace('u64', '')) : null,
          contentCount: content ? parseInt(content.replace('u64', '')) : null,
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
        const [tier, hash] = await Promise.all([
          queryMapping('content_meta', contentId),
          queryMapping('content_hashes', contentId),
        ])
        setContentInfo({
          found: tier !== null,
          minTier: tier ? parseInt(tier.replace('u8', '')) : null,
          contentHash: hash || null,
        })
      } catch {
        setContentInfo({ found: false, minTier: null, contentHash: null })
      }
      setContentLoading(false)
    }

    const checkDeployment = async () => {
      setDeployLoading(true)
      setProgramDeployed(null)
      try {
        const res = await fetch(`${ALEO_API}/program/${PROGRAM_ID}`)
        setProgramDeployed(res.ok)
      } catch {
        setProgramDeployed(false)
      }
      setDeployLoading(false)
    }

    return (
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">
              No Wallet Required
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            On-Chain Explorer
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Query on-chain data directly from Aleo testnet. No wallet connection needed.
            Verify creator registrations, content metadata, and program deployment.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Creator Lookup */}
          <GlassCard hover={false}>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-violet-400" />
                <h3 className="text-white font-semibold">Creator Lookup</h3>
              </div>
              <div>
                <input
                  type="text"
                  value={creatorAddr}
                  onChange={(e) => setCreatorAddr(e.target.value)}
                  placeholder="aleo1..."
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <button
                onClick={lookupCreator}
                disabled={creatorLoading || !creatorAddr.startsWith('aleo1')}
                className="w-full py-2.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-600/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {creatorLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Query On-Chain
              </button>
              {creatorStats && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-sm">
                    {creatorStats.registered ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={creatorStats.registered ? 'text-emerald-300' : 'text-red-300'}>
                      {creatorStats.registered ? 'Registered Creator' : 'Not Registered'}
                    </span>
                  </div>
                  {creatorStats.registered && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Base Price</span>
                        <span className="text-white font-mono">
                          {creatorStats.basePrice !== null ? `${(creatorStats.basePrice / 1_000_000).toFixed(2)} ALEO` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Subscribers</span>
                        <span className="text-white font-mono">{creatorStats.subscriberCount ?? '—'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total Revenue</span>
                        <span className="text-white font-mono">
                          {creatorStats.totalRevenue !== null ? `${(creatorStats.totalRevenue / 1_000_000).toFixed(2)} ALEO` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Content Published</span>
                        <span className="text-white font-mono">{creatorStats.contentCount ?? '—'}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Right Column: Content + Deployment */}
          <div className="space-y-6">
            {/* Content Lookup */}
            <GlassCard hover={false}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-violet-400" />
                  <h3 className="text-white font-semibold">Content Verification</h3>
                </div>
                <div>
                  <input
                    type="text"
                    value={contentId}
                    onChange={(e) => setContentId(e.target.value)}
                    placeholder="Content hash (field value)"
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <button
                  onClick={lookupContent}
                  disabled={contentLoading || !contentId}
                  className="w-full py-2.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-600/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {contentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Verify Content
                </button>
                {contentInfo && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 text-sm">
                      {contentInfo.found ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={contentInfo.found ? 'text-emerald-300' : 'text-red-300'}>
                        {contentInfo.found ? 'Content Found On-Chain' : 'Not Found'}
                      </span>
                    </div>
                    {contentInfo.found && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Min Tier Required</span>
                          <span className="text-white">{TIERS.find(t => t.id === contentInfo.minTier)?.name || `Tier ${contentInfo.minTier}`}</span>
                        </div>
                        {contentInfo.contentHash && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Integrity Hash</span>
                            <span className="text-white font-mono text-xs truncate max-w-[160px]">{contentInfo.contentHash}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Deployment Status */}
            <GlassCard hover={false}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-violet-400" />
                  <h3 className="text-white font-semibold">Program Deployment</h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Coins className="w-4 h-4" />
                  <span className="font-mono text-xs">{PROGRAM_ID}</span>
                </div>
                <button
                  onClick={checkDeployment}
                  disabled={deployLoading}
                  className="w-full py-2.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-600/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {deployLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Check Deployment
                </button>
                {programDeployed !== null && (
                  <div className="flex items-center gap-2 text-sm pt-2 border-t border-white/5">
                    {programDeployed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">Deployed on Aleo Testnet</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
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

  return (
    <PageTransition>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <FloatingOrbs />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-violet-300">
                  Zero-Knowledge Proof Verification
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                <span className="bg-gradient-to-r from-white via-violet-200 to-purple-300 bg-clip-text text-transparent">
                  Verify Your Access
                </span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Prove you hold a valid AccessPass using a zero-knowledge proof.
                Your identity stays completely private.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!connected ? (
            <div className="text-center py-16">
              <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-slate-400 text-sm">
                Connect your Leo Wallet to view and verify your Access
                Passes.
              </p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left: Your Passes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    Your Access Passes
                  </h2>
                  <button
                    onClick={loadPasses}
                    disabled={loading}
                    aria-label="Refresh access passes"
                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse"
                      >
                        <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                        <div className="h-3 w-40 bg-white/5 rounded" />
                      </div>
                    ))}
                  </div>
                ) : passes.length > 0 ? (
                  <div className="space-y-3">
                    {passes.map((pass) => {
                      const tierInfo = TIERS.find((t) => t.id === pass.tier)
                      const isSelected =
                        selectedPass?.passId === pass.passId
                      return (
                        <motion.button
                          key={pass.passId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => {
                            setSelectedPass(pass)
                            setVerifyResult('idle')
                            setVerifyTxStatus('idle')
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-violet-500/10 border-violet-500/25'
                              : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium text-sm">
                              {tierInfo?.name || `Tier ${pass.tier}`}
                            </span>
                            <StatusBadge status="active" size="sm" />
                          </div>
                          <p className="text-xs text-slate-500 font-mono">
                            Creator: {shortenAddress(pass.creator)}
                          </p>
                        </motion.button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <Lock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm mb-1">
                      No Access Passes Found
                    </p>
                    <p className="text-slate-600 text-xs">
                      Subscribe to a creator to receive your first pass.
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Verification Panel */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  Verification
                </h2>

                {selectedPass ? (
                  <div className="space-y-4">
                    {/* Selected Pass Info */}
                    <GlassCard hover={false}>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Pass ID</span>
                          <span className="text-white font-mono text-xs">
                            {selectedPass.passId.slice(0, 12)}...
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Creator</span>
                          <span className="text-white font-mono text-xs">
                            {shortenAddress(selectedPass.creator)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Tier</span>
                          <span className="text-white">
                            {TIERS.find((t) => t.id === selectedPass.tier)
                              ?.name || `Tier ${selectedPass.tier}`}
                          </span>
                        </div>
                      </div>
                    </GlassCard>

                    {verifyResult === 'idle' && verifyTxStatus === 'idle' && (
                      <button
                        onClick={() => handleVerify(selectedPass)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Verify with ZK Proof
                      </button>
                    )}

                    {verifyTxStatus !== 'idle' &&
                      verifyResult === 'idle' && (
                        <TransactionStatus
                          status={verifyTxStatus}
                          txId={verifyTxId}
                        />
                      )}

                    {verifyResult !== 'idle' && (
                      <VerificationResult
                        success={verifyResult === 'success'}
                        txId={verifyTxId}
                        passCreator={shortenAddress(selectedPass.creator)}
                        passTier={
                          TIERS.find((t) => t.id === selectedPass.tier)
                            ?.name
                        }
                      />
                    )}

                    {verifyResult !== 'idle' && (
                      <button
                        onClick={() => {
                          stopPolling()
                          setVerifyResult('idle')
                          setVerifyTxStatus('idle')
                          setVerifyTxId(null)
                        }}
                        className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors"
                      >
                        Verify Again
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <ShieldCheck className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">
                      Select a pass to begin verification
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* On-Chain Explorer — Walletless Verification */}
        <OnChainExplorer />

        {/* How It Works */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-3">
              How ZK Verification Works
            </h2>
            <p className="text-slate-400 text-sm">
              Three steps, zero identity exposure.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Lock,
                title: 'Pass Consumed',
                desc: 'Your existing AccessPass record is consumed (destroyed) in the UTXO model — like spending a coin.',
              },
              {
                icon: Fingerprint,
                title: 'ZK Proof Generated',
                desc: 'A zero-knowledge proof is created that proves you owned a valid pass, without revealing your identity.',
              },
              {
                icon: Shield,
                title: 'New Pass Created',
                desc: 'A fresh AccessPass with identical data is created in your wallet. No public state changes occur.',
              },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <GlassCard key={step.title} delay={i * 0.1}>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-violet-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-400">{step.desc}</p>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
