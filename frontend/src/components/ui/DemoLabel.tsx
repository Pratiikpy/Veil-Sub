'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  message?: string
}

const DEFAULT_MESSAGE = 'This feature is in beta. Data shown is for demonstration.'

export default function DemoLabel({ message = DEFAULT_MESSAGE }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="relative flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
      <AlertTriangle
        className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0"
        aria-hidden="true"
      />
      <p className="text-xs sm:text-sm text-amber-300/90 leading-relaxed flex-1">
        {message}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-md text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
        style={{ transitionDuration: 'var(--duration-micro)' }}
        aria-label="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
