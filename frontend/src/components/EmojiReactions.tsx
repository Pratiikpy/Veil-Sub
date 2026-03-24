'use client'

import { useState, useCallback } from 'react'

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

function loadReactions(contentId: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY + contentId) || '{}')
  } catch { return {} }
}

function loadMyReactions(contentId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY + contentId + '_my') || '[]'))
  } catch { return new Set() }
}

export default function EmojiReactions({ contentId }: EmojiReactionsProps) {
  const [expanded, setExpanded] = useState(false)
  const [counts, setCounts] = useState(() => loadReactions(contentId))
  const [mine, setMine] = useState(() => loadMyReactions(contentId))

  const toggle = useCallback((key: string) => {
    setCounts(prev => {
      const isActive = mine.has(key)
      const next = { ...prev, [key]: Math.max(0, (prev[key] || 0) + (isActive ? -1 : 1)) }
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
