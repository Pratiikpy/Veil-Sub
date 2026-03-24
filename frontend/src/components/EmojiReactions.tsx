'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface EmojiReactionsProps {
  contentId: string
}

const EMOJIS = [
  { key: 'heart', emoji: '\u2764\uFE0F' },
  { key: 'fire', emoji: '\uD83D\uDD25' },
  { key: 'clap', emoji: '\uD83D\uDC4F' },
  { key: 'wow', emoji: '\uD83D\uDE2E' },
  { key: 'idea', emoji: '\uD83D\uDCA1' },
  { key: 'pray', emoji: '\uD83D\uDE4F' },
] as const

const STORAGE_KEY = 'veilsub_reactions_'

function loadMyReactions(contentId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY + contentId + '_my') || '[]'))
  } catch { return new Set() }
}

function loadLocalCounts(contentId: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY + contentId) || '{}')
  } catch { return {} }
}

export default function EmojiReactions({ contentId }: EmojiReactionsProps) {
  const [expanded, setExpanded] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>(() => loadLocalCounts(contentId))
  const [mine, setMine] = useState(() => loadMyReactions(contentId))
  const serverAvailable = useRef(true)

  // Fetch aggregate counts from server on mount
  useEffect(() => {
    let cancelled = false

    async function fetchCounts() {
      try {
        const res = await fetch(`/api/social?type=reactions&contentId=${encodeURIComponent(contentId)}`)
        if (!cancelled && res.ok) {
          const { counts: serverCounts } = await res.json()
          if (serverCounts && Object.keys(serverCounts).length > 0) {
            setCounts(serverCounts)
            try { localStorage.setItem(STORAGE_KEY + contentId, JSON.stringify(serverCounts)) } catch { /* quota */ }
            return
          }
        }
        if (!cancelled && !res.ok) serverAvailable.current = false
      } catch {
        if (!cancelled) serverAvailable.current = false
      }
    }

    fetchCounts()
    return () => { cancelled = true }
  }, [contentId])

  const toggle = useCallback(async (key: string) => {
    const isActive = mine.has(key)
    const delta = isActive ? -1 : 1

    // Optimistic local update
    setCounts(prev => {
      const next = { ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }
      if (next[key] === 0) delete next[key]
      try { localStorage.setItem(STORAGE_KEY + contentId, JSON.stringify(next)) } catch { /* quota */ }
      return next
    })

    setMine(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      try { localStorage.setItem(STORAGE_KEY + contentId + '_my', JSON.stringify([...next])) } catch { /* quota */ }
      return next
    })

    // Persist aggregate count change to server
    if (serverAvailable.current) {
      try {
        const res = await fetch('/api/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'reaction', contentId, reactionType: key, delta }),
        })
        if (!res.ok) {
          // Rollback optimistic update on server error
          setCounts(prev => {
            const next = { ...prev, [key]: Math.max(0, (prev[key] || 0) - delta) }
            if (next[key] === 0) delete next[key]
            try { localStorage.setItem(STORAGE_KEY + contentId, JSON.stringify(next)) } catch { /* quota */ }
            return next
          })
          setMine(prev => {
            const next = new Set(prev)
            if (isActive) next.add(key); else next.delete(key)
            try { localStorage.setItem(STORAGE_KEY + contentId + '_my', JSON.stringify([...next])) } catch { /* quota */ }
            return next
          })
          toast.error('Reaction not saved — please try again')
        }
      } catch {
        // Network error — rollback optimistic update
        setCounts(prev => {
          const next = { ...prev, [key]: Math.max(0, (prev[key] || 0) - delta) }
          if (next[key] === 0) delete next[key]
          try { localStorage.setItem(STORAGE_KEY + contentId, JSON.stringify(next)) } catch { /* quota */ }
          return next
        })
        setMine(prev => {
          const next = new Set(prev)
          if (isActive) next.add(key); else next.delete(key)
          try { localStorage.setItem(STORAGE_KEY + contentId + '_my', JSON.stringify([...next])) } catch { /* quota */ }
          return next
        })
        serverAvailable.current = false
      }
    }
  }, [contentId, mine])

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-white/40 hover:text-white/60 transition-colors px-1.5 py-0.5 rounded hover:bg-white/[0.04]"
        aria-label={expanded ? 'Hide reactions' : 'Show reactions'}
      >
        {expanded ? '\u2715' : '\u263A React'}
      </button>
      {expanded && EMOJIS.map(({ key, emoji }, i) => (
        <button
          key={key}
          onClick={() => toggle(key)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
            mine.has(key) ? 'bg-violet-500/20 border border-violet-500/30' : 'bg-white/[0.04] border border-transparent hover:bg-white/[0.08]'
          }`}
          style={{ animationDelay: `${i * 50}ms`, animation: 'fadeInScale 200ms ease-out both' }}
          aria-label={`React with ${emoji}`}
        >
          <span>{emoji}</span>
          {(counts[key] || 0) > 0 && <span className="text-white/60">{counts[key]}</span>}
        </button>
      ))}
    </div>
  )
}
