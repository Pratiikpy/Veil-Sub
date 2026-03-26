'use client'

interface CharacterRingProps {
  current: number
  max: number
  size?: number
}

export default function CharacterRing({ current, max, size = 28 }: CharacterRingProps) {
  const remaining = max - current
  const progress = Math.min(current / max, 1)
  const radius = (size - 4) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  const color = progress < 0.8 ? 'stroke-white/30'
    : progress < 0.93 ? 'stroke-yellow-500'
    : 'stroke-red-500'

  return (
    <div className="relative flex items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" className="stroke-white/10" strokeWidth={2.5} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" className={color} strokeWidth={2.5}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.15s ease' }}
        />
      </svg>
      {remaining <= 20 && (
        <span className={`text-[11px] font-mono ${remaining < 0 ? 'text-red-500' : remaining < 10 ? 'text-red-400' : 'text-yellow-500'}`}>
          {remaining}
        </span>
      )}
    </div>
  )
}
