'use client'

import { useEffect, useState, useMemo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Check, AlertCircle, Loader2 } from 'lucide-react'

export type ProgressStep =
  | 'idle'
  | 'preparing'
  | 'proving'
  | 'broadcasting'
  | 'confirming'
  | 'success'
  | 'error'

interface Props {
  currentStep: ProgressStep
  error?: string
}

interface StepDef {
  key: ProgressStep
  label: string
  activeMsg: string
  estimatedSeconds: number
}

const STEPS: StepDef[] = [
  {
    key: 'preparing',
    label: 'Prepare',
    activeMsg: 'Preparing transaction...',
    estimatedSeconds: 5,
  },
  {
    key: 'proving',
    label: 'Prove',
    activeMsg: 'Generating Aleo zero-knowledge proof...',
    estimatedSeconds: 45,
  },
  {
    key: 'broadcasting',
    label: 'Broadcast',
    activeMsg: 'Broadcasting to Aleo network...',
    estimatedSeconds: 5,
  },
  {
    key: 'confirming',
    label: 'Confirm',
    activeMsg: 'Waiting for confirmation...',
    estimatedSeconds: 15,
  },
]

const stepIndex: Record<ProgressStep, number> = {
  idle: -1,
  preparing: 0,
  proving: 1,
  broadcasting: 2,
  confirming: 3,
  success: 4,
  error: -2,
}

/**
 * Visual 4-step progress bar for Aleo ZK transactions.
 *
 * Shows numbered circles connected by a filling accent-colored line.
 * Horizontal on desktop, vertical on mobile (below sm breakpoint).
 */
