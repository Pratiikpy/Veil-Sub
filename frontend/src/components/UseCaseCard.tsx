'use client'

import GlassCard from './GlassCard'

interface Props {
  persona: string
  quote: string
  useCase: string
  avatar: string
  delay?: number
}

export default function UseCaseCard({
  persona,
  quote,
  useCase,
  avatar,
  delay = 0,
}: Props) {
  return (
    <GlassCard shimmer delay={delay}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center text-xl shrink-0">
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-300 text-sm italic mb-3 leading-relaxed">
            &ldquo;{quote}&rdquo;
          </p>
          <div>
            <p className="text-white font-semibold text-sm">{persona}</p>
            <p className="text-xs text-slate-500">{useCase}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
