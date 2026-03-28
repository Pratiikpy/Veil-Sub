'use client'

import { useState, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { spring } from '@/lib/motion'
import { CheckCircle2, XCircle, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import GlassCard from '@/components/GlassCard'
import Button from '@/components/ui/Button'
import { useContractExecute } from '@/hooks/useContractExecute'
import { MICROCREDITS_PER_CREDIT } from '@/lib/config'
import { MARKETPLACE_PROGRAM_ID, MARKETPLACE_FEES } from './constants'

export default function VerifyBadgeSection() {
  const { execute, connected } = useContractExecute()
  const [creatorHash, setCreatorHash] = useState('')
  const [minBadge, setMinBadge] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [verifyResult, setVerifyResult] = useState<'success' | 'fail' | null>(null)

  const handleVerify = useCallback(async () => {
    if (!connected) {
      toast.error('Please connect your wallet')
      return
    }
    if (!creatorHash) {
      toast.error('Please enter a creator hash')
      return
    }
    setSubmitting(true)
    setVerifyResult(null)
    try {
      const txId = await execute(
        'verify_badge',
        [creatorHash, `${minBadge}u8`],
        MARKETPLACE_FEES.VERIFY_BADGE,
        MARKETPLACE_PROGRAM_ID
      )
      if (txId) {
        setVerifyResult('success')
        toast.success('Badge verified! Creator meets the required badge level.')
      }
    } catch (err) {
      setVerifyResult('fail')
      const msg = err instanceof Error ? err.message : 'Verification failed'
      if (msg.includes('does not meet badge threshold')) {
        toast.error('Creator does not meet the required badge level.')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }, [connected, creatorHash, minBadge, execute])

  return (
    <GlassCard className="!p-6 sm:!p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
          <CheckCircle2 className="w-5 h-5 text-blue-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Verify Badge</h3>
          <p className="text-xs text-white/50">Cryptographically verify a creator&apos;s reputation badge</p>
        </div>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          value={creatorHash}
          onChange={e => { setCreatorHash(e.target.value); setVerifyResult(null) }}
          placeholder="Creator hash (field)"
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/20"
        />

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Minimum Badge Level
          </label>
          <div className="flex items-center gap-2">
            {[
              { level: 1, label: 'Bronze' },
              { level: 2, label: 'Silver' },
              { level: 3, label: 'Gold' },
            ].map(b => (
              <button
                key={b.level}
                type="button"
                onClick={() => { setMinBadge(b.level); setVerifyResult(null) }}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  b.level === minBadge
                    ? 'bg-violet-600 text-white border border-violet-500'
                    : 'bg-white/[0.04] text-white/50 border border-white/10 hover:border-white/20'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="secondary"
          className="w-full rounded-xl"
          onClick={handleVerify}
          disabled={submitting || !connected || !creatorHash}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Verifying on-chain...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" aria-hidden="true" />
              Verify Badge ({(MARKETPLACE_FEES.VERIFY_BADGE / MICROCREDITS_PER_CREDIT).toFixed(2)} ALEO)
            </>
          )}
        </Button>

        <AnimatePresence>
          {verifyResult && (
            <m.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring.snappy}
              className={`p-4 rounded-xl border ${
                verifyResult === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                {verifyResult === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  verifyResult === 'success' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {verifyResult === 'success'
                    ? 'Badge verified on-chain'
                    : 'Creator does not meet badge threshold'}
                </span>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  )
}
