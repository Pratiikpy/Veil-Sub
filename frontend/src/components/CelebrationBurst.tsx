'use client'

import { motion } from 'framer-motion'

const SPARKLE_POSITIONS = [
  { x: -60, y: -60 },
  { x: 60, y: -60 },
  { x: -80, y: 0 },
  { x: 80, y: 0 },
  { x: -60, y: 60 },
  { x: 60, y: 60 },
  { x: 0, y: -80 },
  { x: 0, y: 80 },
]

export default function CelebrationBurst({ color = 'bg-violet-400' }: { color?: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {SPARKLE_POSITIONS.map((pos, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: pos.x, y: pos.y, scale: 0 }}
          transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
          className={`absolute w-2 h-2 rounded-full ${color}`}
        />
      ))}
    </div>
  )
}
