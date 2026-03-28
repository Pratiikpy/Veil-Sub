'use client'

import { m, AnimatePresence } from 'framer-motion'
import {
  Check,
  Loader2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TxStatus = 'idle' | 'submitting' | 'pending' | 'confirmed' | 'failed'

interface TransactionProgressProps {
  status: TxStatus
  txId?: string | null
  error?: string | null
  onRetry?: () => void
}

// ─── Step definitions ─────────────────────────────────────────────────────────

interface Step {
  label: string
  description: string
  time: string
}

const steps: Step[] = [
  {
    label: 'Generating ZK proof',
    description: 'Building zero-knowledge proof via delegated prover...',
    time: '~1-2 min',
  },
  {
    label: 'Submitting to network',
    description: 'Broadcasting transaction to Aleo validators...',
    time: '~30s',
  },
  {
    label: 'Waiting for confirmation',
    description: 'Waiting for block finalization on testnet...',
    time: '~15-30s',
  },
  {
    label: 'Confirmed on-chain',
    description: 'Transaction finalized. State updated.',
    time: '',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getActiveStep(status: TxStatus): number {
  switch (status) {
    case 'submitting':
      return 0
    case 'pending':
      return 2
    case 'confirmed':
      return 3
    case 'failed':
      return -1
    default:
      return -1
  }
}

function getStepState(
  stepIndex: number,
  activeStep: number,
  status: TxStatus
): 'complete' | 'active' | 'pending' | 'failed' {
  if (status === 'failed') {
    if (stepIndex < 1) return 'complete'
    if (stepIndex === 1) return 'failed'
    return 'pending'
  }
  if (stepIndex < activeStep) return 'complete'
  if (stepIndex === activeStep) return status === 'confirmed' ? 'complete' : 'active'
  if (status === 'submitting' && stepIndex <= 1) return 'active'
  return 'pending'
}

function friendlyError(raw: string | null | undefined): string {
  if (!raw) return 'Something went wrong. Please try again.'
  const lower = raw.toLowerCase()
  if (lower.includes('insufficient') || lower.includes('balance'))
    return 'Not enough tokens in your wallet. Get testnet ALEO from the faucet.'
  if (lower.includes('rejected') || lower.includes('abort'))
    return 'Transaction rejected by the network. The auction state may have changed.'
  if (lower.includes('timeout') || lower.includes('timed out'))
    return 'Transaction is taking longer than expected. It may still confirm.'
  if (lower.includes('user denied') || lower.includes('cancelled'))
    return 'You cancelled the transaction in your wallet.'
  if (lower.includes('assert'))
    return 'On-chain validation failed. The auction state may have changed (deadline passed, already bid, etc.).'
  if (raw.length > 120) return raw.slice(0, 120) + '...'
  return raw
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionProgress({
  status,
  txId,
  error,
  onRetry,
}: TransactionProgressProps) {
  if (status === 'idle') return null

  const activeStep = getActiveStep(status)
  const showSteps = status === 'confirmed' ? steps : steps.slice(0, 3)
  const explorerHref = txId
    ? `https://testnet.aleoscan.io/transaction?id=${txId}`
    : null

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 overflow-hidden"
      >
        <div className="space-y-0">
          {showSteps.map((step, i) => {
            const state = getStepState(i, activeStep, status)
            const isLast = i === showSteps.length - 1

            return (
              <div key={step.label} className="flex gap-3">
                {/* Step indicator + connector line */}
                <div className="flex flex-col items-center">
                  <m.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={
                      state === 'complete' && i === 3
                        ? { scale: [0.8, 1.2, 1], opacity: 1 }
                        : { scale: 1, opacity: 1 }
                    }
                    transition={
                      state === 'complete' && i === 3
                        ? { duration: 0.5, times: [0, 0.6, 1] }
                        : { delay: i * 0.1, duration: 0.3 }
                    }
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      state === 'complete'
                        ? 'bg-emerald-500/20'
                        : state === 'active'
                          ? 'bg-violet-500/20'
                          : state === 'failed'
                            ? 'bg-red-500/20'
                            : 'bg-white/[0.04]'
                    }`}
                  >
                    {state === 'complete' && (
                      <Check className="w-3 h-3 text-emerald-400" />
                    )}
                    {state === 'active' && (
                      <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />
                    )}
                    {state === 'failed' && (
                      <XCircle className="w-3 h-3 text-red-400" />
                    )}
                    {state === 'pending' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    )}
                  </m.div>
                  {!isLast && (
                    <div
                      className={`w-px h-5 ${
                        state === 'complete' ? 'bg-emerald-500/30' : 'bg-white/[0.06]'
                      }`}
                    />
                  )}
                </div>

                {/* Step label + description */}
                <div className={`pb-3 ${isLast ? 'pb-0' : ''}`}>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xs font-medium ${
                        state === 'complete'
                          ? 'text-white/70'
                          : state === 'active'
                            ? 'text-white'
                            : state === 'failed'
                              ? 'text-red-400'
                              : 'text-white/30'
                      }`}
                    >
                      {step.label}
                      {state === 'active' && '...'}
                    </p>
                    {state === 'active' && step.time && (
                      <span className="text-[10px] text-violet-400/60 font-mono">
                        {step.time}
                      </span>
                    )}
                  </div>
                  {state === 'active' && (
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {step.description}
                    </p>
                  )}
                  {state === 'failed' && (
                    <p className="text-[10px] text-red-400/80 mt-0.5">
                      {friendlyError(error)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Confirmed: explorer link */}
        {status === 'confirmed' && explorerHref && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
            <a
              href={explorerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              View on Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Failed: retry */}
        {status === 'failed' && onRetry && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
            <button
              onClick={onRetry}
              className="text-xs text-white bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>
          </div>
        )}

        {/* Time estimate while waiting */}
        {(status === 'submitting' || status === 'pending') && (
          <p className="text-[10px] text-white/30 mt-3 pt-3 border-t border-white/[0.04] text-center">
            Total time: ~2-3 minutes. You can leave this page -- the transaction
            will continue.
          </p>
        )}
      </m.div>
    </AnimatePresence>
  )
}
