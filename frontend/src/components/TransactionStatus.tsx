'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Check, X, Pen, Cpu, Radio, ExternalLink } from 'lucide-react'
import type { TxStatus } from '@/types'

interface Props {
  status: TxStatus
  txId?: string | null
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
    activeMsg: 'Building your zero-knowledge proof — this may take 30-60 seconds',
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

export default function TransactionStatus({ status, txId }: Props) {
  const [dots, setDots] = useState('')
  const [elapsed, setElapsed] = useState(0)

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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
      >
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
          <X className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="text-red-300 text-sm font-medium">Transaction Failed</p>
          <p className="text-red-400/60 text-xs">
            The transaction was rejected or encountered an error. Please try again.
          </p>
        </div>
      </motion.div>
    )
  }

  const currentIdx = statusOrder[status] ?? -1

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
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

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              isActive
                ? 'bg-violet-500/10 border border-violet-500/25'
                : isDone
                ? 'bg-green-500/5 border border-green-500/10'
                : 'bg-white/[0.01] border border-white/[0.04]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                isActive
                  ? 'bg-violet-500/20'
                  : isDone
                  ? 'bg-green-500/15'
                  : 'bg-white/5'
              }`}
            >
              {isActive ? (
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              ) : isDone ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Icon
                  className={`w-4 h-4 ${
                    isPending ? 'text-slate-700' : 'text-slate-400'
                  }`}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  isActive
                    ? 'text-violet-300'
                    : isDone
                    ? 'text-green-400'
                    : 'text-slate-600'
                }`}
              >
                {isDone ? step.doneMsg : step.label}
                {isActive ? dots : ''}
              </p>
              {isActive && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-slate-500 mt-0.5"
                >
                  {step.activeMsg}
                  {status === 'proving' && elapsed > 0 && (
                    <span className="text-slate-600 ml-1">({elapsed}s)</span>
                  )}
                </motion.p>
              )}
            </div>
          </motion.div>
        )
      })}

      {/* Transaction ID */}
      {status === 'confirmed' && txId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10"
        >
          <p className="text-xs text-slate-400 mb-1">Transaction ID</p>
          <a
            href={`https://explorer.aleo.org/testnet/transaction/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 break-all inline-flex items-center gap-1"
          >
            {txId}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </motion.div>
      )}
    </div>
  )
}
