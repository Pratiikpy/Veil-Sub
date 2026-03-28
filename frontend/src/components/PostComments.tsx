'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, ChevronDown, ChevronUp, Shield, Send } from 'lucide-react'
import { toast } from 'sonner'
import { computeWalletHash, safeRandomUUID } from '@/lib/utils'

interface Comment {
  id: string
  text: string
  created_at: string
  subscriber_hash: string
  parent_id?: string | null
  likes_count: number
  author_type?: 'identified' | 'anonymous' | null
  anon_id?: string | null
  tier?: number | null
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
  /** The user's current subscription tier (1-20), used for anonymous commenting */
  userTier?: number | null
  /** The creator's wallet address (used for DM buttons on comments) */
  creatorAddress?: string | null
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
    hash = safeRandomUUID().replace(/-/g, '') + safeRandomUUID().replace(/-/g, '')
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

/** Tier-based colors for anonymous comment badges */
const ANON_TIER_STYLES: Record<number, { bg: string; text: string; border: string; avatarBg: string }> = {
  1: { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/20', avatarBg: 'bg-violet-500/20' },
  2: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20', avatarBg: 'bg-amber-500/20' },
  3: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20', avatarBg: 'bg-emerald-500/20' },
}

function getAnonTierStyle(tier: number) {
  return ANON_TIER_STYLES[tier] || ANON_TIER_STYLES[1]
}

function getAnonTierLabel(tier: number): string {
  const names: Record<number, string> = { 1: 'Supporter', 2: 'Premium', 3: 'VIP' }
  return `Tier ${tier} ${names[tier] || 'Subscriber'}`
}

/** Compute a per-post anonymous ID: SHA-256(wallet + contentId + salt) */
async function computeAnonId(walletAddress: string, contentId: string): Promise<string> {
  const salt = 'veilsub-anon-v1'
  const data = new TextEncoder().encode(walletAddress + contentId + salt)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
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

export default function PostComments({ contentId, isSubscribed, walletAddress, userTier, creatorAddress }: PostCommentsProps) {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [serverAvailable, setServerAvailable] = useState(true)
  const hashRef = useRef<string | null>(null)
  const storageKey = STORAGE_PREFIX + contentId
  const [subProfiles, setSubProfiles] = useState<Record<string, SubscriberProfile>>({})
  const fetchedHashesRef = useRef<Set<string>>(new Set())
  const submittingRef = useRef(false)
  // Anonymous commenting: default ON for subscribers with a tier
  const [anonymous, setAnonymous] = useState(true)
  const canCommentAnonymously = isSubscribed && !!userTier && userTier >= 1
  // Track liked comments in state instead of reading localStorage in render (A11Y-7)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())

  // Determine if the current user is the creator of this content
  const isContentCreator = !!walletAddress && !!creatorAddress && walletAddress === creatorAddress

  // Compute user's own anon_id for this post (used for peer DM thread calculation)
  const [myAnonId, setMyAnonId] = useState<string | null>(null)
  useEffect(() => {
    if (!walletAddress || !contentId) return
    let cancelled = false
    computeAnonId(walletAddress, contentId).then(id => {
      if (!cancelled) setMyAnonId(id)
    })
    return () => { cancelled = true }
  }, [walletAddress, contentId])

  /** Navigate to DM with a commenter (creator -> subscriber, or subscriber -> subscriber) */
  const handleDmCommenter = useCallback(async (comment: Comment) => {
    if (!creatorAddress || !comment.anon_id) return

    if (isContentCreator) {
      // Creator DMing a subscriber: use subscriber's anon_id as thread
      router.push(`/messages?creator=${creatorAddress}&thread=${comment.anon_id}`)
    } else if (walletAddress && myAnonId) {
      // Subscriber DMing another subscriber: compute peer thread_id
      if (comment.anon_id === myAnonId) {
        toast.info('This is your own comment')
        return
      }
      const sorted = [myAnonId, comment.anon_id].sort()
      const peerData = new TextEncoder().encode(sorted[0] + sorted[1])
      const buf = await crypto.subtle.digest('SHA-256', peerData)
      const peerThreadId = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
      router.push(`/messages?creator=${creatorAddress}&thread=${peerThreadId}&peer=true`)
    }
  }, [creatorAddress, isContentCreator, walletAddress, myAnonId, router])

  // Initialize likedComments from localStorage on mount
  useEffect(() => {
    if (comments.length === 0) return
    const liked = new Set<string>()
    for (const c of comments) {
      try {
        if (localStorage.getItem(`veilsub_comment_like_${c.id}`)) liked.add(c.id)
      } catch { /* ignore */ }
    }
    setLikedComments(liked)
  }, [comments])

  // Resolve subscriber hash once
  useEffect(() => {
    getSubscriberHash().then(h => { hashRef.current = h })
  }, [])

  // Fetch subscriber profiles for commenters (skip anonymous comments â€” they use anon_id, not real hashes)
  useEffect(() => {
    if (comments.length === 0) return
    const identifiedComments = comments.filter(c => c.author_type !== 'anonymous')
    const uniqueHashes = [...new Set(identifiedComments.map(c => c.subscriber_hash))].filter(h => !fetchedHashesRef.current.has(h))
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
    if (submittingRef.current) return

    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_CHARS) return

    // Set the lock AFTER validation so early returns don't leave it stuck
    submittingRef.current = true

    try {
    const subHash = hashRef.current || safeRandomUUID().replace(/-/g, '') + safeRandomUUID().replace(/-/g, '')

    // Determine if this is an anonymous comment
    const isAnonComment = canCommentAnonymously && anonymous && !!walletAddress && !!userTier
    let anonId: string | undefined
    if (isAnonComment) {
      anonId = await computeAnonId(walletAddress, contentId)
    }

    // Optimistic local-only comment (shown immediately)
    const optimistic: Comment = {
      id: safeRandomUUID(),
      text: trimmed,
      created_at: new Date().toISOString(),
      subscriber_hash: isAnonComment ? (anonId as string) : subHash,
      parent_id: replyTo || null,
      likes_count: 0,
      author_type: isAnonComment ? 'anonymous' : 'identified',
      anon_id: anonId || null,
      tier: isAnonComment ? userTier : null,
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
        ...(isAnonComment ? { anonymousTier: userTier, anonId } : {}),
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
        toast.error('Comment saved locally only â€” server unavailable')
      }
    }
    } finally {
      submittingRef.current = false
    }
  }, [text, comments, replyTo, contentId, serverAvailable, saveLocal, walletAddress, canCommentAnonymously, anonymous, userTier])

  const toggleLike = useCallback(async (id: string) => {
    const likeKey = `veilsub_comment_like_${id}`
    const wasLiked = likedComments.has(id)
    const delta = wasLiked ? -1 : 1

    // Optimistic update (state + localStorage)
    setLikedComments(prev => {
      const next = new Set(prev)
      if (wasLiked) next.delete(id); else next.add(id)
      return next
    })
    if (wasLiked) { try { localStorage.removeItem(likeKey) } catch { /* ignore */ } }
    else { try { localStorage.setItem(likeKey, '1') } catch { /* ignore */ } }

    const next = comments.map(c => {
      if (c.id !== id) return c
      return { ...c, likes_count: Math.max(0, c.likes_count + delta) }
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
          setLikedComments(prev => {
            const r = new Set(prev)
            if (wasLiked) r.add(id); else r.delete(id)
            return r
          })
          if (wasLiked) { try { localStorage.setItem(likeKey, '1') } catch { /* ignore */ } }
          else { try { localStorage.removeItem(likeKey) } catch { /* ignore */ } }
          const rollback = comments.map(c => {
            if (c.id !== id) return c
            return { ...c, likes_count: Math.max(0, c.likes_count - delta) }
          })
          setComments(rollback)
          saveLocal(rollback)
        }
      } catch {
        // Network error â€” rollback optimistic update
        setLikedComments(prev => {
          const r = new Set(prev)
          if (wasLiked) r.add(id); else r.delete(id)
          return r
        })
        if (wasLiked) { try { localStorage.setItem(likeKey, '1') } catch { /* ignore */ } }
        else { try { localStorage.removeItem(likeKey) } catch { /* ignore */ } }
        const rollback = comments.map(c => {
          if (c.id !== id) return c
          return { ...c, likes_count: Math.max(0, c.likes_count - delta) }
        })
        setComments(rollback)
        saveLocal(rollback)
      }
    }
  }, [comments, contentId, serverAvailable, saveLocal, likedComments])

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

