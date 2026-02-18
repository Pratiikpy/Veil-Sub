'use client'

import { useReducedMotion } from 'framer-motion'
import { motion } from 'framer-motion'

export default function FloatingOrbs() {
  const prefersReducedMotion = useReducedMotion()
  const orbs = [
    {
      size: 500,
      color: 'rgba(139, 92, 246, 0.10)',
      x: '10%',
      y: '15%',
      duration: 22,
      blur: 120,
      xDrift: [0, 100, -50, 0],
      yDrift: [0, -80, 60, 0],
    },
    {
      size: 600,
      color: 'rgba(99, 102, 241, 0.08)',
      x: '75%',
      y: '55%',
      duration: 28,
      blur: 120,
      xDrift: [0, -90, 70, 0],
      yDrift: [0, 70, -50, 0],
    },
    {
      size: 450,
      color: 'rgba(168, 85, 247, 0.07)',
      x: '45%',
      y: '35%',
      duration: 20,
      blur: 100,
      xDrift: [0, 70, -80, 50, 0],
      yDrift: [0, 80, -60, 40, 0],
    },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            left: orb.x,
            top: orb.y,
            filter: `blur(${orb.blur}px)`,
          }}
          animate={prefersReducedMotion ? {} : {
            x: orb.xDrift,
            y: orb.yDrift,
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={prefersReducedMotion ? {} : {
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
