'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { User, Star, Shield, Search, CircleDollarSign, Lock, HelpCircle } from 'lucide-react'
import { spring } from '@/lib/motion'

// ── Styles ──
const CONTAINER_STYLE = {
  background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)',
} as const

// ── Particle along the path ──
function Particle({ delay, duration }: { delay: number; duration: number }) {
  return (
    <m.div
      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/70"
      style={{ left: 0, boxShadow: '0 0 8px rgba(255,255,255,0.3)' }}
      initial={{ left: '15%', opacity: 0, scale: 0 }}
      animate={{
        left: ['15%', '85%'],
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0],
      }}
      transition={{
        duration,
        delay,
        ease: 'easeInOut',
      }}
    />
  )
}

// ── Glowing pulse along the path ──
function GlowPulse() {
  return (
    <m.div
      className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), rgba(255,255,255,0.2), transparent)',
        boxShadow: '0 0 20px rgba(255,255,255,0.2), 0 0 40px rgba(255,255,255,0.1)',
      }}
      initial={{ left: '10%', width: '0%', opacity: 0 }}
      animate={{
        left: ['10%', '50%', '85%'],
        width: ['0%', '30%', '0%'],
        opacity: [0, 1, 0],
      }}
      transition={{ duration: 1.8, ease: 'easeInOut' }}
    />
  )
}

// ── Icon wrapper with consistent styling ──
function IconNode({
  children,
  label,
  side,
}: {
  children: React.ReactNode
  label?: string
  side: 'left' | 'right' | 'center'
}) {
  const alignment = side === 'left' ? 'items-end' : side === 'right' ? 'items-start' : 'items-center'
  return (
    <div className={`flex flex-col ${alignment} gap-2`}>
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm flex items-center justify-center">
        {children}
      </div>
      {label && (
        <m.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-[11px] sm:text-xs text-white/50 font-medium tracking-wide"
        >
          {label}
        </m.span>
      )}
    </div>
  )
}

// ── Static fallback for prefers-reduced-motion ──
function StaticDiagram() {
  return (
    <div className="relative w-full max-w-[600px] h-[220px] sm:h-[280px] mx-auto flex items-center justify-between px-8 sm:px-16">
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center">
          <User className="w-6 h-6 sm:w-7 sm:h-7 text-white/70" />
        </div>
        <span className="text-[11px] text-white/50">Subscriber</span>
      </div>

      <div className="flex-1 mx-4 sm:mx-8 flex flex-col items-center gap-2">
        <div className="w-full h-px border-t border-dashed border-white/20" />
        <div className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.04] flex items-center justify-center">
          <Shield className="w-5 h-5 text-white/60" />
        </div>
        <span className="text-[10px] text-white/50">ZK Privacy Proof</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center">
          <Star className="w-6 h-6 sm:w-7 sm:h-7 text-white/70" />
        </div>
        <span className="text-[11px] text-white/50">Creator</span>
      </div>
    </div>
  )
}

