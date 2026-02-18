'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Eye, Zap, Heart, X } from 'lucide-react'

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
    title: 'Single-Record Payments (v7)',
    desc: 'One record handles everything — no splitting required. Faster, cheaper transactions.',
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setShow(true)
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = (remember: boolean) => {
    if (remember) {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => dismiss(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/[0.12] p-6 shadow-[0_8px_60px_rgba(0,0,0,0.8)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Welcome to VeilSub</h2>
                  <p className="text-xs text-slate-500">v7.0 — Private Creator Subscriptions</p>
                </div>
              </div>
              <button
                onClick={() => dismiss(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Highlights */}
            <div className="space-y-3 mb-6">
              {HIGHLIGHTS.map((item, i) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      type: 'spring',
                      bounce: 0.3,
                      delay: 0.15 + i * 0.1,
                    }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => dismiss(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                Remind Me Later
              </button>
              <button
                onClick={() => dismiss(true)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-sm text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all btn-shimmer"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
