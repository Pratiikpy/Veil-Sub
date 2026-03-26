'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Heart, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { computeWalletHash } from '@/lib/utils'

interface Comment {
  id: string
  text: string
  created_at: string
  subscriber_hash: string
  parent_id?: string | null
  likes_count: number
}

interface SubscriberProfile {
  display_name: string | null
  avatar_url: string | null
}

/** Legacy shape stored in localStorage (pre-Supabase) */
interface LegacyComment {
  id: string
  text: string
  timestamp: number
  subscriberHash: string
  parentId?: string
  likes: number
}

interface PostCommentsProps {
  contentId: string
  isSubscribed: boolean
  walletAddress?: string | null
}

const MAX_CHARS = 280
const MAX_COMMENTS = 50
const STORAGE_PREFIX = 'veilsub_comments_'

/** SHA-256 hash of a string, returned as lowercase hex */
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Get or create a stable subscriber hash from wallet address or session */
async function getSubscriberHash(): Promise<string> {
  // Try to use wallet address for cross-device consistency
  const walletAddr = typeof window !== 'undefined'
    ? localStorage.getItem('aleo_wallet_address') || sessionStorage.getItem('aleo_wallet_address')
    : null

  if (walletAddr) {
    return sha256(walletAddr)
  }

  // Fallback: session-scoped random hash (localStorage cache for tab lifetime)
  const key = 'veilsub_session_hash'
  let hash = sessionStorage.getItem(key)
  if (!hash) {
    hash = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    sessionStorage.setItem(key, hash)
  }
  return hash
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'now'
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

function avatarColor(hash: string): string {
  const colors = ['bg-white/[0.08]', 'bg-blue-500/20', 'bg-emerald-500/20', 'bg-amber-500/20', 'bg-rose-500/20', 'bg-cyan-500/20']
  let n = 0
  for (let i = 0; i < hash.length; i++) n += hash.charCodeAt(i)
  return colors[n % colors.length]
}

/** Migrate legacy localStorage comments to the new shape */
function migrateLegacy(raw: string): Comment[] {
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr) || arr.length === 0) return []
    // Detect legacy shape: has `timestamp` number and `subscriberHash`
    if (typeof arr[0].timestamp === 'number') {
      return (arr as LegacyComment[]).map(c => ({
        id: c.id,
        text: c.text,
        created_at: new Date(c.timestamp).toISOString(),
        subscriber_hash: c.subscriberHash,
        parent_id: c.parentId || null,
        likes_count: c.likes || 0,
      }))
    }
    return arr as Comment[]
  } catch {
    return []
  }
}

