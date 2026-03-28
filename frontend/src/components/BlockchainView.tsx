'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Shield, Terminal } from 'lucide-react'
import { spring } from '@/lib/motion'

interface BlockchainViewProps {
  creatorName: string
  creatorAddress: string
  subscriberCount: string
  revenue: string
  tierName: string
  tierPrice: string
  creatorHash: string
  contentCount: number
}

/** Truncate a field hash to a readable length */
function truncateHash(hash: string, len = 18): string {
  const cleaned = hash.replace('field', '')
  if (cleaned.length <= len) return cleaned + 'field'
  return cleaned.slice(0, len) + '...field'
}

/** Text scramble hook: animates characters settling into final string */
function useTextScramble(target: string, active: boolean, duration = 600): string {
  const [display, setDisplay] = useState(target)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)

    if (!active) {
      setDisplay(target)
      return
    }

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target)
      return
    }

    const chars = '0123456789abcdef...:'
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      const result = target
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' '
          const charProgress = Math.max(0, (progress * target.length - i) / 3)
          if (charProgress >= 1) return char
          return chars[Math.floor(Math.random() * chars.length)]
        })
        .join('')

      setDisplay(result)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, active, duration])

  return display
}

/** Single data row with scramble transition */
function DataRow({
  label,
  normalValue,
  chainValue,
  isChainView,
  delay = 0,
}: {
  label: string
  normalValue: string
  chainValue: string
  isChainView: boolean
  delay?: number
}) {
  const displayValue = useTextScramble(
    isChainView ? chainValue : normalValue,
    isChainView,
    500 + delay,
  )

  return (
    <m.div
      layout
      className="flex flex-col gap-1 p-3 rounded-lg transition-colors duration-300"
      style={{
        background: isChainView ? 'rgba(34, 197, 94, 0.04)' : 'rgba(255, 255, 255, 0.02)',
        border: isChainView ? '1px solid rgba(34, 197, 94, 0.12)' : '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <span className={`text-[11px] uppercase tracking-wider font-medium transition-colors duration-300 ${
        isChainView ? 'text-green-400' : 'text-white/60'
      }`}>
        {label}
      </span>
      <span className={`text-sm font-medium break-all transition-colors duration-300 ${
        isChainView ? 'font-mono text-green-400' : 'text-white'
      }`}>
        {displayValue}
      </span>
    </m.div>
  )
}

export default function BlockchainView({
  creatorName,
  creatorAddress,
  subscriberCount,
  revenue,
  tierName,
  tierPrice,
  creatorHash,
  contentCount,
}: BlockchainViewProps) {
  const [isChainView, setIsChainView] = useState(false)
  const [glitching, setGlitching] = useState(false)

  const toggle = useCallback(() => {
    setGlitching(true)
    // Brief glitch then switch
    setTimeout(() => {
      setIsChainView((prev) => !prev)
      setTimeout(() => setGlitching(false), 150)
    }, 100)
  }, [])

  const hashDisplay = creatorHash
    ? `Poseidon2(addr) = ${truncateHash(creatorHash)}`
    : 'Poseidon2(addr) = [register to reveal]'

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Scanline overlay in chain view */}
      <AnimatePresence>
        {isChainView && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-0 z-10"
            aria-hidden="true"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 197, 94, 0.03) 2px, rgba(34, 197, 94, 0.03) 4px)',
              backgroundSize: '100% 4px',
            }}
          />
        )}
      </AnimatePresence>

      {/* Glitch flash overlay */}
      <AnimatePresence>
        {glitching && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0.2, 0.8, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, times: [0, 0.1, 0.3, 0.5, 1] }}
            className="pointer-events-none absolute inset-0 z-20 bg-green-500/10"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <m.div
        animate={glitching ? { x: [0, -3, 4, -2, 0] } : { x: 0 }}
        transition={{ duration: 0.2 }}
        className={`relative p-5 sm:p-6 border rounded-xl transition-all duration-500 ${
          isChainView
            ? 'bg-[#0a0f0a] border-green-500/20'
            : 'bg-surface-1 border-border'
        }`}
      >
        {/* Header + Toggle */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
              isChainView ? 'bg-green-500/10' : 'bg-white/[0.04]'
            }`}>
              {isChainView ? (
                <Terminal className="w-4 h-4 text-green-400" aria-hidden="true" />
              ) : (
                <Shield className="w-4 h-4 text-white/60" aria-hidden="true" />
              )}
            </div>
            <div>
              <h3 className={`text-sm font-semibold transition-colors duration-300 ${
                isChainView ? 'text-green-400' : 'text-white'
              }`}>
                {isChainView ? 'Blockchain Perspective' : 'What Can the Blockchain See?'}
              </h3>
              <p className={`text-[11px] transition-colors duration-300 ${
                isChainView ? 'text-green-400/80' : 'text-white/60'
              }`}>
                {isChainView ? 'This is ALL an observer can extract from on-chain data' : 'Toggle to see what on-chain data actually reveals'}
              </p>
            </div>
          </div>

          {/* Toggle pill */}
          <button
            onClick={toggle}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none ${
              isChainView
                ? 'bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                : 'bg-white/[0.05] border border-border text-white/70 hover:bg-white/[0.08]'
            }`}
            aria-label={isChainView ? 'Switch to user view' : 'Switch to blockchain view'}
            aria-pressed={isChainView}
          >
            {isChainView ? (
              <>
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Chain View</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>User View</span>
              </>
            )}
          </button>
        </div>

        {/* Data grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" aria-live="polite">
          <DataRow
            label="Creator Identity"
            normalValue={creatorName}
            chainValue={hashDisplay}
            isChainView={isChainView}
            delay={0}
          />
          <DataRow
            label="Creator Address"
            normalValue={creatorAddress.slice(0, 12) + '...' + creatorAddress.slice(-6)}
            chainValue="[hidden — never stored in mappings]"
            isChainView={isChainView}
            delay={80}
          />
          <DataRow
            label="Subscriber Count"
            normalValue={subscriberCount}
            chainValue="commit(count, blind) = 0group"
            isChainView={isChainView}
            delay={160}
          />
          <DataRow
            label="Revenue"
            normalValue={revenue}
            chainValue="commit(revenue, blind) = 0group"
            isChainView={isChainView}
            delay={240}
          />
          <DataRow
            label="Tier"
            normalValue={`${tierName} -- ${tierPrice}`}
            chainValue="TierKey { hash, id: 1u8 }"
            isChainView={isChainView}
            delay={320}
          />
          <DataRow
            label="Content"
            normalValue={`${contentCount} post${contentCount !== 1 ? 's' : ''} published`}
            chainValue="content_meta[Poseidon2(id)] = encrypted_blob"
            isChainView={isChainView}
            delay={400}
          />
        </div>

        {/* Bottom explanation */}
        <AnimatePresence mode="wait">
          {isChainView ? (
            <m.div
              key="chain-explanation"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={spring.gentle}
              className="mt-4 p-3 rounded-lg bg-green-500/[0.05] border border-green-500/15"
            >
              <p className="text-[11px] text-green-400 leading-relaxed">
                <strong className="text-green-400">Zero addresses in finalize.</strong>{' '}
                All 30 on-chain mappings use Poseidon2 hashes as keys, never wallet addresses.
                Subscriber lists don&apos;t exist. Revenue and counts are Pedersen commitments.
                An observer sees hashes, commitments, and encrypted blobs -- never identities.
              </p>
            </m.div>
          ) : (
            <m.div
              key="user-explanation"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={spring.gentle}
              className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-border"
            >
              <p className="text-[11px] text-white/60 leading-relaxed">
                <strong className="text-white/60">You see this.</strong>{' '}
                Toggle to &quot;Chain View&quot; to see what a blockchain observer, analytics firm, or
                government subpoena could actually extract from on-chain data. Spoiler: almost nothing.
              </p>
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </div>
  )
}
