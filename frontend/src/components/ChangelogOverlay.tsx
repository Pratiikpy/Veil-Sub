'use client'

import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const CHANGELOG_VERSION = 'v27'
const STORAGE_KEY = `veilsub-changelog-seen-${CHANGELOG_VERSION}`
const AUTO_DISMISS_MS = 5000 // Auto-dismiss after 5 seconds (was 12s - reduced for judge flow)

export default function ChangelogOverlay() {
  const [visible, setVisible] = useState(false)

  function dismiss(remember = false) {
    setVisible(false)
    if (remember) {
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch {
        // localStorage unavailable
      }
    }
  }

  useEffect(() => {
    // Check for ?judge=1 or ?demo=1 query param to skip overlays entirely
    const params = new URLSearchParams(window.location.search)
    const skipOverlay = params.get('judge') === '1' || params.get('demo') === '1'
    if (skipOverlay) return

    // Delay show slightly to let page render first
    const showTimer = setTimeout(() => {
      try {
        const seen = localStorage.getItem(STORAGE_KEY)
        if (!seen) setVisible(true)
      } catch {
        // localStorage unavailable
      }
    }, 800) // Reduced from 1500ms - show faster, dismiss faster
    return () => clearTimeout(showTimer)
  }, [])

  // Escape key to dismiss
  useEffect(() => {
    if (!visible) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [visible])

  // Auto-dismiss after timeout
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => dismiss(false), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-4 right-4 md:top-6 md:right-6 z-50 max-w-sm"
        >
          <div className="rounded-xl bg-black/95 border border-amber-500/30 p-4 shadow-[0_8px_40px_rgba(245,158,11,0.15)] backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span className="text-sm font-medium text-white">New in {CHANGELOG_VERSION}</span>
              </div>
              <button
                onClick={() => dismiss(false)}
                aria-label="Dismiss"
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Key highlights - compact */}
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-white/80">
                <span className="text-violet-400">BSP</span> — Blind identity rotation + zero-address finalize
              </p>
              <p className="text-xs text-white/80">
                <span className="text-emerald-400">Audit Tokens</span> — Zero-footprint third-party verification
              </p>
              <p className="text-xs text-white/80">
                <span className="text-blue-400">Trial Passes</span> — Try before subscribing (~12h access)
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/docs"
                onClick={() => dismiss(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors"
              >
                See all features
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
              <button
                onClick={() => dismiss(true)}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Dismiss
              </button>
            </div>

            {/* Auto-dismiss progress bar */}
            <m.div
              className="absolute bottom-0 left-0 h-0.5 bg-amber-500/40 rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
            />
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
