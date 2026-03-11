'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function DocsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4" role="alert">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Documentation Error</h2>
        <p className="text-white/70 mb-2">
          Could not load documentation. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-white/60 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 transition-all active:scale-[0.98] btn-shimmer"
          >
            Retry
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white/[0.05] border border-border text-white text-sm hover:bg-white/[0.08] transition-all active:scale-[0.98]"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
