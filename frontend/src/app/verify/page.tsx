'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Lock,
  ShieldCheck,
  Fingerprint,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { parseRecordPlaintext, shortenAddress } from '@/lib/utils'
import { TIERS } from '@/types'
import type { AccessPass, TxStatus } from '@/types'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import FloatingOrbs from '@/components/FloatingOrbs'
import StatusBadge from '@/components/StatusBadge'
import VerificationResult from '@/components/VerificationResult'
import TransactionStatus from '@/components/TransactionStatus'

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!connected) {
      setPasses([])
      return
    }
    loadPasses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, getAccessPasses])

  const loadPasses = async () => {
    setLoading(true)
    try {
      const records = await getAccessPasses()
      const parsed = records
        .map((r) => {
          const p = parseRecordPlaintext(r)
          return {
            owner: p.owner ?? '',
            creator: p.creator ?? '',
            tier: parseInt(p.tier ?? '0', 10),
            passId: p.pass_id ?? '',
            expiresAt: parseInt(p.expires_at ?? '0', 10),
            rawPlaintext: r,
          }
        })
        .filter((p) => p.creator && p.tier > 0)
      setPasses(parsed)
    } catch {
      setPasses([])
    }
    setLoading(false)
  }

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
                Connect your Shield Wallet to view and verify your Access
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