  /** Whether a DM button should show for a given comment */
  const canDmComment = (c: Comment): boolean => {
    if (!creatorAddress || !c.anon_id || c.author_type !== 'anonymous') return false
    if (isContentCreator) return true
    if (isSubscribed && walletAddress && myAnonId && c.anon_id !== myAnonId) return true
    return false
  }

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
        const isAnon = c.author_type === 'anonymous' && c.tier
        const sp = isAnon ? null : subProfiles[c.subscriber_hash]
        const anonStyle = isAnon ? getAnonTierStyle(c.tier as number) : null
        const showDm = canDmComment(c)
        return (
        <div key={c.id} className="mb-2.5">
          <div className="flex gap-2.5">
            {isAnon ? (
              <div className={`w-7 h-7 rounded-full ${anonStyle!.avatarBg} flex items-center justify-center shrink-0`}>
                <Shield className={`w-3.5 h-3.5 ${anonStyle!.text}`} />
              </div>
            ) : (
              <>
                {sp?.avatar_url ? (
                  <img
                    src={sp.avatar_url}
                    alt={sp.display_name || 'Subscriber'}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
                  />
                ) : null}
                <div className={`w-7 h-7 rounded-full ${avatarColor(c.subscriber_hash)} flex items-center justify-center shrink-0 ${sp?.avatar_url ? 'hidden' : ''}`}>
                  <span className="text-[11px] font-bold text-white/70">{sp?.display_name?.[0]?.toUpperCase() || 'S'}</span>
                </div>
              </>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isAnon ? (
                  <>
                    <span className={`text-xs font-medium ${anonStyle!.text}`}>{getAnonTierLabel(c.tier as number)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${anonStyle!.bg} ${anonStyle!.text} border ${anonStyle!.border}`}>Anonymous</span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-white/70">{sp?.display_name || 'Subscriber'}</span>
                )}
                <span className="text-[11px] text-white/50">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed mt-0.5 break-words">{c.text}</p>
              <div className="flex items-center gap-3 mt-1">
                <button onClick={() => toggleLike(c.id)} aria-label="Like comment" className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 text-white/50 hover:text-rose-400 transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none rounded">
                  <Heart className={`w-3 h-3 ${likedComments.has(c.id) ? 'fill-rose-400 text-rose-400' : ''}`} />
                  {c.likes_count > 0 && <span className="text-[11px]">{c.likes_count}</span>}
                </button>
                {isSubscribed && (
                  <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} aria-label="Reply to comment" className="text-[11px] text-white/50 hover:text-white/60 transition-colors py-2 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none rounded">
                    Reply
                  </button>
                )}
                {showDm && (
                  <button
                    onClick={() => handleDmCommenter(c)}
                    aria-label="Direct message subscriber"
                    title="Direct message this subscriber"
                    className="flex items-center gap-1 text-white/40 hover:text-violet-400 transition-colors py-2 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none rounded"
                  >
                    <Send className="w-3 h-3" />
                    <span className="text-[11px]">DM</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Replies */}
          {replies[c.id]?.map(r => {
            const isReplyAnon = r.author_type === 'anonymous' && r.tier
            const rp = isReplyAnon ? null : subProfiles[r.subscriber_hash]
            const replyAnonStyle = isReplyAnon ? getAnonTierStyle(r.tier as number) : null
            return (
            <div key={r.id} className="flex gap-2.5 ml-9 mt-2">
              {isReplyAnon ? (
                <div className={`w-6 h-6 rounded-full ${replyAnonStyle!.avatarBg} flex items-center justify-center shrink-0`}>
                  <Shield className={`w-3 h-3 ${replyAnonStyle!.text}`} />
                </div>
              ) : (
                <>
                  {rp?.avatar_url ? (
                    <img
                      src={rp.avatar_url}
                      alt={rp.display_name || 'Subscriber'}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
                    />
                  ) : null}
                  <div className={`w-6 h-6 rounded-full ${avatarColor(r.subscriber_hash)} flex items-center justify-center shrink-0 ${rp?.avatar_url ? 'hidden' : ''}`}>
                    <span className="text-[11px] font-bold text-white/60">{rp?.display_name?.[0]?.toUpperCase() || 'S'}</span>
                  </div>
                </>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isReplyAnon ? (
                    <>
                      <span className={`text-[11px] font-medium ${replyAnonStyle!.text}`}>{getAnonTierLabel(r.tier as number)}</span>
                      <span className={`text-[9px] px-1 py-px rounded-full ${replyAnonStyle!.bg} ${replyAnonStyle!.text} border ${replyAnonStyle!.border}`}>Anon</span>
                    </>
                  ) : (
                    <span className="text-[11px] font-medium text-white/60">{rp?.display_name || 'Subscriber'}</span>
                  )}
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
              <button onClick={submit} disabled={!text.trim()} className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/70 text-xs font-medium hover:bg-white/[0.12] disabled:opacity-40 transition-colors">
                Reply
              </button>
            </div>
          )}
        </div>
        )
      })}

      {/* Show more/less */}
      {topLevel.length > 3 && (
        <button onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Show fewer comments' : 'Show more comments'} className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/60 transition-colors mb-3 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none rounded">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : `View all ${topLevel.length} comments`}
        </button>
      )}

      {/* Anonymous toggle + Input */}
      {isSubscribed ? (
        <div className="space-y-2">
          {/* Anonymous toggle â€” only shown to subscribers with a tier */}
          {canCommentAnonymously && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-white/50" aria-hidden="true" />
                <span className="text-xs text-white/60">Comment anonymously</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={anonymous}
                aria-label="Comment anonymously"
                onClick={() => setAnonymous(prev => !prev)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${anonymous ? 'bg-violet-500/60' : 'bg-white/[0.08]'}`}
              >
                <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${anonymous ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          )}
          {/* Preview of anonymous identity */}
          {canCommentAnonymously && anonymous && userTier && (
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${getAnonTierStyle(userTier).bg} border ${getAnonTierStyle(userTier).border}`}>
              <Shield className={`w-3 h-3 ${getAnonTierStyle(userTier).text}`} aria-hidden="true" />
              <span className={`text-[11px] ${getAnonTierStyle(userTier).text}`}>
                You&apos;ll appear as: <strong>{getAnonTierLabel(userTier)}</strong>
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={e => { setReplyTo(null); setText(e.target.value.slice(0, MAX_CHARS)) }}
              onKeyDown={e => e.key === 'Enter' && !replyTo && submit()}
              placeholder={canCommentAnonymously && anonymous ? 'Add an anonymous comment...' : 'Add a comment...'}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
            />
            <button onClick={() => { setReplyTo(null); submit() }} disabled={!text.trim() || !!replyTo} aria-label="Post comment" className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/70 text-sm font-medium hover:bg-white/[0.12] disabled:opacity-40 transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none">
              Post
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/50 text-center py-2">Subscribe to join the conversation</p>
      )}
    </div>
  )
}