// ── Main animated component ──
export default function HeroAnimation() {
  const [frame, setFrame] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const frameRef = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Frame sequencer
  const advanceFrame = useCallback(() => {
    frameRef.current = (frameRef.current + 1) % 7 // 0-5 = frames, 6 = pause
    setFrame(frameRef.current)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) return

    // Frame durations: frames 0-4 are 2s each, frame 5 is 2s, frame 6 (pause) is 2s
    const durations = [2000, 2000, 2000, 2000, 2000, 2000, 2000]

    let timeoutId: ReturnType<typeof setTimeout>

    const scheduleNext = () => {
      const currentFrame = frameRef.current
      const nextDuration = durations[currentFrame] || 2000
      timeoutId = setTimeout(() => {
        advanceFrame()
        scheduleNext()
      }, nextDuration)
    }

    scheduleNext()
    return () => clearTimeout(timeoutId)
  }, [prefersReducedMotion, advanceFrame])

  if (prefersReducedMotion) {
    return <StaticDiagram />
  }

  return (
    <div
      className="relative w-full max-w-[600px] h-[220px] sm:h-[280px] mx-auto"
      style={CONTAINER_STYLE}
      role="img"
      aria-label="Animation showing how VeilSub protects subscriber privacy: a subscriber pays, a privacy proof is generated, the creator earns, and an observer sees nothing."
    >
      {/* ── Subscriber icon (left) ── */}
      <div className="absolute left-4 sm:left-10 top-1/2 -translate-y-1/2 z-10">
        <AnimatePresence mode="wait">
          {frame <= 5 && (
            <m.div
              key={`subscriber-${frame <= 2 ? 'base' : frame === 3 ? 'locked' : 'hold'}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={spring.gentle}
            >
              <IconNode
                side="left"
                label={frame === 3 || frame >= 4 ? 'Protected' : 'Subscriber'}
              >
                {frame >= 3 ? (
                  <m.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={spring.bouncy}
                  >
                    <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                  </m.div>
                ) : (
                  <User className="w-6 h-6 sm:w-7 sm:h-7 text-white/70" />
                )}
              </IconNode>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Creator icon (right) ── */}
      <div className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 z-10">
        <AnimatePresence mode="wait">
          {frame <= 5 && (
            <m.div
              key={`creator-${frame <= 2 ? 'base' : frame === 3 ? 'paid' : 'hold'}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={spring.gentle}
            >
              <IconNode
                side="right"
                label={frame === 3 || frame >= 4 ? 'Earned' : 'Creator'}
              >
                {frame >= 3 ? (
                  <m.div
                    initial={{ scale: 0, rotate: 20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={spring.bouncy}
                  >
                    <CircleDollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                  </m.div>
                ) : (
                  <Star className="w-6 h-6 sm:w-7 sm:h-7 text-white/70" />
                )}
              </IconNode>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Connection line area ── */}
      <div className="absolute left-[85px] sm:left-[120px] right-[85px] sm:right-[120px] top-1/2 -translate-y-1/2 h-8">
        {/* Dotted line — Frame 1-2 */}
        <AnimatePresence>
          {(frame === 1 || frame === 2) && (
            <m.div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <svg
                width="100%"
                height="4"
                className="overflow-visible"
                preserveAspectRatio="none"
              >
                <m.line
                  x1="0%"
                  y1="2"
                  x2="100%"
                  y2="2"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </svg>
            </m.div>
          )}
        </AnimatePresence>

        {/* Traveling particles — Frame 1 */}
        <AnimatePresence>
          {frame === 1 && (
            <m.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Particle delay={0.3} duration={1.2} />
              <Particle delay={0.6} duration={1.1} />
              <Particle delay={0.9} duration={1.0} />
              <Particle delay={1.2} duration={1.1} />
            </m.div>
          )}
        </AnimatePresence>

        {/* Glowing pulse — Frame 2 */}
        <AnimatePresence>
          {frame === 2 && (
            <m.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlowPulse />
            </m.div>
          )}
        </AnimatePresence>

        {/* Shield icon at center — Frame 2 */}
        <AnimatePresence>
          {frame === 2 && (
            <m.div
              className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={spring.bouncy}
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-white/20 bg-white/[0.06] backdrop-blur-sm flex items-center justify-center"
                style={{ boxShadow: '0 0 24px rgba(255,255,255,0.15)' }}
              >
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white/60" />
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Frame label ── */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-10">
        <AnimatePresence mode="wait">
          {frame === 1 && (
            <m.span
              key="label-subscribe"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-xs sm:text-sm text-white/60 font-medium tracking-wide"
            >
              Subscribe
            </m.span>
          )}
          {frame === 2 && (
            <m.span
              key="label-proof"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-xs sm:text-sm text-white/50 font-medium tracking-wide"
            >
              Privacy proof generated
            </m.span>
          )}
          {frame === 3 && (
            <m.span
              key="label-done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-xs sm:text-sm text-emerald-300/80 font-medium tracking-wide"
            >
              Creator paid. Subscriber hidden.
            </m.span>
          )}
          {(frame === 4 || frame === 5) && (
            <m.span
              key="label-observer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-xs sm:text-sm text-white/40 font-medium tracking-wide"
            >
              Observer sees nothing
            </m.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Searcher / Observer — Frame 4-5 ── */}
      <AnimatePresence>
        {(frame === 4 || frame === 5) && (
          <m.div
            className="absolute left-1/2 -translate-x-1/2 top-[38%] -translate-y-1/2 z-20"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.3 } }}
            transition={spring.gentle}
          >
            {/* Scanning magnifying glass */}
            <m.div
              animate={{
                x: [0, 60, -60, 40, -40, 0],
              }}
              transition={{
                duration: 3,
                ease: 'easeInOut',
                times: [0, 0.2, 0.45, 0.65, 0.85, 1],
              }}
              className="relative"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm flex items-center justify-center">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-white/40" />
              </div>

              {/* Question mark above */}
              <m.div
                className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0, y: 4 }}
                animate={{
                  opacity: [0, 0, 1, 1],
                  y: [4, 4, 0, 0],
                }}
                transition={{ duration: 3, times: [0, 0.5, 0.6, 1] }}
              >
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
              </m.div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Progress dots (frame indicator) ── */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => {
          // Map display frame: 0=idle, 1=subscribe, 2=proof, 3=result, 4=observer
          const activeDisplay = frame === 0 ? 0 : frame <= 2 ? frame : frame <= 3 ? 3 : 4
          return (
            <div
              key={i}
              className={`w-1 h-1 rounded-full transition-all duration-500 ${
                i === activeDisplay
                  ? 'bg-white/70 w-3'
                  : i < activeDisplay
                  ? 'bg-white/30'
                  : 'bg-white/15'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
