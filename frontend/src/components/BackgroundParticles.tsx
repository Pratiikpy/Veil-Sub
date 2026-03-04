'use client'

const PARTICLES = [
  { top: '8%', left: '12%', size: 2, opacity: 0.08, delay: 0 },
  { top: '15%', left: '78%', size: 3, opacity: 0.06, delay: 1.2 },
  { top: '32%', left: '5%', size: 2, opacity: 0.1, delay: 2.4 },
  { top: '28%', left: '92%', size: 2, opacity: 0.05, delay: 0.8 },
  { top: '45%', left: '18%', size: 3, opacity: 0.07, delay: 3.6 },
  { top: '52%', left: '85%', size: 2, opacity: 0.09, delay: 1.6 },
  { top: '65%', left: '8%', size: 2, opacity: 0.06, delay: 4.2 },
  { top: '70%', left: '72%', size: 3, opacity: 0.08, delay: 2.0 },
  { top: '78%', left: '35%', size: 2, opacity: 0.05, delay: 3.0 },
  { top: '85%', left: '90%', size: 2, opacity: 0.07, delay: 0.4 },
  { top: '22%', left: '45%', size: 2, opacity: 0.04, delay: 5.0 },
  { top: '58%', left: '55%', size: 2, opacity: 0.06, delay: 2.8 },
]

export default function BackgroundParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#8b5cf6]"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `particle-drift ${6 + i * 0.5}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
