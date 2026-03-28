'use client'

import { useState, useRef } from 'react'
import { ShieldOff, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'
import { clearMappingCache } from '@/hooks/useCreatorStats'
import type { TxStatus } from '@/types'

interface Props {
  onSuccess?: () => void
}

export default function RevokeAccessPanel({ onSuccess }: Props) {
  const { revokeAccess, connected } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const [passId, setPassId] = useState('')
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const submittingRef = useRef(false)

  const handleRevoke = async () => {
    if (!connected || submittingRef.current || !passId.trim()) return
    submittingRef.current = true
    setTxStatus('signing')
    setError(null)

    try {
      const cleanId = passId.trim().replace(/field$/, '')
      const result = await revokeAccess(cleanId)
      if (result) {
        setTxId(result)
        setTxStatus('broadcasting')
        startPolling(result, (pollResult) => {
          if (pollResult.status === 'confirmed') {
            setTxStatus('confirmed')
            stopPolling()
            setPassId('')
            toast.success('Access revoked successfully')
            clearMappingCache()
            onSuccess?.()
          } else if (pollResult.status === 'failed') {
            setTxStatus('failed')
            stopPolling()
          } else if (pollResult.status === 'timeout') {
            // Shield Wallet delegates proving and never reports 'confirmed' —
            // the transaction IS broadcast, so treat timeout as likely success.
            setTxStatus('confirmed')
            stopPolling()
            setPassId('')
            toast.success('Access revoked! (confirmation was slow)')
            clearMappingCache()
            onSuccess?.()
          }
        })
      }
    } catch (err: unknown) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Revocation couldn\u2019t be completed. Check your wallet and try again.')
      toast.error('Revocation couldn\u2019t be completed')
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-9 h-9 rounded-xl bg-red-500/[0.08] border border-red-500/[0.12] flex items-center justify-center">
          <ShieldOff className="w-4 h-4 text-red-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Revoke Subscription</h3>
          <p className="text-xs text-white/60">Permanently invalidate a subscription on-chain</p>
        </div>
      </div>

      <div className="rounded-xl bg-red-500/[0.04] border border-red-500/[0.08] p-4 mb-4">
        <p className="text-xs text-red-300 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
          Irreversible on-chain revocation. The subscriber's access will be permanently blocked and they will no longer be able to view gated content.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={passId}
          onChange={(e) => { setPassId(e.target.value); setShowConfirm(false) }}
          placeholder="Enter subscription pass ID"
          aria-label="Pass ID to revoke (required)"
          aria-required="true"
          className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-border text-white text-base font-mono placeholder-subtle focus:outline-none focus:border-red-500/[0.3] focus:ring-2 focus:ring-red-400/50 focus:shadow-[0_0_20px_rgba(239,68,68,0.08)] transition-all"
        />
        {!showConfirm ? (
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!passId.trim() || txStatus === 'signing' || txStatus === 'broadcasting'}
            className="bg-red-500/20 text-red-300 border border-red-500/20 hover:bg-red-500/30 hover:border-red-500/30"
          >
            Revoke
          </Button>
        ) : null}
      </div>

      {showConfirm && (
        <div className="p-4 rounded-xl bg-red-500/[0.06] border border-red-500/[0.12] mb-4">
          <p className="text-xs text-red-300 mb-3">
            Are you sure? This is irreversible. The subscriber will permanently lose access.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleRevoke}
              disabled={txStatus === 'signing' || txStatus === 'broadcasting'}
              className="bg-red-500/20 text-red-300 border border-red-500/20 hover:bg-red-500/30 hover:border-red-500/30"
            >
              Yes, Revoke Access
            </Button>
            <Button
              onClick={() => setShowConfirm(false)}
              className="bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {txStatus !== 'idle' && (
        <TransactionStatus status={txStatus} txId={txId} errorMessage={error} />
      )}

    </div>
  )
}
