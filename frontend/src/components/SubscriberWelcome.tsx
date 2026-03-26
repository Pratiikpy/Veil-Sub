'use client'

import { useState, useEffect, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Shield, Compass, X } from 'lucide-react'
import Link from 'next/link'
import { spring } from '@/lib/motion'

const LS_KEY = 'veilsub_onboarded'

/**
 * One-time subscriber welcome overlay.
 * Shown when wallet is connected AND no subscriptions exist AND user has not dismissed before.
 */
export default function SubscriberWelcome({ onDismiss }: { onDismiss?: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) !== 'true') {
        setVisible(true)
      }
    } catch { /* SSR or storage error */ }
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    try { localStorage.setItem(LS_KEY, 'true') } catch { /* quota */ }
    onDismiss?.()
  }, [onDismiss])

  if (!visible) return null

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
      >
        <m.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={spring.gentle}
          className="w-full max-w-md rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-8 text-center">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white/60" aria-hidden="true" />
            </div>

            <h2 className="text-xl font-bold text-white mb-3">
              Welcome to VeilSub
            </h2>

            <p className="text-sm text-white/60 mb-6 leading-relaxed max-w-sm mx-auto">
              Your subscriptions are private. Nobody -- not even us -- can see who you support.
            </p>

            {/* Steps */}
            <div className="text-left space-y-3 mb-8 max-w-xs mx-auto">
              {[
                'Browse creators on Explore',
                'Subscribe to support their work',
                'Your feed fills with exclusive content',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                    {i + 1}
                  </span>
                  <span className="text-sm text-white/70 pt-0.5">{step}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link
              href="/explore"
              onClick={dismiss}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              <Compass className="w-4 h-4" aria-hidden="true" />
              Explore Creators
            </Link>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  )
}
