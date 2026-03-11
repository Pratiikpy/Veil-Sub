'use client'

/**
 * PrivacyRings — Animated orbital diagram visualizing VeilSub's privacy architecture.
 * Three concentric rings rotate at different speeds, representing the layers of privacy:
 * - Outer: Blind Subscription Protocol (subscriber identity)
 * - Middle: Zero-Address Finalize (mapping isolation)
 * - Inner: Poseidon2 Hashing (cryptographic foundation)
 */
export default function PrivacyRings() {
  return (
    <div className="relative w-full aspect-square max-w-xs mx-auto">
      {/* Outer ring — BSP (slowest) */}
      <div
        className="absolute inset-0 border border-violet-500/[0.15] rounded-full"
        style={{ animation: 'spin 30s linear infinite' }}
      >
        {/* Orbital node */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-violet-400/30 border border-violet-400/50 shadow-[0_0_8px_rgba(139,92,246,0.3)]" />
      </div>

      {/* Middle ring — Zero-Address (medium speed, reverse) */}
      <div
        className="absolute inset-6 border border-violet-400/[0.2] rounded-full border-dashed"
        style={{ animation: 'spin 20s linear infinite reverse' }}
      >
        {/* Orbital node */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 rounded-full bg-violet-300/40 border border-violet-300/60" />
      </div>

      {/* Inner ring — Poseidon2 (fastest) */}
      <div
        className="absolute inset-14 border border-violet-300/[0.12] rounded-full"
        style={{ animation: 'spin 14s linear infinite' }}
      >
        {/* Orbital node */}
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-200/30" />
      </div>

      {/* Center core — ZK/Privacy text */}
      <div
        className="absolute inset-[72px] rounded-full flex items-center justify-center border border-violet-500/[0.12]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.06) 0%, transparent 70%)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 0 40px rgba(139,92,246,0.08)',
        }}
      >
        <div className="text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-violet-300/60 uppercase">Zero</p>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-violet-300/60 uppercase">Knowledge</p>
        </div>
      </div>
    </div>
  )
}
