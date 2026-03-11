'use client'

import { useState, useRef } from 'react'
import { ShieldOff, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import TransactionStatus from './TransactionStatus'
import Button from './ui/Button'
import type { TxStatus } from '@/types'

export default function RevokeAccessPanel() {
  const { revokeAccess, connected } = useVeilSub()
  const { startPolling, stopPolling } = useTransactionPoller()
  const [passId, setPassId] = useState('')
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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
        toast.success('Revocation submitted')
        startPolling(result, (pollResult) => {
          if (pollResult.status === 'confirmed') {
            setTxStatus('confirmed')
            stopPolling()
            setPassId('')
          } else if (pollResult.status === 'failed') {
            setTxStatus('failed')
            stopPolling()
          }
        })
      }
    } catch (err: unknown) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Revocation failed')
      toast.error('Revocation failed')
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-red-500/[0.08] border border-red-500/[0.12] flex items-center justify-center">
          <ShieldOff className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Revoke Subscriber Access</h3>
          <p className="text-xs text-white/60">Permanently revoke an AccessPass by ID</p>
        </div>
      </div>

      <div className="rounded-xl bg-red-500/[0.04] border border-red-500/[0.08] p-3 mb-4">
        <p className="text-xs text-red-300 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          This is irreversible. The subscriber will lose access immediately.
        </p>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={passId}
          onChange={(e) => setPassId(e.target.value)}
          placeholder="Enter pass_id (field value)"
          aria-label="Pass ID to revoke"
          className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-border text-white text-base font-mono placeholder-subtle focus:outline-none focus:border-red-500/[0.3] focus:shadow-[0_0_20px_rgba(239,68,68,0.08)] transition-all"
        />
        <Button
          onClick={handleRevoke}
          disabled={!passId.trim() || txStatus === 'signing' || txStatus === 'broadcasting'}
          className="bg-red-500/20 text-red-300 border border-red-500/20 hover:bg-red-500/30 hover:border-red-500/30"
        >
          Revoke
        </Button>
      </div>

      {txStatus !== 'idle' && (
        <TransactionStatus status={txStatus} txId={txId} errorMessage={error} />
      )}

      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}
    </div>
  )
}
