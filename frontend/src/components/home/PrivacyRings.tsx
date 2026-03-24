'use client'

/**
 * PrivacyRings — Animated orbital diagram visualizing VeilSub's privacy architecture.
 * Three concentric rings rotate at different speeds, representing the layers of privacy:
 * - Outer: Blind Subscription Protocol (subscriber identity)
 * - Middle: Zero-Address Finalize (mapping isolation)
 * - Inner: Poseidon2 Hashing (cryptographic foundation)
 */

// Extracted style constants to prevent re-renders
const OUTER_RING_ANIM = { animation: 'spin 30s linear infinite' } as const
const MIDDLE_RING_ANIM = { animation: 'spin 20s linear infinite reverse' } as const
const INNER_RING_ANIM = { animation: 'spin 14s linear infinite' } as const
const CENTER_CORE_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 0 40px rgba(255,255,255,0.04)',
} as const

export default function PrivacyRings() {
  return (
    <div className="relative w-full aspect-square max-w-xs mx-auto">
      {/* Outer ring — BSP (slowest) */}
      <div
        className="absolute inset-0 border border-white/[0.08] rounded-full"
        style={OUTER_RING_ANIM}
      >
        {/* Orbital node */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/20 border border-white/20 shadow-[0_0_8px_rgba(255,255,255,0.15)]" />
      </div>

      {/* Middle ring — Zero-Address (medium speed, reverse) */}
      <div
        className="absolute inset-6 border border-white/30/[0.2] rounded-full border-dashed"
        style={MIDDLE_RING_ANIM}
      >
        {/* Orbital node */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white/20 border border-white/30" />
      </div>

      {/* Inner ring — Poseidon2 (fastest) */}
      <div
        className="absolute inset-14 border border-white/[0.06] rounded-full"
        style={INNER_RING_ANIM}
      >
        {/* Orbital node */}
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/15" />
      </div>

      {/* Center core — ZK/Privacy text */}
      <div
        className="absolute inset-[72px] rounded-full flex items-center justify-center border border-white/[0.06]"
        style={CENTER_CORE_STYLE}
      >
        <div className="text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase">Zero</p>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase">Knowledge</p>
        </div>
      </div>
    </div>
  )
}
