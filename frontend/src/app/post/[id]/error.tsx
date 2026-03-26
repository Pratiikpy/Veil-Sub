'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Compass } from 'lucide-react'

export default function PostError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[post] error:', error) }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">Post unavailable</h1>
        <p className="text-sm text-white/60 mb-6">
          This post couldn't be loaded. It may have been removed or you may not have access.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-all active:scale-[0.98]">
            Try Again
          </button>
          <Link href="/explore" className="px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white/80 text-sm font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
            <Compass className="w-4 h-4" /> Browse Creators
          </Link>
        </div>
      </div>
    </div>
  )
}
