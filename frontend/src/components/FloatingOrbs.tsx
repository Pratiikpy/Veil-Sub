'use client'

import { motion } from 'framer-motion'

export default function FloatingOrbs() {
  const orbs = [
    {
      size: 400,
      color: 'rgba(139, 92, 246, 0.15)',
      x: '15%',
      y: '20%',
      duration: 20,
      xDrift: [0, 100, -50, 0],
      yDrift: [0, -80, 60, 0],
    },
    {
      size: 500,
      color: 'rgba(99, 102, 241, 0.1)',
      x: '75%',
      y: '60%',
      duration: 25,
      xDrift: [0, -90, 70, 0],
      yDrift: [0, 70, -50, 0],
    },
    {
      size: 350,
      color: 'rgba(168, 85, 247, 0.08)',
      x: '45%',
      y: '40%',
      duration: 18,
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
            filter: 'blur(60px)',
          }}
          animate={{
            x: orb.xDrift,
            y: orb.yDrift,
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
