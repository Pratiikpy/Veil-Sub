'use client'

import { useMemo } from 'react'
import { Shield, Check, X } from 'lucide-react'

export type ProofAnimationState = 'idle' | 'proving' | 'confirmed' | 'failed'

interface Props {
  state: ProofAnimationState
}

/** Number of particles to render */
const PARTICLE_COUNT = 24

interface Particle {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
  color: string
}

/**
 * ZK Proof particle animation.
 *
 * - idle: nothing rendered
 * - proving: particles float and converge toward center in a loop
 * - confirmed: particles burst outward, then a shield + "Verified" appears
 * - failed: particles scatter away, X icon appears
 */
export default function ProofAnimation({ state }: Props) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2
      const radius = 40 + Math.random() * 30
      return {
        id: i,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 2,
        duration: 2.5 + Math.random() * 1.5,
        color:
          i % 3 === 0
            ? 'rgba(139, 92, 246, 0.9)'
            : i % 3 === 1
            ? 'rgba(167, 139, 250, 0.7)'
            : 'rgba(196, 181, 253, 0.6)',
      }
    })
  }, [])

  if (state === 'idle') return null

  const animClass =
    state === 'proving'
      ? 'proof-particle-converge'
      : state === 'confirmed'
      ? 'proof-particle-burst'
      : 'proof-particle-scatter'

  return (
    <div className="relative flex items-center justify-center" style={{ height: 160 }}>
      {/* Particle field */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        {particles.map((p) => (
          <div
            key={p.id}
            className={`proof-particle ${animClass}`}
            style={
              {
                '--px': `${p.x}px`,
                '--py': `${p.y}px`,
                '--size': `${p.size}px`,
                '--delay': `${p.delay}s`,
                '--duration': `${p.duration}s`,
                '--color': p.color,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Center glow ring (proving state) */}
      {state === 'proving' && (
        <div className="relative z-10 w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center proof-glow">
          <Shield className="w-7 h-7 text-violet-400" aria-hidden="true" />
        </div>
      )}

      {/* Confirmed: shield + checkmark + text */}
      {state === 'confirmed' && (
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center proof-flash">
            <Check className="w-8 h-8 text-green-400" aria-hidden="true" />
          </div>
          <span className="text-xs font-medium text-green-400 proof-text-enter">
            Proof verified
          </span>
        </div>
      )}

      {/* Failed: X icon */}
      {state === 'failed' && (
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center proof-flash">
            <X className="w-8 h-8 text-red-400" aria-hidden="true" />
          </div>
          <span className="text-xs font-medium text-red-400 proof-text-enter">
            Proof failed
          </span>
        </div>
      )}
    </div>
  )
}
