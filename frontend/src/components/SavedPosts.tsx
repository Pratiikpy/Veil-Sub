'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bookmark, Trash2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface SavedEntry {
  contentId: string
  creatorAddress: string
  title: string
  savedAt: number
}

const SAVED_KEY = 'veilsub_saved_posts'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'now'
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function SavedPosts() {
  const [entries, setEntries] = useState<SavedEntry[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY)
      if (raw) setEntries(JSON.parse(raw))
    } catch { /* empty */ }
  }, [])

  const remove = useCallback((contentId: string) => {
    const next = entries.filter(e => e.contentId !== contentId)
    setEntries(next)
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)) } catch { /* quota */ }
  }, [entries])

  const clearAll = useCallback(() => {
    setEntries([])
    try { localStorage.removeItem(SAVED_KEY) } catch { /* empty */ }
  }, [])

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0F] p-10 text-center">
        <Bookmark className="w-10 h-10 text-white/20 mx-auto mb-3" aria-hidden="true" />
        <h3 className="text-sm font-medium text-white/70 mb-1">No saved posts</h3>
        <p className="text-xs text-white/40">Bookmark posts from your feed and they will appear here.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/50">{entries.length} saved</span>
        <button onClick={clearAll} className="text-[10px] text-white/40 hover:text-red-400 transition-colors">
          Clear all
        </button>
      </div>
      <div className="space-y-2">
        {entries.map(entry => (
          <div
            key={entry.contentId}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors group"
          >
            <Bookmark className="w-4 h-4 text-amber-400/60 fill-amber-400/60 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80 truncate">{entry.title || `Post ${entry.contentId.slice(0, 8)}`}</p>
              <p className="text-[10px] text-white/40">{timeAgo(entry.savedAt)}</p>
            </div>
            {entry.creatorAddress && (
              <Link
                href={`/creator/${entry.creatorAddress}`}
                className="text-white/30 hover:text-violet-400 transition-colors shrink-0"
                aria-label="View creator"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
            <button
              onClick={() => remove(entry.contentId)}
              className="text-white/30 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
              aria-label="Remove from saved"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
