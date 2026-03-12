'use client'

import { useState, useEffect, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Shield, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const STORAGE_KEY = 'veilsub-welcome-dismissed'
const SESSION_KEY = 'veilsub-welcome-shown-this-session'
const AUTO_DISMISS_MS = 4000 // Auto-dismiss after 4 seconds (was 10s - reduced for judge flow)

export default function WelcomeOverlay() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check for ?judge=1 or ?demo=1 query param to skip overlays entirely
    const params = new URLSearchParams(window.location.search)
    const skipOverlay = params.get('judge') === '1' || params.get('demo') === '1'
    if (skipOverlay) return

    // Check if already shown this session (prevents repeated showing on navigation)
    if (sessionStorage.getItem(SESSION_KEY)) return

    // Show after a brief delay to let page load
    const showTimer = setTimeout(() => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setShow(true)
        sessionStorage.setItem(SESSION_KEY, '1') // Mark as shown this session
      }
    }, 600) // Reduced from 800ms

    return () => clearTimeout(showTimer)
  }, [])

  // Escape key to dismiss
  useEffect(() => {
    if (!show) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShow(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [show])

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!show) return
    const autoDismiss = setTimeout(() => {
      setShow(false)
    }, AUTO_DISMISS_MS)
    return () => clearTimeout(autoDismiss)
  }, [show])

  const dismiss = useCallback((remember: boolean) => {
    if (remember) {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setShow(false)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <m.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50"
        >
          <div className="rounded-xl bg-black/95 border border-violet-500/30 p-4 shadow-[0_8px_40px_rgba(139,92,246,0.15)] backdrop-blur-xl">
            {/* Header row */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-violet-400" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Zero-Footprint Subscriptions</h3>
                  <p className="text-xs text-white/60">Privacy-first creator subscriptions on Aleo</p>
                </div>
              </div>
              <button
                onClick={() => dismiss(false)}
                aria-label="Dismiss"
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Key value prop */}
            <p className="text-xs text-white/70 mb-4 leading-relaxed">
              Subscribe to creators with zero on-chain identity exposure. Your AccessPass proves access without revealing who you are.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link
                href="/docs"
                onClick={() => dismiss(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
              >
                Learn how it works
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
              <button
                onClick={() => dismiss(true)}
                className="text-xs text-white/50 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none rounded"
              >
                Don&apos;t show again
              </button>
            </div>

            {/* Auto-dismiss progress bar */}
            <m.div
              className="absolute bottom-0 left-0 h-0.5 bg-violet-500/50 rounded-full"
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
