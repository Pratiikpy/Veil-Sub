'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Heart, MessageCircle, Share2, Bookmark, BookOpen, Coins } from 'lucide-react'
import { toast } from 'sonner'

interface PostInteractionsProps {
  contentId: string
  initialLikes?: number
  onTip?: () => void
  onShare?: () => void
  readingTime?: string
  commentCount?: number
  onCommentClick?: () => void
  creatorAddress?: string
  postTitle?: string
}

interface SavedEntry {
  contentId: string
  creatorAddress: string
  title: string
  savedAt: number
}

const LIKES_PREFIX = 'veilsub_likes_'
const LIKED_PREFIX = 'veilsub_liked_'
const SAVED_KEY = 'veilsub_saved_posts'

function getSaved(): SavedEntry[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')
  } catch { return [] }
}

export default function PostInteractions({
  contentId,
  initialLikes = 0,
  onTip,
  onShare,
  readingTime,
  commentCount = 0,
  onCommentClick,
  creatorAddress = '',
  postTitle = '',
}: PostInteractionsProps) {
  const [likes, setLikes] = useState(() => {
    try { return Number(localStorage.getItem(LIKES_PREFIX + contentId)) || initialLikes } catch { return initialLikes }
  })
  const [liked, setLiked] = useState(() => {
    try { return localStorage.getItem(LIKED_PREFIX + contentId) === '1' } catch { return false }
  })
  const [saved, setSaved] = useState(() => {
    return getSaved().some(e => e.contentId === contentId)
  })
  const [showBurst, setShowBurst] = useState(false)
  const [heartBounce, setHeartBounce] = useState(false)
  const burstTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const bounceTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const lastTap = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const serverAvailable = useRef(true)

  // Cleanup timers
  useEffect(() => () => {
    if (burstTimer.current) clearTimeout(burstTimer.current)
    if (bounceTimer.current) clearTimeout(bounceTimer.current)
  }, [])

  // Fetch server-side heart count on mount
  useEffect(() => {
    let cancelled = false

    async function fetchHeartCount() {
      try {
        const res = await fetch(`/api/social?type=reactions&contentId=${encodeURIComponent(contentId)}`)
        if (!cancelled && res.ok) {
          const { counts } = await res.json()
          if (counts?.heart !== undefined && counts.heart > 0) {
            setLikes(counts.heart)
            try { localStorage.setItem(LIKES_PREFIX + contentId, String(counts.heart)) } catch { /* quota */ }
          }
        } else if (!cancelled) {
          serverAvailable.current = false
        }
      } catch {
        if (!cancelled) serverAvailable.current = false
      }
    }

    fetchHeartCount()
    return () => { cancelled = true }
  }, [contentId])

  const triggerLike = useCallback(async () => {
    const wasLiked = liked
    const prevLikes = likes

    if (wasLiked) {
      // Unlike
      const next = Math.max(0, likes - 1)
      setLikes(next)
      setLiked(false)
      try {
        localStorage.setItem(LIKES_PREFIX + contentId, String(next))
        localStorage.removeItem(LIKED_PREFIX + contentId)
      } catch { /* quota */ }

      // Persist decrement to server
      if (serverAvailable.current) {
        try {
          const res = await fetch('/api/social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'reaction', contentId, reactionType: 'heart', delta: -1 }),
          })
          if (!res.ok) {
            // Rollback on server error
            setLikes(prevLikes)
            setLiked(true)
            try {
              localStorage.setItem(LIKES_PREFIX + contentId, String(prevLikes))
              localStorage.setItem(LIKED_PREFIX + contentId, '1')
            } catch { /* quota */ }
          }
        } catch {
          // Rollback on network error
          setLikes(prevLikes)
          setLiked(true)
          try {
            localStorage.setItem(LIKES_PREFIX + contentId, String(prevLikes))
            localStorage.setItem(LIKED_PREFIX + contentId, '1')
          } catch { /* quota */ }
          serverAvailable.current = false
        }
      }
      return
    }

    const next = likes + 1
    setLikes(next)
    setLiked(true)
    setShowBurst(true)
    setHeartBounce(true)
    if (burstTimer.current) clearTimeout(burstTimer.current)
    burstTimer.current = setTimeout(() => setShowBurst(false), 800)
    if (bounceTimer.current) clearTimeout(bounceTimer.current)
    bounceTimer.current = setTimeout(() => setHeartBounce(false), 400)
    try {
      localStorage.setItem(LIKES_PREFIX + contentId, String(next))
      localStorage.setItem(LIKED_PREFIX + contentId, '1')
    } catch { /* quota */ }

    // Persist increment to server
    if (serverAvailable.current) {
      try {
        const res = await fetch('/api/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'reaction', contentId, reactionType: 'heart', delta: 1 }),
        })
        if (!res.ok) {
          // Rollback on server error
          setLikes(prevLikes)
          setLiked(false)
          try {
            localStorage.setItem(LIKES_PREFIX + contentId, String(prevLikes))
            localStorage.removeItem(LIKED_PREFIX + contentId)
          } catch { /* quota */ }
          toast.error('Like not saved — please try again')
        }
      } catch {
        // Rollback on network error
        setLikes(prevLikes)
        setLiked(false)
        try {
          localStorage.setItem(LIKES_PREFIX + contentId, String(prevLikes))
          localStorage.removeItem(LIKED_PREFIX + contentId)
        } catch { /* quota */ }
        serverAvailable.current = false
      }
    }
  }, [liked, likes, contentId])

  const handleDoubleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTap.current < 400) {
      if (!liked) triggerLike()
      else {
        // Already liked, still show burst animation
        setShowBurst(true)
        if (burstTimer.current) clearTimeout(burstTimer.current)
        burstTimer.current = setTimeout(() => setShowBurst(false), 800)
      }
    }
    lastTap.current = now
  }, [liked, triggerLike])

  const toggleSave = useCallback(() => {
    const entries = getSaved()
    if (saved) {
      const next = entries.filter(e => e.contentId !== contentId)
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      setSaved(false)
      toast.success('Removed from saved')
    } else {
      const entry: SavedEntry = { contentId, creatorAddress, title: postTitle, savedAt: Date.now() }
      const next = [entry, ...entries].slice(0, 200)
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      setSaved(true)
      toast.success('Saved to bookmarks')
    }
  }, [saved, contentId])

  const handleShare = useCallback(() => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied to clipboard'),
      () => toast.error('Could not copy link')
    )
    onShare?.()
  }, [onShare])

  return (
    <div ref={containerRef} onClick={handleDoubleTap} className="relative">
      {/* Heart burst overlay */}
      {showBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" aria-hidden="true">
          <Heart className="w-16 h-16 fill-rose-500 text-rose-500 heart-burst" />
        </div>
      )}

      {/* Interaction bar */}
      <div className="flex items-center gap-4 py-2">
        {/* Like */}
        <button
          onClick={(e) => { e.stopPropagation(); triggerLike() }}
          className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-rose-400' : 'text-white/50 hover:text-rose-400'}`}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <Heart
            className={`w-4 h-4 ${liked ? 'fill-current' : ''} transition-transform`}
            style={{
              transform: heartBounce ? 'scale(1.3)' : 'scale(1)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              color: liked ? '#ef4444' : undefined,
            }}
          />
          {likes > 0 && <span className="text-xs">{likes}</span>}
        </button>

        {/* Comments */}
        <button
          onClick={(e) => { e.stopPropagation(); onCommentClick?.() }}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/60 transition-colors"
          aria-label="Comments"
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
        </button>

        {/* Share */}
        <button
          onClick={(e) => { e.stopPropagation(); handleShare() }}
          className="text-white/50 hover:text-white/80 transition-colors"
          aria-label="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Save/Bookmark — stays localStorage only for privacy */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleSave() }}
          className={`transition-colors ${saved ? 'text-amber-400' : 'text-white/50 hover:text-amber-400'}`}
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
        </button>

        {/* Tip */}
        {onTip && (
          <button
            onClick={(e) => { e.stopPropagation(); onTip() }}
            className="text-white/50 hover:text-emerald-400 transition-colors"
            aria-label="Tip creator"
          >
            <Coins className="w-4 h-4" />
          </button>
        )}

        {/* Reading time */}
        {readingTime && (
          <span className="flex items-center gap-1 text-xs text-white/40 ml-auto">
            <BookOpen className="w-3 h-3" aria-hidden="true" />
            {readingTime}
          </span>
        )}
      </div>
    </div>
  )
}
