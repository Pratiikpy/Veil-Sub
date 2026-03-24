'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { m } from 'framer-motion'
import {
  Shield,
  Lock,
  ShieldCheck,
  Fingerprint,
  RefreshCw,
  Zap,
  Search,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { parseAccessPass, shortenAddress } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errorMessages'
import { TIERS } from '@/types'
import type { AccessPass, TxStatus } from '@/types'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import StatusBadge from '@/components/StatusBadge'
import VerificationResult from '@/components/VerificationResult'
import TransactionStatus from '@/components/TransactionStatus'
import OnChainExplorer from '@/components/OnChainExplorer'
import VerificationReceipt from '@/components/VerificationReceipt'
import { SECONDS_PER_BLOCK, FEATURED_CREATORS } from '@/lib/config'

// Extracted style constants to prevent re-renders
const HERO_GLOW_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.06) 0%, transparent 70%)',
} as const

const LETTER_SPACING_STYLE = { letterSpacing: '-0.03em' } as const
const HEADING_TIGHT_STYLE = { letterSpacing: '-0.02em' } as const

export default function VerifyPage() {
  const { connected } = useWallet()
  const { getAccessPasses, verifyAccess } = useVeilSub()
  const { blockHeight } = useBlockHeight()
  const { startPolling, stopPolling } = useTransactionPoller()

  const [passes, setPasses] = useState<AccessPass[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedPass, setSelectedPass] = useState<AccessPass | null>(null)
  const [verifyTxStatus, setVerifyTxStatus] = useState<TxStatus>('idle')
  const [verifyTxId, setVerifyTxId] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
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
      setVerifyError('Wallet disconnected mid-verification. Reconnect and retry.')
      stopPolling()
    }
  }, [connected, verifyTxStatus, stopPolling])

  const loadPasses = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const records = await getAccessPasses()
      const parsed = records
        .map((r) => parseAccessPass(r))
        .filter((p): p is NonNullable<typeof p> => p !== null && p.creator !== '')
      setPasses(parsed)
    } catch (err) {
      setPasses([])
      // Distinguish wallet vs network errors
      const message = err instanceof Error ? err.message.toLowerCase() : ''
      if (message.includes('connect') || message.includes('wallet') || message.includes('extension')) {
        setLoadError('Wallet connection lost. Unlock your wallet extension and refresh the page.')
      } else if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
        setLoadError('Network error while syncing subscription passes from your wallet.')
      } else {
        setLoadError('Could not load subscription passes. Your wallet may still be syncing.')
      }
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

  const getPassStatus = (pass: AccessPass): 'active' | 'expired' | 'unknown' => {
    if (blockHeight === null || !pass.expiresAt || pass.expiresAt === 0) return 'unknown'
    return pass.expiresAt <= blockHeight ? 'expired' : 'active'
  }

  const getPassDaysLeft = (pass: AccessPass): number | null => {
    if (blockHeight === null || !pass.expiresAt || pass.expiresAt === 0) return null
    const blocksLeft = pass.expiresAt - blockHeight
    if (blocksLeft <= 0) return 0
    return Math.max(1, Math.round((blocksLeft * 3) / 86400))
  }

  const handleVerify = async (pass: AccessPass) => {
    // Pre-verification expiry check—save user gas on expired passes
    const status = getPassStatus(pass)
    if (status === 'expired') {
      setSelectedPass(pass)
      setVerifyResult('failed')
      setVerifyError('This pass has expired. Renew your subscription on the creator\'s page before verifying.')
      setVerifyTxStatus('idle')
      return
    }

    setSelectedPass(pass)
    setVerifyResult('idle')
    setVerifyError(null)
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
            loadPasses() // Refresh passes after verification (pass is consumed and re-created)
          } else if (result.status === 'failed') {
            setVerifyTxStatus('failed')
            setVerifyResult('failed')
            setVerifyError('Transaction failed on-chain. Your pass may be revoked or expired.')
          } else if (result.status === 'timeout') {
            setVerifyTxStatus('failed')
            setVerifyResult('failed')
            setVerifyError('Transaction is still processing. Check your wallet or refresh the page to see if it completed.')
          }
        })
      } else {
        setVerifyTxStatus('failed')
        setVerifyResult('failed')
        setVerifyError('Wallet didn\u2019t approve the transaction. Try again when ready.')
      }
    } catch (err) {
      setVerifyTxStatus('failed')
      setVerifyResult('failed')
      setVerifyError(err instanceof Error ? getErrorMessage(err.message) : 'Verification failed. Check wallet connection and subscription pass validity.')
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen overflow-x-hidden">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[800px] h-[200px] sm:h-[400px] pointer-events-none"
            style={HERO_GLOW_STYLE}
          />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-4 sm:pb-16">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/[0.06] border border-violet-500/[0.12] mb-6">
                <ShieldCheck className="w-4 h-4 text-violet-400" aria-hidden="true" />
                <span className="text-xs font-medium tracking-wide uppercase text-violet-300">
                  BSP Zero-Footprint Verify
                </span>
              </div>
              <h1
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={LETTER_SPACING_STYLE}
              >
                Verify Your Access
              </h1>
              <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
                Prove your subscription privately — without revealing your identity.
              </p>
              <p className="text-sm text-white/50 max-w-2xl mx-auto mt-2">
                Verification checks only your subscription ID, expiry, and revocation status — your wallet address is never stored publicly.
              </p>
            </m.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
          {!connected ? (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto py-2 sm:py-8"
            >
              {/* Interactive Demo Section */}
              <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
                {/* Left: Demo Animation */}
                <div className="relative overflow-hidden">
                  <div className="absolute -inset-2 bg-gradient-to-r from-violet-500/10 to-transparent rounded-2xl blur-xl" />
                  <div className="relative p-4 sm:p-8 rounded-xl bg-surface-1 border border-violet-500/20">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-violet-400" aria-hidden="true" />
                      Live Demo: ZK Verification Flow
                    </h3>

                    {/* Animated flow visualization */}
                    <div className="space-y-4">
                      {/* Step 1: AccessPass */}
                      <m.div
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                        className="flex items-center gap-4 p-4 rounded-lg bg-violet-500/10 border border-violet-500/20"
                      >
                        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4 text-violet-400" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white">Subscription Pass</p>
                          <p className="text-xs text-white/50 truncate font-mono">Access ID: 7f3a...9b2c</p>
                        </div>
                        <m.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                          className="text-xs text-violet-400"
                        >
                          INPUT
                        </m.div>
                      </m.div>

                      {/* Arrow */}
                      <div className="flex justify-center">
                        <m.div
                          animate={{ y: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-0.5 h-6 bg-gradient-to-b from-violet-500/50 to-transparent"
                        />
                      </div>

                      {/* Step 2: ZK Proof */}
                      <m.div
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        className="flex items-center gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20"
                      >
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                          <Fingerprint className="w-4 h-4 text-green-400" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white">ZK Proof Generated</p>
                          <p className="text-xs text-white/50 truncate">Proves access without sending address to finalize</p>
                        </div>
                        <m.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          className="text-green-400"
                        >
                          <RefreshCw className="w-3 h-3" aria-hidden="true" />
                        </m.div>
                      </m.div>

                      {/* Arrow */}
                      <div className="flex justify-center">
                        <m.div
                          animate={{ y: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                          className="w-0.5 h-6 bg-gradient-to-b from-green-500/50 to-transparent"
                        />
                      </div>

                      {/* Step 3: Finalize */}
                      <m.div
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 2 }}
                        className="flex items-center gap-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4 text-blue-400" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white">Finalize (On-Chain)</p>
                          <p className="text-xs text-white/50 truncate">Only checks: pass_id, expires_at</p>
                        </div>
                        <span className="text-xs text-blue-400 font-medium">VERIFIED</span>
                      </m.div>
                    </div>

                    {/* Key insight - enhanced */}
                    <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-green-500/10 via-transparent to-violet-500/10 border border-green-500/20">
                      <div className="flex items-start gap-4">
                        <ShieldCheck className="w-5 h-5 text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-semibold text-white mb-1">Zero Public Footprint</p>
                          <p className="text-xs text-white/70 leading-relaxed">
                            Your address never appears in mappings. Finalize only reads pass_id + expiry—no subscriber lookups. Proof happens client-side; public state stays silent.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Connect CTA */}
                <div className="flex flex-col justify-center">
                  <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-2xl bg-violet-500/20 animate-pulse" />
                    <div className="relative w-full h-full rounded-2xl bg-surface-1 border border-violet-500/20 flex items-center justify-center">
                      <Fingerprint className="w-8 h-8 text-violet-400" aria-hidden="true" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2 text-center">
                    Connect Wallet to Verify
                  </h2>
                  <p className="text-white/70 text-sm mb-6 text-center">
                    Connect to view your private access passes. Verification proves subscription validity without revealing your address—on-chain checks only confirm the pass exists, not who owns it.
                  </p>

                  {/* What gets verified */}
                  <div className="space-y-2 mb-6">
                    {[
                      { label: 'Pass not revoked', desc: 'access_revoked[pass_id] == false' },
                      { label: 'Not expired', desc: 'expires_at > block.height' },
                      { label: 'Valid creator', desc: 'pass_creator[pass_id] matches' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" aria-hidden="true" />
                        <span className="text-white/90">{item.label}</span>
                        <span className="text-white/60 text-xs font-mono hidden sm:inline">({item.desc})</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl glass text-left">
                    <p className="text-xs text-white/70 leading-relaxed">
                      <strong className="text-violet-300">UTXO pattern:</strong> verify_access consumes your pass, generates ZK proof client-side, then finalize atomically checks pass_id + expiry and re-creates an identical pass. Wallet address never enters finalize&apos;s visibility scope.
                    </p>
                  </div>
                </div>
              </div>

              {/* After Verification - Content Delivery Examples */}
              <div className="p-4 sm:p-8 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/15">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" aria-hidden="true" />
                  After Verification: Content Unlocked
                </h3>
                <p className="text-xs text-white/70 mb-4">
                  Once verified on-chain, creators can confidently serve gated content:
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Video streams with access token', icon: '▶' },
                    { label: 'Private content URLs (time-limited)', icon: '🔗' },
                    { label: 'Exclusive downloads & assets', icon: '📥' },
                    { label: 'Direct messages from creator', icon: '💬' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                      <span className="text-xs font-bold text-green-400 bg-green-500/15 w-6 h-6 rounded flex items-center justify-center">{item.icon}</span>
                      <span className="text-xs text-white/80">{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/50 italic mt-4">
                  All powered by your subscription pass — never revealing who owns it.
                </p>
              </div>

              <p className="text-xs text-white/60 text-center">
                Scroll down to explore on-chain verification without connecting—see how subscriber proofs stay off public state.
              </p>
            </m.div>
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
                    className="p-2 rounded-lg bg-white/[0.05] border border-border text-white/60 hover:text-white hover:bg-white/[0.08] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-white/[0.02] border border-border animate-pulse"
                      >
                        <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                        <div className="h-3 w-40 bg-white/5 rounded" />
                      </div>
                    ))}
                  </div>
                ) : loadError ? (
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-sm text-red-300 mb-4">{loadError}</p>
                    <button
                      onClick={loadPasses}
                      className="px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-xs text-white hover:bg-white/[0.08] transition-all inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" aria-hidden="true" />
                      Retry
                    </button>
                  </div>
                ) : passes.length > 0 ? (
                  <div className="space-y-4">
                    {passes.map((pass) => {
                      const tierInfo = TIERS.find((t) => t.id === pass.tier)
                      const isSelected =
                        selectedPass?.passId === pass.passId
                      const passStatus = getPassStatus(pass)
                      const daysLeft = getPassDaysLeft(pass)
                      const isExpired = passStatus === 'expired'
                      return (
                        <m.button
                          key={pass.passId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => {
                            setSelectedPass(pass)
                            setVerifyResult('idle')
                            setVerifyTxStatus('idle')
                            setVerifyError(null)
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                            isExpired
                              ? isSelected
                                ? 'bg-red-500/[0.04] border-red-500/30 opacity-80'
                                : 'bg-surface-1 border-border opacity-60 hover:opacity-80 hover:border-red-500/20'
                              : isSelected
                                ? 'bg-violet-500/[0.04] border-violet-500/30 shadow-accent-sm'
                                : 'bg-surface-1 border-border hover:border-glass-hover hover:bg-white/[0.01]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-medium text-sm ${isExpired ? 'text-white/70' : 'text-white'}`}>
                              {tierInfo?.name || `Tier ${pass.tier}`}
                            </span>
                            <StatusBadge status={isExpired ? 'expired' : 'active'} size="sm" />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-white/60 font-mono">
                              Creator: {shortenAddress(pass.creator)}
                            </p>
                            {daysLeft !== null && !isExpired && (
                              <span className="flex items-center gap-1 text-xs text-white/60">
                                <Clock className="w-3 h-3" aria-hidden="true" />
                                {daysLeft}d left
                              </span>
                            )}
                          </div>
                        </m.button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-xl bg-surface-1 border border-border">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-2xl bg-violet-500/10 animate-pulse" />
                      <div className="relative w-full h-full rounded-2xl bg-surface-1 border border-border flex items-center justify-center">
                        <Lock className="w-8 h-8 text-white/60" aria-hidden="true" />
                      </div>
                    </div>
                    <p className="text-white font-medium text-sm mb-1">
                      No Private Passes Yet
                    </p>
                    <p className="text-white/60 text-xs mb-4">
                      Subscribe to a creator to receive your encrypted subscription pass — your identity stays private.
                    </p>
                    <Link
                      href="/explore"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-xs text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
                    >
                      <Search className="w-3 h-3" aria-hidden="true" />
                      Explore Creators
                    </Link>
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
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Pass ID</span>
                          <span className="text-white font-mono text-xs">
                            {selectedPass.passId.slice(0, 12)}...
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Creator</span>
                          <span className="text-white font-mono text-xs">
                            {shortenAddress(selectedPass.creator)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Tier</span>
                          <span className="text-white">
                            {TIERS.find((t) => t.id === selectedPass.tier)
                              ?.name || `Tier ${selectedPass.tier}`}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Status</span>
                          {(() => {
                            const status = getPassStatus(selectedPass)
                            const days = getPassDaysLeft(selectedPass)
                            if (status === 'expired') return <span className="text-red-400 font-medium">Expired</span>
                            if (days !== null) return <span className="text-green-400">{days}d remaining</span>
                            return <span className="text-white/70">Unknown</span>
                          })()}
                        </div>
                      </div>
                    </GlassCard>

                    {/* Expired pass warning */}
                    {getPassStatus(selectedPass) === 'expired' && verifyResult === 'idle' && (
                      <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/15 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
                        <div>
                          <p className="text-xs text-red-300 mb-1">This pass has expired.</p>
                          <p className="text-xs text-white/60">Verification will fail. Visit the creator&apos;s page to renew.</p>
                        </div>
                      </div>
                    )}

                    {verifyResult === 'idle' && verifyTxStatus === 'idle' && (
                      getPassStatus(selectedPass) === 'expired' ? (
                        <Link
                          href={`/creator/${selectedPass.creator}`}
                          className="w-full py-4 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 font-medium hover:bg-violet-500/20 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                          <RefreshCw className="w-4 h-4" aria-hidden="true" />
                          Renew This Pass
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleVerify(selectedPass)}
                          className="w-full py-4 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] btn-shimmer"
                        >
                          <Zap className="w-4 h-4" aria-hidden="true" />
                          Verify with ZK Proof
                        </button>
                      )
                    )}

                    {verifyTxStatus !== 'idle' &&
                      verifyResult === 'idle' && (
                        <TransactionStatus
                          status={verifyTxStatus}
                          txId={verifyTxId}
                        />
                      )}

                    {verifyResult !== 'idle' && (
                      <>
                        <VerificationResult
                          success={verifyResult === 'success'}
                          txId={verifyTxId}
                          passCreator={shortenAddress(selectedPass.creator)}
                          passTier={
                            TIERS.find((t) => t.id === selectedPass.tier)
                              ?.name
                          }
                        />

                        {/* Shareable verification receipt on success */}
                        {verifyResult === 'success' && selectedPass && (() => {
                          const tierName = TIERS.find((t) => t.id === selectedPass.tier)?.name || `Tier ${selectedPass.tier}`
                          const featured = FEATURED_CREATORS.find((c) => c.address === selectedPass.creator)
                          const creatorLabel = featured ? featured.label : shortenAddress(selectedPass.creator)
                          const now = new Date()
                          const verifiedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          let expiryDate = 'Unknown'
                          if (blockHeight !== null && selectedPass.expiresAt && selectedPass.expiresAt > 0) {
                            const blocksLeft = selectedPass.expiresAt - blockHeight
                            const secondsLeft = blocksLeft * SECONDS_PER_BLOCK
                            const expiryMs = now.getTime() + secondsLeft * 1000
                            expiryDate = new Date(expiryMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          }
                          return (
                            <VerificationReceipt
                              creatorName={creatorLabel}
                              tier={tierName}
                              expiresAt={expiryDate}
                              verifiedAt={verifiedDate}
                              passId={selectedPass.passId}
                            />
                          )
                        })()}

                        {/* Recovery guidance on failure */}
                        {verifyResult === 'failed' && verifyError && (
                          <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/15">
                            <p className="text-xs text-red-300 mb-2">{verifyError}</p>
                            <div className="flex flex-wrap gap-2">
                              {(verifyError.includes('expired') || verifyError.includes('renew')) && (
                                <Link
                                  href={`/creator/${selectedPass.creator}`}
                                  className="px-4 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/20 transition-all inline-flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                                  Renew Subscription
                                </Link>
                              )}
                              {(verifyError.includes('revoked') || verifyError.includes('ERR_027')) && (
                                <Link
                                  href={`/creator/${selectedPass.creator}`}
                                  className="px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-xs text-white/70 hover:bg-white/[0.08] transition-all inline-flex items-center gap-1"
                                >
                                  Re-subscribe
                                </Link>
                              )}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            stopPolling()
                            setVerifyResult('idle')
                            setVerifyTxStatus('idle')
                            setVerifyTxId(null)
                            setVerifyError(null)
                          }}
                          className="w-full py-2.5 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] transition-all duration-300 active:scale-[0.98]"
                        >
                          {verifyResult === 'failed' ? 'Try Another Pass' : 'Verify Again'}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 rounded-xl bg-surface-1 border border-border">
                    <ShieldCheck className="w-10 h-10 text-white/60 mx-auto mb-4" aria-hidden="true" />
                    <p className="text-white font-medium text-sm mb-1">
                      Select a Pass to Verify
                    </p>
                    <p className="text-white/70 text-xs mb-4 max-w-xs mx-auto">
                      Pick any subscription pass from the list. When you verify, a privacy proof is generated on your device — your address never reaches the blockchain.
                    </p>
                    <div className="p-4 rounded-lg bg-violet-500/5 border border-violet-500/10 mx-4">
                      <p className="text-xs text-white/70">
                        <strong className="text-violet-300">How it works:</strong> Your pass is consumed and instantly re-created in one atomic transaction. Finalize only reads pass_id and expiry—your subscriber identity is architecturally impossible to expose.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* On-Chain Explorer — Walletless Verification */}
        <OnChainExplorer />

        {/* How It Works */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 border-t border-border">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6 sm:mb-12"
          >
            <h2
              className="text-2xl sm:text-3xl font-bold text-white mb-4"
              style={HEADING_TIGHT_STYLE}
            >
              How ZK Verification Works
            </h2>
            <p className="text-white/70 text-sm">
              Three steps, zero identity exposure.
            </p>
          </m.div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-8">
            {[
              {
                icon: Lock,
                title: 'Pass Consumed',
                desc: 'Your existing subscription pass is consumed during verification — similar to using a ticket.',
              },
              {
                icon: Fingerprint,
                title: 'ZK Proof Generated',
                desc: 'A ZK proof confirms pass ownership. Finalize receives only pass_id + expires_at—subscriber address excluded at compile time.',
              },
              {
                icon: Shield,
                title: 'New Pass Created',
                desc: 'A fresh subscription pass with identical data is created in your wallet. No public changes occur.',
              },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <GlassCard key={step.title} delay={i * 0.1}>
                  <div className="text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold mb-4">
                      {i + 1}
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-violet-500/[0.06] border border-violet-500/[0.1] flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-violet-400/70" aria-hidden="true" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-white/70">{step.desc}</p>
                  </div>
                </GlassCard>
              )
            })}
          </div>
          <m.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 text-center"
          >
            <p className="text-xs text-white/70">
              <strong className="text-violet-300">Zero-footprint verification:</strong> VeilSub&apos;s verify_access generates ZK proof client-side, then finalize reads only pass_id + expires_at. No subscriber address written, read, or hashed in any mapping.
            </p>
          </m.div>
        </section>
      </div>
    </PageTransition>
  )
}
