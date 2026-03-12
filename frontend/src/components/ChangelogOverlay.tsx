'use client'

import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Sparkles, ArrowRight, Shield, Eye, Gift, Zap } from 'lucide-react'
import Link from 'next/link'

const CHANGELOG_VERSION = 'v27'
const STORAGE_KEY = `veilsub-changelog-seen-${CHANGELOG_VERSION}`
const SESSION_KEY = `veilsub-changelog-shown-${CHANGELOG_VERSION}`
const AUTO_DISMISS_MS = 5000 // Auto-dismiss after 5 seconds (reduced from 6s)

// Feature highlights with technical details (NullPay-style depth)
const FEATURES = [
  {
    icon: Shield,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    title: 'Zero-Address Finalize',
    desc: 'All 25 mappings keyed by Poseidon2 hashes—subscriber addresses never reach on-chain storage',
  },
  {
    icon: Eye,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    title: 'Scoped Audit Tokens',
    desc: 'scope_mask bitfield for selective disclosure: bit 0=tier, bit 1=expiry, bit 2=status',
  },
  {
    icon: Zap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    title: 'Commit-Reveal Tipping',
    desc: 'BHP256::commit_to_field hides tip amounts until creator reveals—zero-amount tips possible',
  },
  {
    icon: Gift,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    title: 'Subscription Gifting',
    desc: 'GiftToken records enable anonymous gifting with revocation protection for unclaimed gifts',
  },
] as const

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

    // Check if already shown this session (prevents repeated showing on navigation)
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return
    } catch {
      // sessionStorage unavailable
    }

    // Delay show slightly to let page render first
    const showTimer = setTimeout(() => {
      try {
        const seen = localStorage.getItem(STORAGE_KEY)
        if (!seen) {
          setVisible(true)
          sessionStorage.setItem(SESSION_KEY, '1') // Mark as shown this session
        }
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
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span className="text-sm font-medium text-white">New in {CHANGELOG_VERSION}</span>
              </div>
              <button
                onClick={() => dismiss(false)}
                aria-label="Dismiss"
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Feature highlights with technical depth */}
            <div className="space-y-2 mb-4">
              {FEATURES.map((feature, i) => (
                <m.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-start gap-2"
                >
                  <div className={`p-1 rounded ${feature.bgColor} shrink-0 mt-0.5`}>
                    <feature.icon className={`w-3 h-3 ${feature.color}`} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white">{feature.title}</p>
                    <p className="text-xs text-white/60 leading-tight">{feature.desc}</p>
                  </div>
                </m.div>
              ))}
            </div>

            {/* Stats bar */}
            <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-white/[0.03] mb-4">
              <span className="text-xs text-white/60">27 transitions</span>
              <span className="text-xs text-white/50" aria-hidden="true">•</span>
              <span className="text-xs text-white/60">6 record types</span>
              <span className="text-xs text-white/50" aria-hidden="true">•</span>
              <span className="text-xs text-white/60">866 statements</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link
                href="/docs"
                onClick={() => dismiss(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
              >
                See all features
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
              <button
                onClick={() => dismiss(true)}
                className="text-xs text-white/60 hover:text-white/80 transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none rounded"
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
