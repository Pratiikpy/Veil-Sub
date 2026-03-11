'use client'

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, FileKey, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { getErrorMessage } from '@/lib/errorMessages'
import { FEES } from '@/lib/config'
import { formatCredits } from '@/lib/utils'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'
import type { AccessPass } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  pass: AccessPass
}

export default function CreateAuditTokenModal({ isOpen, onClose, pass }: Props) {
  const { createAuditToken, connected } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const {
    txStatus, setTxStatus, txId, setTxId,
    error, setError, statusMessage,
    submittingRef, handleClose, resetFlow,
  } = useTransactionFlow({ isOpen, onClose, connected, stopPolling })
  const focusTrapRef = useFocusTrap(isOpen, handleClose)

  const [verifierAddress, setVerifierAddress] = useState('')
  // v27: Scope mask — controls which fields the verifier can see
  // Bit 0 (1): creator, Bit 1 (2): tier, Bit 2 (4): expiry, Bit 3 (8): subscriber_hash
  const [scopeFlags, setScopeFlags] = useState({ creator: true, tier: true, expiry: true, subscriberHash: false })

  const scopeMask = (scopeFlags.creator ? 1 : 0) + (scopeFlags.tier ? 2 : 0) + (scopeFlags.expiry ? 4 : 0) + (scopeFlags.subscriberHash ? 8 : 0)

  const handleCreate = async () => {
    if (submittingRef.current) return
    if (!connected) {
      setError('Connect wallet to create a scoped audit token.')
      return
    }
    if (!verifierAddress.startsWith('aleo1') || verifierAddress.length < 60) {
      setError('Enter a valid Aleo address for the verifier.')
      return
    }
    if (scopeMask === 0) {
      setError('Select at least one field to disclose.')
      return
    }

    submittingRef.current = true
    setError(null)
    setTxStatus('signing')
    toast.loading('Creating audit token...', { id: 'audit-token', duration: 60000 })

    try {
      setTxStatus('proving')
      toast.dismiss('audit-token')
      const id = await createAuditToken(pass.rawPlaintext, verifierAddress, scopeMask)

      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')
        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            if (result.resolvedTxId) setTxId(result.resolvedTxId)
            setTxStatus('confirmed')
            toast.success('Audit token created!')
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            setError('Token creation failed. Check your wallet and try again.')
            toast.error('Audit token creation failed')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Transaction was rejected by wallet.')
      }
    } catch (err) {
      toast.dismiss('audit-token')
      setTxStatus('failed')
      setError(getErrorMessage(err instanceof Error ? err.message : 'Failed to create audit token'))
    } finally {
      submittingRef.current = false
    }
  }

  const tierName = pass.tier === 3 ? 'VIP' : pass.tier === 2 ? 'Premium' : 'Supporter'

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={handleClose}
        >
          <m.div
            ref={focusTrapRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Create audit token"
            className="w-full max-w-md rounded-xl bg-surface-1 border border-border shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileKey className="w-5 h-5 text-violet-400" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-white">Create Verification Token</h3>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close audit token dialog"
                className="p-1 rounded-lg hover:bg-white/[0.05] text-white/70 hover:text-white active:scale-[0.9] transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {txStatus === 'idle' ? (
              <>
                {/* Pass Details */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                  <p className="text-xs text-white/60 uppercase tracking-wider font-medium mb-2">Source AccessPass</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Tier</span>
                      <span className="text-white font-medium">{tierName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Pass ID</span>
                      <span className="text-white font-mono text-xs">
                        {pass.passId.length > 20 ? `${pass.passId.slice(0, 10)}...${pass.passId.slice(-8)}` : pass.passId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Privacy Explanation */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border mb-4">
                  <div className="flex gap-2">
                    <Shield className="w-4 h-4 text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="text-[11px] text-green-400/80 space-y-1">
                      <p className="font-medium text-green-400">Selective Disclosure</p>
                      <p>Creates a verification token for the recipient. You choose exactly which information to share.</p>
                      <p>Completely private—your wallet address is never revealed on-chain.</p>
                    </div>
                  </div>
                </div>

                {/* v27: Scope Selection */}
                <div className="mb-4">
                  <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-2">Disclosure Scope</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: 'creator' as const, label: 'Creator', desc: 'Which creator' },
                      { key: 'tier' as const, label: 'Tier Level', desc: 'Subscription tier' },
                      { key: 'expiry' as const, label: 'Expiry', desc: 'When it expires' },
                      { key: 'subscriberHash' as const, label: 'Sub. Hash', desc: 'Your hashed ID' },
                    ]).map(({ key, label, desc }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setScopeFlags(prev => ({ ...prev, [key]: !prev[key] }))}
                        aria-pressed={scopeFlags[key]}
                        aria-label={`${label}: ${desc}`}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          scopeFlags[key]
                            ? 'border-violet-500/50 bg-violet-500/10 text-white'
                            : 'border-border bg-white/[0.02] text-white/60'
                        }`}
                      >
                        <span className="text-xs font-medium block">{label}</span>
                        <span className="text-[10px] opacity-60">{desc}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/60 mt-1.5">
                    Only selected fields will be visible to the verifier. Fewer fields = more privacy.
                  </p>
                </div>

                {/* Verifier Address Input */}
                <div className="mb-4">
                  <label htmlFor="verifier-address" className="block text-xs text-white/60 font-medium uppercase tracking-wider mb-2">
                    Verifier Address
                  </label>
                  <input
                    id="verifier-address"
                    type="text"
                    value={verifierAddress}
                    onChange={(e) => setVerifierAddress(e.target.value.trim())}
                    placeholder="aleo1..."
                    className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm font-mono"
                  />
                  <p className="text-[10px] text-white/60 mt-1">
                    The Aleo address that will receive and hold the audit token.
                  </p>
                </div>

                {/* Fee Info */}
                <div className="p-2.5 rounded-xl bg-surface-2 border border-border mb-4">
                  <p className="text-[11px] text-white/60">
                    Est. network fee: ~{formatCredits(FEES.AUDIT_TOKEN)} ALEO. Completely private operation.
                  </p>
                </div>

                {error && (
                  <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/15 mb-4">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                <Button onClick={handleCreate} disabled={txStatus !== 'idle'} className="w-full">
                  Create Token
                </Button>
              </>
            ) : (
              <div className="py-2">
                {statusMessage && (
                  <div className="mb-4 p-4 rounded-xl bg-surface-2 border border-border">
                    <p className="text-xs text-white/70 animate-pulse">{statusMessage}</p>
                  </div>
                )}
                <TransactionStatus status={txStatus} txId={txId} errorMessage={error} />
                {txStatus === 'confirmed' && (
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center"
                  >
                    <p className="text-green-400 font-medium mb-1">Verification Token Created</p>
                    <p className="text-xs text-white/60">
                      Token created for verifier. Completely private—no public record on-chain.
                    </p>
                    <button
                      onClick={handleClose}
                      className="mt-4 px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                    >
                      Done
                    </button>
                  </m.div>
                )}
                {txStatus === 'failed' && (
                  <div className="mt-4 text-center">
                    {error && <p role="alert" className="text-xs text-red-400 mb-4">{error}</p>}
                    <button
                      onClick={() => resetFlow()}
                      className="px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                    >
                      Retry Token
                    </button>
                  </div>
                )}
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
