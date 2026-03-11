'use client'

import { useEffect, useState } from 'react'
import { m } from 'framer-motion'
import { Loader2, Check, X, Pen, Cpu, Radio, ExternalLink } from 'lucide-react'
import type { TxStatus } from '@/types'
import { PROGRAM_ID } from '@/lib/config'

interface Props {
  status: TxStatus
  txId?: string | null
  errorMessage?: string | null
}

const steps = [
  {
    key: 'signing',
    label: 'Approve in Wallet',
    activeMsg: 'Waiting for wallet approval',
    doneMsg: 'Wallet approved',
    icon: Pen,
  },
  {
    key: 'proving',
    label: 'Generating ZK Proof',
    activeMsg: 'Generating zero-knowledge proof... This cryptographic computation ensures your identity stays private.',
    doneMsg: 'ZK proof generated',
    icon: Cpu,
  },
  {
    key: 'broadcasting',
    label: 'Broadcasting to Network',
    activeMsg: 'Submitting transaction to Aleo network',
    doneMsg: 'Transaction submitted',
    icon: Radio,
  },
  {
    key: 'confirmed',
    label: 'Confirmed',
    activeMsg: '',
    doneMsg: 'Transaction confirmed on-chain',
    icon: Check,
  },
]

const statusOrder: Record<TxStatus, number> = {
  idle: -1,
  signing: 0,
  proving: 1,
  broadcasting: 2,
  confirmed: 3,
  failed: -2,
}

export default function TransactionStatus({ status, txId, errorMessage }: Props) {
  const [dots, setDots] = useState('')
  const [elapsed, setElapsed] = useState(0)

  // Warn user before closing tab during active transaction
  useEffect(() => {
    if (status === 'idle' || status === 'confirmed' || status === 'failed') return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [status])

  useEffect(() => {
    setElapsed(0)
    if (status === 'idle' || status === 'confirmed' || status === 'failed') {
      return
    }
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'))
    }, 500)
    const timeInterval = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)
    return () => {
      clearInterval(dotInterval)
      clearInterval(timeInterval)
    }
  }, [status])

  if (status === 'idle') return null

  if (status === 'failed') {
    return (
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        aria-live="assertive"
        role="alert"
        className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
      >
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
          <X className="w-5 h-5 text-red-400" aria-hidden="true" />
        </div>
        <div>
          <p className="text-red-300 text-sm font-medium">Transaction Failed</p>
          <p className="text-red-400 text-xs">
            {errorMessage || 'Transaction failed—try again or check wallet connection.'}
          </p>
        </div>
      </m.div>
    )
  }

  const currentIdx = statusOrder[status] ?? -1

  return (
    <div className="space-y-2" aria-live="polite" aria-atomic="true">
      {/* Don't close tab warning */}
      {(status === 'proving' || status === 'broadcasting') && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-2"
        >
          <span className="text-amber-400 text-xs font-medium">
            {status === 'proving'
              ? 'Do not close this tab while your ZK proof is being generated.'
              : 'Do not close this tab—your transaction is being submitted to the network.'}
          </span>
        </m.div>
      )}

      {/* Progress bar */}
      <div
        className="h-1 rounded-full bg-white/[0.05] overflow-hidden mb-4"
        role="progressbar"
        aria-valuenow={status === 'confirmed' ? 100 : Math.round(((currentIdx + 0.5) / steps.length) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Transaction progress"
      >
        <m.div
          className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full"
          initial={{ width: '0%' }}
          animate={{
            width:
              status === 'confirmed'
                ? '100%'
                : `${((currentIdx + 0.5) / steps.length) * 100}%`,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {steps.map((step, i) => {
        const Icon = step.icon
        const isActive = i === currentIdx
        const isDone = i < currentIdx
        const isPending = i > currentIdx
        const isConfirmedStep = step.key === 'confirmed' && status === 'confirmed'

        return (
          <m.div
            key={step.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: isPending ? 0.4 : 1,
              x: 0,
              scale: isConfirmedStep ? [1, 1.03, 1] : 1,
            }}
            transition={{
              delay: i * 0.08,
              scale: isConfirmedStep ? { duration: 0.4, ease: 'easeOut' } : undefined,
            }}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              isActive
                ? 'bg-violet-500/10 border border-violet-500/25 animate-pulse'
                : isDone
                ? isConfirmedStep
                  ? 'bg-green-500/10 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                  : 'bg-green-500/5 border border-green-500/10'
                : 'bg-white/[0.01] border border-white/[0.04]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                isActive
                  ? 'bg-violet-500/20'
                  : isDone
                  ? 'bg-green-500/15'
                  : 'bg-white/[0.05]'
              }`}
            >
              {isActive ? (
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" aria-hidden="true" />
              ) : isDone ? (
                <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
              ) : (
                <Icon
                  aria-hidden="true"
                  className={`w-4 h-4 ${
                    isPending ? 'text-white/60' : 'text-white/70'
                  }`}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                role={isActive ? 'status' : undefined}
                className={`text-sm font-medium ${
                  isActive
                    ? 'text-white/70'
                    : isDone
                    ? 'text-green-400'
                    : 'text-white/60'
                }`}
              >
                {isDone ? step.doneMsg : step.label}
                {isActive ? dots : ''}
              </p>
              {isActive && (
                <m.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-white/60 mt-0.5"
                >
                  {step.activeMsg}
                  {(status === 'proving' || status === 'broadcasting') && elapsed > 0 && (
                    <span className="text-white/60 ml-1">
                      ({elapsed >= 60 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`})
                    </span>
                  )}
                </m.p>
              )}
            </div>
          </m.div>
        )
      })}

      {/* Transaction ID */}
      {status === 'confirmed' && txId && (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3"
        >
          <p className="text-xs text-white/60 mb-2">Transaction ID</p>
          {!txId.startsWith('at1') ? (
            <>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-1 border border-border">
                <span className="text-xs text-white/60 break-all flex-1 font-mono">
                  {txId}
                </span>
              </div>
              <p className="text-[11px] text-white/60 mt-1.5">
                Wallet returned a temporary ID. Your transaction is confirmed on-chain.
              </p>
              <a
                href={`https://testnet.aleoscan.io/program?id=${PROGRAM_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 mt-2 p-2.5 rounded-xl bg-violet-500/5 border border-violet-500/15 hover:border-violet-500/30 hover:bg-violet-500/10 transition-all group"
              >
                <span className="text-xs text-white/70 group-hover:text-white flex-1">
                  View program on Explorer
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-white/70 group-hover:text-white shrink-0" aria-hidden="true" />
              </a>
            </>
          ) : (
            <a
              href={`https://testnet.explorer.provable.com/transaction/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-xl bg-surface-1 border border-border hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group"
            >
              <span className="text-xs text-white/70 group-hover:text-white break-all flex-1 font-mono">
                {txId}
              </span>
              <ExternalLink className="w-4 h-4 text-white/70 group-hover:text-white shrink-0" aria-hidden="true" />
            </a>
          )}
        </m.div>
      )}
    </div>
  )
}
