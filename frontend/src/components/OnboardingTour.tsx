'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, m } from 'framer-motion'
import { ArrowRight, X, Sparkles } from 'lucide-react'
import CelebrationBurst from '@/components/CelebrationBurst'

const LS_KEY = 'veilsub_tour_completed'

interface Step {
  selector: string
  title: string
  description: string
}

const STEPS: Step[] = [
  { selector: 'a[href="/explore"]', title: 'Explore Creators', description: 'Start here — discover creators you want to support privately.' },
  { selector: '[aria-live="polite"]', title: 'Connect Your Wallet', description: 'Connect any Aleo wallet to subscribe, tip, and verify access.' },
  { selector: 'input[aria-label*="Search"], input[aria-label*="search"], #creator-search', title: 'Search Creators', description: 'Search by name, category, or paste an aleo1... address to find anyone.' },
  { selector: 'a[href^="/creator/"]', title: 'Visit a Creator', description: 'Click any creator card to see their content and subscription tiers.' },
  { selector: '', title: "You're Ready!", description: 'Everything you do here is private by default. Subscribe, verify, and tip — all mathematically private.' },
]

export default function OnboardingTour() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [done, setDone] = useState(false)
  const rafRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(LS_KEY)) return
    if (pathname === '/') setActive(true)
  }, [pathname])

  const measure = useCallback(() => {
    const sel = STEPS[step]?.selector
    if (!sel) { setRect(null); return }
    const el = document.querySelector(sel)
    if (el) setRect(el.getBoundingClientRect())
    else setRect(null)
  }, [step])

  useEffect(() => {
    if (!active) return
    measure()
    const onResize = () => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(measure) }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, { passive: true })
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onResize); cancelAnimationFrame(rafRef.current) }
  }, [active, step, measure])

  const finish = useCallback(() => {
    try {
      localStorage.setItem(LS_KEY, '1')
    } catch { /* localStorage full or unavailable */ }
    setDone(true)
    setTimeout(() => setActive(false), 1200)
  }, [])

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) { finish(); return }
    setStep((s) => s + 1)
  }, [step, finish])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') next()
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, next, finish])

  if (!active) return null

  const current = STEPS[step]
  const isFinal = step === STEPS.length - 1
  const pad = 8

  // Spotlight clip-path: everything dark except the cutout
  const clipPath = rect && !isFinal
    ? `polygon(0% 0%, 0% 100%, ${rect.left - pad}px 100%, ${rect.left - pad}px ${rect.top - pad}px, ${rect.right + pad}px ${rect.top - pad}px, ${rect.right + pad}px ${rect.bottom + pad}px, ${rect.left - pad}px ${rect.bottom + pad}px, ${rect.left - pad}px 100%, 100% 100%, 100% 0%)`
    : undefined

  // Tooltip position: below or above the spotlight
  const tooltipStyle: React.CSSProperties = rect && !isFinal
    ? { position: 'absolute', left: Math.max(16, Math.min(rect.left, window.innerWidth - 340)), top: rect.bottom + pad + 12 }
    : { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <AnimatePresence>
      <m.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
        style={{ pointerEvents: done ? 'none' : 'auto' }}
      >
        {/* Dark overlay with cutout */}
        <div
          className="absolute inset-0 bg-black/70 transition-[clip-path] duration-300"
          style={clipPath ? { clipPath } : undefined}
        />

        {/* Spotlight ring */}
        {rect && !isFinal && (
          <m.div
            key={step}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute rounded-xl border-2 border-white/20 pointer-events-none"
            style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
          />
        )}

        {/* Tooltip card */}
        {!done && (
          <m.div
            key={`tip-${step}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={tooltipStyle}
            className="w-[320px] p-5 rounded-2xl bg-[#121215] border border-white/12 shadow-[0_8px_40px_-8px_rgba(255,255,255,0.12)]"
          >
            {isFinal && (
              <div className="flex justify-center mb-3 relative">
                <div className="w-12 h-12 rounded-full bg-white/[0.08] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white/60" />
                </div>
                <CelebrationBurst />
              </div>
            )}
            <p className="text-sm font-semibold text-white mb-1">{current.title}</p>
            <p className="text-xs text-white/60 leading-relaxed mb-4">{current.description}</p>
            {/* Progress dots */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-white/70' : i < step ? 'bg-white/30' : 'bg-white/15'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                {!isFinal && (
                  <button onClick={finish} className="text-[11px] text-white/40 hover:text-white/60 transition-colors rounded focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none px-1">
                    Skip tour
                  </button>
                )}
                <button
                  onClick={isFinal ? finish : next}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.08] border border-white/15 text-xs font-medium text-white/80 hover:bg-white/30 transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                >
                  {isFinal ? 'Get Started' : 'Next'}
                  {!isFinal && <ArrowRight className="w-3 h-3" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </m.div>
        )}

        {/* Close button */}
        {!done && (
          <button
            onClick={finish}
            aria-label="Close tour"
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/[0.06] border border-border text-white/50 hover:text-white hover:bg-white/[0.1] transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </m.div>
    </AnimatePresence>
  )
}
