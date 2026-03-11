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
      setVerifyError('Wallet disconnected during verification. Please reconnect and try again.')
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
    } catch {
      setPasses([])
      setLoadError('Failed to load passes. Check your wallet connection and try again.')
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
          } else if (result.status === 'failed') {
            setVerifyTxStatus('failed')
            setVerifyResult('failed')
            setVerifyError('Transaction failed on-chain. Your pass may be revoked or expired.')
          }
        })
      } else {
        setVerifyTxStatus('failed')
        setVerifyResult('failed')
        setVerifyError('Transaction was rejected by wallet.')
      }
    } catch (err) {
      setVerifyTxStatus('failed')
      setVerifyResult('failed')
      setVerifyError(err instanceof Error ? getErrorMessage(err.message) : 'Verification failed. Please try again.')
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[800px] h-[200px] sm:h-[400px] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.06) 0%, transparent 70%)',
            }}
          />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/[0.06] border border-violet-500/[0.12] mb-6">
                <ShieldCheck className="w-4 h-4 text-violet-400" aria-hidden="true" />
                <span className="text-xs font-medium tracking-wide uppercase text-violet-300">
                  BSP Zero-Footprint Verify
                </span>
              </div>
              <h1
                className="text-4xl sm:text-5xl font-serif italic text-white mb-4"
                style={{ letterSpacing: '-0.03em' }}
              >
                Verify Your Access
              </h1>
              <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
                Run verify_access to prove subscription. Finalize only checks pass_id + expires_at—your address never touches public state.
              </p>
            </m.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!connected ? (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto text-center py-12"
            >
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl bg-violet-500/20 animate-pulse" />
                <div className="relative w-full h-full rounded-2xl bg-surface-1 border border-violet-500/20 flex items-center justify-center">
                  <Fingerprint className="w-8 h-8 text-violet-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Connect Wallet to Verify
              </h2>
              <p className="text-white/70 text-sm mb-6">
                Connect your wallet to view your AccessPasses and generate zero-knowledge proofs.
              </p>
              <div className="p-4 rounded-xl glass text-left">
                <p className="text-xs text-white/70 leading-relaxed">
                  <strong className="text-violet-300">How it works:</strong> Select an AccessPass from your wallet, then click Verify. verify_access consumes your pass (UTXO pattern), checks access_revoked[pass_id] and expires_at &gt; block.height in finalize, then re-creates the pass. Zero subscriber-identifying mapping writes.
                </p>
              </div>
              <p className="text-xs text-white/60 mt-4">
                Scroll down to use the On-Chain Explorer without a wallet.
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
                    className="p-2 rounded-lg bg-white/[0.05] border border-border text-white/60 hover:text-white hover:bg-white/[0.08] transition-all duration-300"
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
                        className="p-4 rounded-xl bg-white/[0.02] border border-border animate-pulse"
                      >
                        <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                        <div className="h-3 w-40 bg-white/5 rounded" />
                      </div>
                    ))}
                  </div>
                ) : loadError ? (
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-300 mb-3">{loadError}</p>
                    <button
                      onClick={loadPasses}
                      className="px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-xs text-white hover:bg-white/[0.08] transition-all inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                ) : passes.length > 0 ? (
                  <div className="space-y-3">
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
                                <Clock className="w-3 h-3" />
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
                    <div className="relative w-14 h-14 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-xl bg-violet-500/10 animate-pulse" />
                      <div className="relative w-full h-full rounded-xl bg-surface-1 border border-border flex items-center justify-center">
                        <Lock className="w-7 h-7 text-white/60" />
                      </div>
                    </div>
                    <p className="text-white font-medium text-sm mb-1">
                      No Access Passes Found
                    </p>
                    <p className="text-white/60 text-xs mb-4">
                      Subscribe to a creator to receive your first AccessPass.
                    </p>
                    <Link
                      href="/explore"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-xs text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
                    >
                      <Search className="w-3 h-3" />
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
                      <div className="space-y-3">
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
                      <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
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
                          className="w-full py-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 font-medium hover:bg-violet-500/20 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Renew This Pass
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleVerify(selectedPass)}
                          className="w-full py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] btn-shimmer"
                        >
                          <Zap className="w-4 h-4" />
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

                        {/* Recovery guidance on failure */}
                        {verifyResult === 'failed' && verifyError && (
                          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                            <p className="text-xs text-red-300 mb-2">{verifyError}</p>
                            <div className="flex flex-wrap gap-2">
                              {(verifyError.includes('expired') || verifyError.includes('renew')) && (
                                <Link
                                  href={`/creator/${selectedPass.creator}`}
                                  className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/20 transition-all inline-flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Renew Subscription
                                </Link>
                              )}
                              {(verifyError.includes('revoked') || verifyError.includes('ERR_027')) && (
                                <Link
                                  href={`/creator/${selectedPass.creator}`}
                                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-border text-xs text-white/70 hover:bg-white/[0.08] transition-all inline-flex items-center gap-1"
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
                    <ShieldCheck className="w-10 h-10 text-white/60 mx-auto mb-3" />
                    <p className="text-white/70 text-sm">
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
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-border">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2
              className="text-2xl sm:text-3xl font-serif italic text-white mb-3"
              style={{ letterSpacing: '-0.02em' }}
            >
              How ZK Verification Works
            </h2>
            <p className="text-white/70 text-sm">
              Three steps, zero identity exposure.
            </p>
          </m.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Lock,
                title: 'Pass Consumed',
                desc: 'Your existing AccessPass record is consumed (destroyed) in the UTXO model—like spending a coin.',
              },
              {
                icon: Fingerprint,
                title: 'ZK Proof Generated',
                desc: 'A ZK proof confirms pass ownership. Finalize receives only pass_id + expires_at—subscriber address excluded at compile time.',
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
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold mb-3">
                      {i + 1}
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-violet-500/[0.06] border border-violet-500/[0.1] flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-violet-400/70" />
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
              <strong className="text-violet-300">Minimal footprint:</strong> VeilSub&apos;s verify_access finalize only checks revocation via pass_id—subscriber identity never touches public state. No subscriber-identifying mapping writes occur when proving access.
            </p>
          </m.div>
        </section>
      </div>
    </PageTransition>
  )
}
