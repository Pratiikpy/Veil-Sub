'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4" role="alert">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">
          VeilSub Error
        </h2>
        <p className="text-white/60 mb-2">
          An error occurred while executing a VeilSub operation. This could be a wallet
          connection issue, an on-chain transaction failure, or a temporary network problem.
          Your AccessPass records remain safe in your wallet.
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
            Retry Operation
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white/[0.05] border border-border text-white text-sm hover:bg-white/[0.08] transition-all active:scale-[0.98]"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}
