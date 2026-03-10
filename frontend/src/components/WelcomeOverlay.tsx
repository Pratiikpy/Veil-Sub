'use client'

import { useState, useEffect, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Shield, Eye, Zap, Heart, X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

const STORAGE_KEY = 'veilsub-welcome-dismissed'

const HIGHLIGHTS = [
  {
    icon: Shield,
    title: 'Zero-Knowledge Subscriptions',
    desc: 'Your identity is never exposed on-chain. Subscribe privately with real ALEO credits.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Eye,
    title: 'Zero-Footprint Verification',
    desc: 'Prove access without any public state change. No on-chain evidence verification occurred.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: Zap,
    title: 'Single-Record Payments',
    desc: 'One record handles everything — no splitting required. CreatorReceipts for private payment proofs.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Heart,
    title: 'Private Tipping & Renewal',
    desc: 'Tip creators or renew subscriptions. The creator receives payment but never knows who.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
]

export default function WelcomeOverlay() {
  const [show, setShow] = useState(false)
  const focusTrapRef = useFocusTrap(show)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setShow(true)
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = useCallback((remember: boolean) => {
    if (remember) {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setShow(false)
  }, [])

  // Escape key to close
  useEffect(() => {
    if (!show) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show, dismiss])

  return (
    <AnimatePresence>
      {show && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => dismiss(false)}
        >
          <m.div
            ref={focusTrapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to VeilSub"
            initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-sm bg-black/95 border border-glass-hover p-6 shadow-[0_8px_60px_rgba(0,0,0,0.8)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Welcome to VeilSub</h2>
                  <p className="text-xs text-subtle">v26 — Private Creator Subscriptions on Aleo</p>
                </div>
              </div>
              <button
                onClick={() => dismiss(false)}
                aria-label="Close welcome dialog"
                className="p-1.5 rounded-lg hover:bg-white/[0.05] text-subtle hover:text-white active:scale-[0.9] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Highlights */}
            <div className="space-y-3 mb-6">
              {HIGHLIGHTS.map((item, i) => {
                const Icon = item.icon
                return (
                  <m.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      type: 'spring',
                      bounce: 0.3,
                      delay: 0.15 + i * 0.1,
                    }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-surface-1 border border-border hover:border-glass-hover transition-colors"
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
                    </div>
                  </m.div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => dismiss(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-border text-sm text-muted hover:text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
              >
                Remind Me Later
              </button>
              <button
                onClick={() => dismiss(true)}
                className="flex-1 py-2.5 rounded-xl bg-white text-sm text-black font-medium hover:bg-white/90 active:scale-[0.98] transition-all btn-shimmer"
              >
                Got it!
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
