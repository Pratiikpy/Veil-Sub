'use client'

interface Props {
  className?: string
  intensity?: 'subtle' | 'medium' | 'strong'
}

export default function SmokeBackground({ className = '', intensity = 'subtle' }: Props) {
  const opacityMap = {
    subtle: { blob1: 0.06, blob2: 0.04, blob3: 0.03 },
    medium: { blob1: 0.1, blob2: 0.07, blob3: 0.05 },
    strong: { blob1: 0.15, blob2: 0.1, blob3: 0.07 },
  }

  const o = opacityMap[intensity]

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Primary violet blob — slow drift */}
      <div
        className="absolute animate-smoke-1"
        style={{
          top: '10%',
          left: '20%',
          width: '600px',
          height: '600px',
          background: `radial-gradient(ellipse at center, rgba(139, 92, 246, ${o.blob1}) 0%, transparent 70%)`,
          filter: 'blur(80px)',
        }}
      />
      {/* Secondary blue-violet blob */}
      <div
        className="absolute animate-smoke-2"
        style={{
          top: '50%',
          right: '10%',
          width: '500px',
          height: '500px',
          background: `radial-gradient(ellipse at center, rgba(99, 102, 241, ${o.blob2}) 0%, transparent 70%)`,
          filter: 'blur(100px)',
        }}
      />
      {/* Tertiary warm accent */}
      <div
        className="absolute animate-smoke-3"
        style={{
          bottom: '10%',
          left: '40%',
          width: '450px',
          height: '450px',
          background: `radial-gradient(ellipse at center, rgba(139, 92, 246, ${o.blob3}) 0%, transparent 70%)`,
          filter: 'blur(90px)',
        }}
      />
    </div>
  )
}
