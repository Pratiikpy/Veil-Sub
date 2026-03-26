'use client'

import { useState, useEffect, useCallback } from 'react'

const SHORTCUTS = [
  { keys: '\u2318K', desc: 'Search' },
  { keys: 'G then F', desc: 'Go to Feed' },
  { keys: 'G then E', desc: 'Go to Explore' },
  { keys: 'G then D', desc: 'Go to Dashboard' },
  { keys: 'N', desc: 'New post (dashboard)' },
  { keys: 'J / K', desc: 'Next / Previous post' },
  { keys: 'L', desc: 'Like current post' },
  { keys: 'S', desc: 'Save current post' },
  { keys: 'Esc', desc: 'Close modal / go back' },
  { keys: '?', desc: 'Show this panel' },
] as const

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  const handleKey = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      setOpen(prev => !prev)
    }
    if (e.key === 'Escape' && open) {
      setOpen(false)
    }
  }, [open])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-label="Keyboard shortcuts">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/[0.08] bg-surface-1 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white tracking-tight">Keyboard Shortcuts</h2>
          <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white/60 transition-colors text-sm" aria-label="Close">
            Esc
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={keys} className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/60">{desc}</span>
              <kbd className="shrink-0 px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-white/70">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
