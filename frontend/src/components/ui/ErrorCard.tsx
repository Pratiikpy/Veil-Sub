'use client'

import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface ErrorCardProps {
  title?: string
  message: string
  onRetry?: () => void
  helpLink?: string
  backLink?: string
  className?: string
}

export default function ErrorCard({
  title = 'Something went wrong',
  message,
  onRetry,
  helpLink,
  backLink,
  className = '',
}: ErrorCardProps) {
  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-500/15 bg-red-500/[0.04] border-l-[3px] border-l-red-400/60 p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400/80 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white mb-1">{title}</p>
          <p className="text-xs text-white/60 leading-relaxed">{message}</p>
          {(onRetry || helpLink || backLink) && (
            <div className="flex items-center gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.08] border border-white/[0.1] text-xs font-medium text-white hover:bg-white/[0.12] transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
                >
                  Try again
                </button>
              )}
              {helpLink && (
                <Link
                  href={helpLink}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
                >
                  Get help
                </Link>
              )}
              {backLink && (
                <Link
                  href={backLink}
                  className="px-3.5 py-1.5 text-xs text-white/50 hover:text-white/70 transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none rounded-lg"
                >
                  Go back
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
