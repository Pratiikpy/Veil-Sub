import { useState, useEffect, useRef, useCallback } from 'react'
import type { TxStatus } from '@/types'

interface UseTransactionFlowOptions {
  isOpen: boolean
  onClose: () => void
  /** Whether the wallet is currently connected (enables disconnect detection) */
  connected?: boolean
  /** Called when polling should be stopped (e.g. stopPolling from useTransactionPoller) */
  stopPolling?: () => void
}

interface UseTransactionFlowReturn {
  txStatus: TxStatus
  setTxStatus: (status: TxStatus) => void
  txId: string | null
  setTxId: (id: string | null) => void
  error: string | null
  setError: (error: string | null) => void
  statusMessage: string | null
  isSubmitting: boolean
  submittingRef: React.MutableRefObject<boolean>
  txStatusRef: React.MutableRefObject<TxStatus>
  handleClose: () => void
  resetFlow: () => void
}

/**
 * Shared transaction lifecycle hook for modal components.
 *
 * Handles:
 * - Body scroll lock when modal is open
 * - Escape key handler (calls handleClose)
 * - Cycling status messages during proving/broadcasting
 * - Wallet disconnect detection during active transactions
 * - handleClose that resets all state and calls onClose
 * - resetFlow to reset tx state without closing
 * - Ref-based guards against stale closures and double-submissions
 */
export function useTransactionFlow({
  isOpen,
  onClose,
  connected,
  stopPolling,
}: UseTransactionFlowOptions): UseTransactionFlowReturn {
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const txStatusRef = useRef(txStatus)
  txStatusRef.current = txStatus

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Stop polling on unmount
  useEffect(() => {
    return () => { stopPolling?.() }
  }, [stopPolling])

  // Detect wallet disconnect during active transaction
  useEffect(() => {
    if (
      connected === false &&
      (txStatus === 'signing' || txStatus === 'proving' || txStatus === 'broadcasting')
    ) {
      setTxStatus('failed')
      setError('Wallet disconnected. Please reconnect and try again.')
      stopPolling?.()
      submittingRef.current = false
    }
  }, [connected, txStatus, stopPolling])

  // Cycling status messages during proving/broadcasting
  useEffect(() => {
    if (txStatus !== 'proving' && txStatus !== 'broadcasting') {
      setStatusMessage(null)
      return
    }
    const messages =
      txStatus === 'proving'
        ? [
            'Generating zero-knowledge proof...',
            'Wallet is computing the ZK circuit...',
            'This may take 30-60 seconds...',
            'Almost there — proof nearly complete...',
          ]
        : [
            'Broadcasting transaction to Aleo network...',
            'Waiting for block confirmation...',
            'Validators are verifying the proof...',
            'Finalizing on-chain state...',
          ]
    // Guard against empty messages array (defensive)
    if (messages.length === 0) {
      setStatusMessage(null)
      return
    }
    let idx = 0
    setStatusMessage(messages[0])
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length
      setStatusMessage(messages[idx])
    }, 4000)
    return () => clearInterval(interval)
  }, [txStatus])

  // Warn user before navigating away during active ZK proof / broadcast
  useEffect(() => {
    if (txStatus === 'idle' || txStatus === 'confirmed' || txStatus === 'failed') return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [txStatus])

  const resetFlow = useCallback(() => {
    setTxStatus('idle')
    setTxId(null)
    setError(null)
    setStatusMessage(null)
    submittingRef.current = false
  }, [])

  const handleClose = useCallback(() => {
    stopPolling?.()
    resetFlow()
    onClose()
  }, [stopPolling, resetFlow, onClose])

  // Escape key to close (uses ref to avoid stale closures).
  // Blocked during active transactions (signing/proving/broadcasting) to prevent
  // accidental interruption of ZK proof generation or broadcast.
  const handleCloseRef = useRef(handleClose)
  handleCloseRef.current = handleClose
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const current = txStatusRef.current
        // Block Escape during active transaction phases
        if (current === 'signing' || current === 'proving' || current === 'broadcasting') {
          e.preventDefault()
          return
        }
        handleCloseRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  return {
    txStatus,
    setTxStatus,
    txId,
    setTxId,
    error,
    setError,
    statusMessage,
    isSubmitting: submittingRef.current,
    submittingRef,
    txStatusRef,
    handleClose,
    resetFlow,
  }
}