export default function TransactionProgress({ currentStep, error }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const activeIdx = stepIndex[currentStep] ?? -1
  const isSuccess = currentStep === 'success'
  const isError = currentStep === 'error'

  // Reset elapsed timer whenever the active step changes
  useEffect(() => {
    setElapsed(0)
    if (currentStep === 'idle' || isSuccess || isError) return
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [currentStep, isSuccess, isError])

  const currentStepDef = useMemo(
    () => STEPS[activeIdx] ?? null,
    [activeIdx],
  )

  const estimatedRemaining = useMemo(() => {
    if (!currentStepDef) return null
    const remaining = currentStepDef.estimatedSeconds - elapsed
    if (remaining <= 0) {
      // Proof is taking longer than estimated - show reassurance
      if (currentStepDef.key === 'proving') {
        if (elapsed >= 120) {
          return 'Still computing... Aleo proofs can take 1-2 minutes'
        }
        return 'Still generating Aleo proof...'
      }
      return null
    }
    if (remaining >= 60) {
      const m = Math.floor(remaining / 60)
      const s = remaining % 60
      return `~${m}m ${s}s remaining`
    }
    return `~${remaining}s remaining`
  }, [currentStepDef, elapsed])

  if (currentStep === 'idle') return null

  // Progress fill percentage for the connecting line
  const fillPct = isSuccess
    ? 100
    : activeIdx >= 0
    ? ((activeIdx + 0.5) / STEPS.length) * 100
    : 0

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8">
      {/* ── Horizontal layout (sm+) ── */}
      <div className="hidden sm:block">
        {/* Step circles + connecting line */}
        <div className="relative flex items-center justify-between">
          {/* Background line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/10 rounded-full" />
          {/* Filled line */}
          <m.div
            className="absolute top-4 left-4 h-0.5 rounded-full"
            style={{
              background: isError
                ? 'rgb(239, 68, 68)'
                : isSuccess
                ? 'rgb(34, 197, 94)'
                : 'var(--accent, #8B5CF6)',
            }}
            initial={{ width: '0%' }}
            animate={{
              width: `${Math.min(fillPct, 100) * ((100 - 8) / 100)}%`,
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />

          {STEPS.map((step, i) => {
            const isDone = isSuccess || i < activeIdx
            const isActive = !isSuccess && !isError && i === activeIdx
            const isErrorStep = isError && i === activeIdx

            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center" style={{ width: `${100 / STEPS.length}%` }}>
                {/* Circle */}
                <m.div
                  animate={
                    isActive
                      ? { scale: [1, 1.1, 1] }
                      : { scale: 1 }
                  }
                  transition={
                    isActive
                      ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                      : undefined
                  }
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                    isDone
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-[var(--accent,#8B5CF6)] text-white shadow-[0_0_16px_rgba(139,92,246,0.4)]'
                      : isErrorStep
                      ? 'bg-red-500 text-white'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : isErrorStep ? (
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </m.div>

                {/* Label */}
                <span
                  className={`mt-2 text-[11px] font-medium transition-colors duration-300 ${
                    isDone
                      ? 'text-green-400'
                      : isActive
                      ? 'text-white'
                      : isErrorStep
                      ? 'text-red-400'
                      : 'text-white/60'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Vertical layout (mobile) ── */}
      <div className="sm:hidden">
        <div className="relative flex flex-col gap-0">
          {STEPS.map((step, i) => {
            const isDone = isSuccess || i < activeIdx
            const isActive = !isSuccess && !isError && i === activeIdx
            const isErrorStep = isError && i === activeIdx
            const isLast = i === STEPS.length - 1

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                {/* Vertical line + circle column */}
                <div className="flex flex-col items-center">
                  <m.div
                    animate={
                      isActive
                        ? { scale: [1, 1.1, 1] }
                        : { scale: 1 }
                    }
                    transition={
                      isActive
                        ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                        : undefined
                    }
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-300 ${
                      isDone
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-[var(--accent,#8B5CF6)] text-white shadow-[0_0_16px_rgba(139,92,246,0.4)]'
                        : isErrorStep
                        ? 'bg-red-500 text-white'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4" aria-hidden="true" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : isErrorStep ? (
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </m.div>
                  {/* Connecting line */}
                  {!isLast && (
                    <div className="relative w-0.5 h-8 bg-white/10 rounded-full overflow-hidden">
                      <m.div
                        className="absolute top-0 left-0 w-full rounded-full"
                        style={{
                          background: isError && i >= activeIdx
                            ? 'rgb(239, 68, 68)'
                            : isDone || (isActive && activeIdx > i)
                            ? 'rgb(34, 197, 94)'
                            : isActive
                            ? 'var(--accent, #8B5CF6)'
                            : 'transparent',
                        }}
                        initial={{ height: '0%' }}
                        animate={{
                          height:
                            isDone
                              ? '100%'
                              : isActive
                              ? '50%'
                              : '0%',
                        }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="pt-1 pb-4">
                  <span
                    className={`text-xs font-medium transition-colors duration-300 ${
                      isDone
                        ? 'text-green-400'
                        : isActive
                        ? 'text-white'
                        : isErrorStep
                        ? 'text-red-400'
                        : 'text-white/60'
                    }`}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <m.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] text-white/60 mt-0.5"
                    >
                      {step.activeMsg}
                    </m.p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Status message area ── */}
      <AnimatePresence mode="wait">
        {isSuccess && (
          <m.div
            key="success"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-5 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
              <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
              <span className="text-sm font-medium text-green-400">
                Transaction confirmed!
              </span>
            </div>
          </m.div>
        )}

        {isError && error && (
          <m.div
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="alert"
            className="mt-5 flex items-start gap-2.5 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-red-400">{error}</p>
          </m.div>
        )}

        {!isSuccess && !isError && currentStepDef && (
          <m.div
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-5 text-center"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {/* Active message -- desktop only, mobile shows inline */}
            <p className="hidden sm:block text-xs text-white/60 mb-1">
              {currentStepDef.activeMsg}
            </p>
            {estimatedRemaining && (
              <p className="text-[11px] text-white/60">{estimatedRemaining}</p>
            )}
            {elapsed > 0 && (
              <p className="text-[11px] text-white/50 mt-0.5">
                Elapsed: {elapsed >= 60 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`}
              </p>
            )}
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Do not close warning ── */}
      {(currentStep === 'proving' || currentStep === 'broadcasting') && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 space-y-2"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-amber-400 text-[11px] font-medium">
              Do not close this tab while your Aleo ZK proof is being generated.
            </span>
          </div>
          {currentStep === 'proving' && elapsed >= 90 && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10"
            >
              <p className="text-[11px] text-white/50">
                Aleo ZK proofs can take 1-2 minutes depending on your device. If stuck beyond 3 minutes, try refreshing and retrying.
              </p>
            </m.div>
          )}
        </m.div>
      )}
    </div>
  )
}
