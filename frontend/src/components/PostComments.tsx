'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Heart, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface Comment {
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
}

const MAX_CHARS = 280
const MAX_COMMENTS = 50
const STORAGE_PREFIX = 'veilsub_comments_'

function getSubscriberHash(): string {
  const key = 'veilsub_session_hash'
  let hash = sessionStorage.getItem(key)
  if (!hash) {
    hash = 'S' + Math.random().toString(36).slice(2, 8)
    sessionStorage.setItem(key, hash)
  }
  return hash
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'now'
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

function avatarColor(hash: string): string {
  const colors = ['bg-violet-500/20', 'bg-blue-500/20', 'bg-emerald-500/20', 'bg-amber-500/20', 'bg-rose-500/20', 'bg-cyan-500/20']
  let n = 0
  for (let i = 0; i < hash.length; i++) n += hash.charCodeAt(i)
  return colors[n % colors.length]
}

export default function PostComments({ contentId, isSubscribed }: PostCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const storageKey = STORAGE_PREFIX + contentId

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setComments(JSON.parse(raw))
    } catch { /* empty */ }
  }, [storageKey])

  const save = useCallback((next: Comment[]) => {
    setComments(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* quota */ }
  }, [storageKey])

  const submit = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_CHARS) return
    const comment: Comment = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: trimmed,
      timestamp: Date.now(),
      subscriberHash: getSubscriberHash(),
      parentId: replyTo || undefined,
      likes: 0,
    }
    const next = [comment, ...comments].slice(0, MAX_COMMENTS)
    save(next)
    setText('')
    setReplyTo(null)
  }, [text, comments, replyTo, save])

  const toggleLike = useCallback((id: string) => {
    const likeKey = `veilsub_comment_like_${id}`
    const liked = localStorage.getItem(likeKey)
    const next = comments.map(c => {
      if (c.id !== id) return c
      if (liked) {
        localStorage.removeItem(likeKey)
        return { ...c, likes: Math.max(0, c.likes - 1) }
      }
      localStorage.setItem(likeKey, '1')
      return { ...c, likes: c.likes + 1 }
    })
    save(next)
  }, [comments, save])

  const topLevel = useMemo(() => comments.filter(c => !c.parentId), [comments])
  const replies = useMemo(() => {
    const map: Record<string, Comment[]> = {}
    for (const c of comments) {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = []
        map[c.parentId].push(c)
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
      </div>

      {/* Comments list */}
      {visible.map(c => (
        <div key={c.id} className="mb-2.5">
          <div className="flex gap-2.5">
            <div className={`w-7 h-7 rounded-full ${avatarColor(c.subscriberHash)} flex items-center justify-center shrink-0`}>
              <span className="text-[10px] font-bold text-white/70">S</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/70">Subscriber</span>
                <span className="text-[10px] text-white/40">{timeAgo(c.timestamp)}</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed mt-0.5 break-words">{c.text}</p>
              <div className="flex items-center gap-3 mt-1">
                <button onClick={() => toggleLike(c.id)} className="flex items-center gap-1 text-white/40 hover:text-rose-400 transition-colors">
                  <Heart className={`w-3 h-3 ${localStorage.getItem(`veilsub_comment_like_${c.id}`) ? 'fill-rose-400 text-rose-400' : ''}`} />
                  {c.likes > 0 && <span className="text-[10px]">{c.likes}</span>}
                </button>
                {isSubscribed && (
                  <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="text-[10px] text-white/40 hover:text-violet-400 transition-colors">
                    Reply
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Replies */}
          {replies[c.id]?.map(r => (
            <div key={r.id} className="flex gap-2.5 ml-9 mt-2">
              <div className={`w-6 h-6 rounded-full ${avatarColor(r.subscriberHash)} flex items-center justify-center shrink-0`}>
                <span className="text-[10px] font-bold text-white/60">S</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-white/60">Subscriber</span>
                  <span className="text-[10px] text-white/35">{timeAgo(r.timestamp)}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed mt-0.5 break-words">{r.text}</p>
              </div>
            </div>
          ))}
          {/* Inline reply input */}
          {replyTo === c.id && isSubscribed && (
            <div className="ml-9 mt-2 flex gap-2">
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="Write a reply..."
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50"
              />
              <button onClick={submit} disabled={!text.trim()} className="px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 text-xs font-medium hover:bg-violet-500/25 disabled:opacity-40 transition-colors">
                Reply
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Show more/less */}
      {topLevel.length > 3 && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60 transition-colors mb-3">
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
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <button onClick={() => { setReplyTo(null); submit() }} disabled={!text.trim() || !!replyTo} className="px-4 py-2 rounded-lg bg-violet-500/15 text-violet-300 text-sm font-medium hover:bg-violet-500/25 disabled:opacity-40 transition-colors">
            Post
          </button>
        </div>
      ) : (
        <p className="text-xs text-white/40 text-center py-2">Subscribe to join the conversation</p>
      )}
    </div>
  )
}