export default function PostComments({ contentId, isSubscribed, walletAddress }: PostCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [serverAvailable, setServerAvailable] = useState(true)
  const hashRef = useRef<string | null>(null)
  const storageKey = STORAGE_PREFIX + contentId
  const [subProfiles, setSubProfiles] = useState<Record<string, SubscriberProfile>>({})
  const fetchedHashesRef = useRef<Set<string>>(new Set())

  // Resolve subscriber hash once
  useEffect(() => {
    getSubscriberHash().then(h => { hashRef.current = h })
  }, [])

  // Fetch subscriber profiles for commenters
  useEffect(() => {
    if (comments.length === 0) return
    const uniqueHashes = [...new Set(comments.map(c => c.subscriber_hash))].filter(h => !fetchedHashesRef.current.has(h))
    if (uniqueHashes.length === 0) return

    uniqueHashes.forEach(hash => {
      fetchedHashesRef.current.add(hash)
      fetch(`/api/subscriber-profile?subscriber_hash=${hash}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.profile && (data.profile.display_name || data.profile.avatar_url)) {
            setSubProfiles(prev => ({ ...prev, [hash]: data.profile }))
          }
        })
        .catch(() => { /* optional, ignore failures */ })
    })
  }, [comments])

  // Fetch comments: server first, localStorage fallback
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/social?type=comments&contentId=${encodeURIComponent(contentId)}`)
        if (!cancelled && res.ok) {
          const { comments: serverComments } = await res.json()
          if (serverComments && serverComments.length > 0) {
            setComments(serverComments)
            try { localStorage.setItem(storageKey, JSON.stringify(serverComments)) } catch { /* quota */ }
            return
          }
        }
        if (!cancelled && !res.ok) setServerAvailable(false)
      } catch {
        if (!cancelled) setServerAvailable(false)
      }

      // Fallback: localStorage
      if (!cancelled) {
        try {
          const raw = localStorage.getItem(storageKey)
          if (raw) setComments(migrateLegacy(raw))
        } catch { /* empty */ }
      }
    }

    load()
    return () => { cancelled = true }
  }, [contentId, storageKey])

  const saveLocal = useCallback((next: Comment[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* quota */ }
  }, [storageKey])

  const submit = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_CHARS) return

    const subHash = hashRef.current || crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

    // Optimistic local-only comment (shown immediately)
    const optimistic: Comment = {
      id: crypto.randomUUID(),
      text: trimmed,
      created_at: new Date().toISOString(),
      subscriber_hash: subHash,
      parent_id: replyTo || null,
      likes_count: 0,
    }
    const next = [optimistic, ...comments].slice(0, MAX_COMMENTS)
    setComments(next)
    saveLocal(next)
    setText('')
    setReplyTo(null)

    // Persist to server with retry logic
    if (serverAvailable) {
      // Build auth payload for wallet authentication
      let authPayload: { walletAddress?: string; walletHash?: string; timestamp?: number } = {}
      if (walletAddress) {
        try {
          const walletHash = await computeWalletHash(walletAddress)
          authPayload = { walletAddress, walletHash, timestamp: Date.now() }
        } catch { /* auth will be optional, server may still accept */ }
      }

      const payload = JSON.stringify({
        type: 'comment',
        contentId,
        text: trimmed,
        subscriberHash: subHash,
        parentId: replyTo || undefined,
        ...authPayload,
      })
      let retries = 3
      let succeeded = false
      while (retries > 0) {
        try {
          const res = await fetch('/api/social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
          })
          if (res.ok) {
            const { comment: saved } = await res.json()
            // Replace optimistic entry with server-assigned ID
            setComments(prev => {
              const updated = prev.map(c => c.id === optimistic.id ? { ...saved } : c)
              saveLocal(updated)
              return updated
            })
            succeeded = true
            break
          }
          retries--
        } catch {
          retries--
        }
      }
      // After all retries exhausted, notify user that comment is local-only
      if (!succeeded) {
        toast.error('Comment saved locally only — server unavailable')
      }
    }
  }, [text, comments, replyTo, contentId, serverAvailable, saveLocal, walletAddress])

  const toggleLike = useCallback(async (id: string) => {
    const likeKey = `veilsub_comment_like_${id}`
    const wasLiked = !!localStorage.getItem(likeKey)
    const delta = wasLiked ? -1 : 1

    // Optimistic update
    const next = comments.map(c => {
      if (c.id !== id) return c
      if (wasLiked) {
        localStorage.removeItem(likeKey)
        return { ...c, likes_count: Math.max(0, c.likes_count - 1) }
      }
      localStorage.setItem(likeKey, '1')
      return { ...c, likes_count: c.likes_count + 1 }
    })
    setComments(next)
    saveLocal(next)

    // Persist to server
    if (serverAvailable) {
      try {
        const res = await fetch('/api/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'comment_like', contentId, commentId: id, delta }),
        })
        if (!res.ok) {
          // Rollback optimistic update on server error
          const rollback = comments.map(c => {
            if (c.id !== id) return c
            if (wasLiked) {
              localStorage.setItem(likeKey, '1')
              return { ...c, likes_count: c.likes_count + 1 }
            }
            localStorage.removeItem(likeKey)
            return { ...c, likes_count: Math.max(0, c.likes_count - 1) }
          })
          setComments(rollback)
          saveLocal(rollback)
        }
      } catch {
        // Network error — rollback optimistic update
        const rollback = comments.map(c => {
          if (c.id !== id) return c
          if (wasLiked) {
            localStorage.setItem(likeKey, '1')
            return { ...c, likes_count: c.likes_count + 1 }
          }
          localStorage.removeItem(likeKey)
          return { ...c, likes_count: Math.max(0, c.likes_count - 1) }
        })
        setComments(rollback)
        saveLocal(rollback)
      }
    }
  }, [comments, contentId, serverAvailable, saveLocal])

  const topLevel = useMemo(() => comments.filter(c => !c.parent_id), [comments])
  const replies = useMemo(() => {
    const map: Record<string, Comment[]> = {}
    for (const c of comments) {
      if (c.parent_id) {
        if (!map[c.parent_id]) map[c.parent_id] = []
        map[c.parent_id].push(c)
      }
    }
    return map
  }, [comments])

  const visible = expanded ? topLevel : topLevel.slice(0, 3)

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.04]">
      {/* Comment count */}
      <div className="flex items-center gap-1.5 mb-3">
        <MessageCircle className="w-3.5 h-3.5 text-white/50" aria-hidden="true" />
        <span className="text-xs text-white/50">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
        {!serverAvailable && (
          <span className="text-[11px] text-amber-400/60 ml-1" title="Comments stored on this device only">(local)</span>
        )}
      </div>

      {/* Comments list */}
      {visible.map(c => {
        const sp = subProfiles[c.subscriber_hash]
        return (
        <div key={c.id} className="mb-2.5">
          <div className="flex gap-2.5">
            {sp?.avatar_url ? (
              <img
                src={sp.avatar_url}
                alt={sp.display_name || 'Subscriber'}
                className="w-7 h-7 rounded-full object-cover shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
              />
            ) : null}
            <div className={`w-7 h-7 rounded-full ${avatarColor(c.subscriber_hash)} flex items-center justify-center shrink-0 ${sp?.avatar_url ? 'hidden' : ''}`}>
              <span className="text-[11px] font-bold text-white/70">{sp?.display_name?.[0]?.toUpperCase() || 'S'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/70">{sp?.display_name || 'Subscriber'}</span>
                <span className="text-[11px] text-white/50">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed mt-0.5 break-words">{c.text}</p>
              <div className="flex items-center gap-3 mt-1">
                <button onClick={() => toggleLike(c.id)} className="flex items-center gap-1 text-white/50 hover:text-rose-400 transition-colors">
                  <Heart className={`w-3 h-3 ${localStorage.getItem(`veilsub_comment_like_${c.id}`) ? 'fill-rose-400 text-rose-400' : ''}`} />
                  {c.likes_count > 0 && <span className="text-[11px]">{c.likes_count}</span>}
                </button>
                {isSubscribed && (
                  <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="text-[11px] text-white/50 hover:text-white/60 transition-colors">
                    Reply
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Replies */}
          {replies[c.id]?.map(r => {
            const rp = subProfiles[r.subscriber_hash]
            return (
            <div key={r.id} className="flex gap-2.5 ml-9 mt-2">
              {rp?.avatar_url ? (
                <img
                  src={rp.avatar_url}
                  alt={rp.display_name || 'Subscriber'}
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
                />
              ) : null}
              <div className={`w-6 h-6 rounded-full ${avatarColor(r.subscriber_hash)} flex items-center justify-center shrink-0 ${rp?.avatar_url ? 'hidden' : ''}`}>
                <span className="text-[11px] font-bold text-white/60">{rp?.display_name?.[0]?.toUpperCase() || 'S'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-white/60">{rp?.display_name || 'Subscriber'}</span>
                  <span className="text-[11px] text-white/50">{timeAgo(r.created_at)}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed mt-0.5 break-words">{r.text}</p>
              </div>
            </div>
            )
          })}
          {/* Inline reply input */}
          {replyTo === c.id && isSubscribed && (
            <div className="ml-9 mt-2 flex gap-2">
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="Write a reply..."
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/30"
              />
              <button onClick={submit} disabled={!text.trim()} className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/70 text-xs font-medium hover:bg-white/12 disabled:opacity-40 transition-colors">
                Reply
              </button>
            </div>
          )}
        </div>
        )
      })}

      {/* Show more/less */}
      {topLevel.length > 3 && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/60 transition-colors mb-3">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : `View all ${topLevel.length} comments`}
        </button>
      )}

      {/* Input */}
      {isSubscribed ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={replyTo ? '' : text}
            onChange={e => { setReplyTo(null); setText(e.target.value.slice(0, MAX_CHARS)) }}
            onKeyDown={e => e.key === 'Enter' && !replyTo && submit()}
            placeholder="Add a comment..."
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
          />
          <button onClick={() => { setReplyTo(null); submit() }} disabled={!text.trim() || !!replyTo} className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/70 text-sm font-medium hover:bg-white/12 disabled:opacity-40 transition-colors">
            Post
          </button>
        </div>
      ) : (
        <p className="text-xs text-white/50 text-center py-2">Subscribe to join the conversation</p>
      )}
    </div>
  )
}
