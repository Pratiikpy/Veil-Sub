'use client'

import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Shield, Zap, Clock, Gift, Eye, Tag } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

const CHANGELOG_VERSION = 'v27'
const STORAGE_KEY = `veilsub-changelog-seen-${CHANGELOG_VERSION}`

interface ChangelogItem {
  icon: React.ReactNode
  title: string
  description: string
  tag?: string
}

const ITEMS: ChangelogItem[] = [
  {
    icon: <Shield className="w-4 h-4 text-violet-400" />,
    title: 'Blind Subscription Protocol (BSP)',
    description: 'Three-layer privacy framework: blind identity rotation, zero-address finalize, and selective disclosure. Every subscription looks like a different person.',
    tag: 'Core',
  },
  {
    icon: <Eye className="w-4 h-4 text-emerald-400" />,
    title: 'Audit Tokens',
    description: 'Zero-footprint third-party verification. Prove subscription access to anyone without revealing your identity or on-chain history.',
    tag: 'New',
  },
  {
    icon: <Clock className="w-4 h-4 text-blue-400" />,
    title: 'Trial Passes',
    description: '20% of tier price for ~12 hours of access. Ephemeral AccessPass with automatic expiry lets new subscribers try before committing.',
    tag: 'New',
  },
  {
    icon: <Gift className="w-4 h-4 text-pink-400" />,
    title: 'Gift Subscriptions',
    description: 'Gift access to any Aleo address. The recipient redeems a private GiftToken for a full AccessPass without linking to the sender.',
    tag: 'New',
  },
  {
    icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    title: 'Commit-Reveal Tipping',
    description: 'Tip amounts hidden on-chain via BHP256 commitments until voluntary reveal. Two-phase privacy protocol keeps generosity private.',
  },
  {
    icon: <Tag className="w-4 h-4 text-violet-300" />,
    title: 'Custom Creator Tiers',
    description: 'Creators define their own pricing with up to 20 custom tiers. Full control over subscription levels and pricing.',
  },
  {
    icon: <Zap className="w-4 h-4 text-cyan-400" />,
    title: '27 Transitions, 25 Mappings, 6 Records',
    description: 'Deployed as veilsub_v27.aleo on testnet. 102 error codes, scoped audit tokens, trial rate-limiting.',
    tag: 'v27',
  },
]

export default function ChangelogOverlay() {
  const [visible, setVisible] = useState(false)
  const trapRef = useFocusTrap(visible)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (!seen) setVisible(true)
    } catch {
      // localStorage unavailable
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // localStorage unavailable
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
        >
          <m.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={`What's new in VeilSub ${CHANGELOG_VERSION}`}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md rounded-2xl bg-surface-1 border border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <h2 className="text-lg font-medium text-white">What&apos;s New</h2>
                  </div>
                  <p className="text-xs text-white/60">VeilSub {CHANGELOG_VERSION} — deployed on testnet</p>
                </div>
                <button
                  onClick={dismiss}
                  aria-label="Close changelog"
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-3">
              {ITEMS.map((item, i) => (
                <m.div
                  key={item.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-border/30"
                >
                  <div className="shrink-0 mt-0.5">{item.icon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      {item.tag && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-violet-500/15 text-violet-300 border border-violet-500/20">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">{item.description}</p>
                  </div>
                </m.div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/50">
              <button
                onClick={dismiss}
                className="w-full py-2.5 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 active:scale-[0.98] transition-all duration-200"
              >
                Got it
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
