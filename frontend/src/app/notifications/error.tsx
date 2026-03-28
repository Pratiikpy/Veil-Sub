'use client'
import { useEffect } from 'react'

export default function NotificationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Notifications error:', error) }, [error])
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
        <p className="text-white/60 mb-6">Could not load notifications. This may be a temporary issue.</p>
        <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.08] text-white hover:bg-white/[0.12] transition-colors">Try again</button>
      </div>
    </div>
  )
}
