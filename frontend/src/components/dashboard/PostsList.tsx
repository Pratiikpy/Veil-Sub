'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { m } from 'framer-motion'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { FileText, Trash2, AlertTriangle, Search, X, Clock, Edit3, Send, Tag, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import Fuse from 'fuse.js'
import { useContentFeed } from '@/hooks/useContentFeed'
import { useCreatorTiers } from '@/hooks/useCreatorTiers'
import { getContentHash, DEPLOYED_PROGRAM_ID, TAG_COLORS } from '@/lib/config'
import { estimateReadingTime } from '@/lib/utils'
import type { ContentPost, PostStatus } from '@/types'

interface PostsListProps {
  address: string
  onEditPost?: (post: ContentPost) => void
}

type TabKey = 'published' | 'drafts' | 'scheduled'

export default function PostsList({ address, onEditPost }: PostsListProps) {
  const { signMessage } = useWallet()
  const { getPostsForCreator, editPost, deletePost, error: feedError, clearError } = useContentFeed()
  const { tiers: onChainTiers } = useCreatorTiers(address)

  const [allPosts, setAllPosts] = useState<ContentPost[]>([])
  const [drafts, setDrafts] = useState<ContentPost[]>([])
  const [scheduled, setScheduled] = useState<ContentPost[]>([])
  const [postsLoaded, setPostsLoaded] = useState(false)
  const [disputes, setDisputes] = useState<Record<string, number>>({})
  const [activeTab, setActiveTab] = useState<TabKey>('published')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const TIER_COLORS = [
    'text-green-300 bg-green-500/10 border-green-500/20',
    'text-blue-300 bg-blue-500/10 border-blue-500/20',
    'text-violet-300 bg-violet-500/10 border-violet-500/20',
    'text-pink-300 bg-pink-500/10 border-pink-500/20',
    'text-amber-300 bg-amber-500/10 border-amber-500/20',
  ]

  const getTierLabel = (tierId: number) => {
    const custom = onChainTiers[tierId]
    const name = custom?.name || (tierId === 1 ? 'Supporter' : `Tier ${tierId}`)
    // Ensure non-negative index for tier colors (tierId 0 maps to index 0)
    const color = TIER_COLORS[Math.max(0, tierId - 1) % TIER_COLORS.length]
    return { name, color }
  }

  const getTagColor = (tag: string): string => {
    return TAG_COLORS[tag] || 'text-violet-300 bg-violet-500/10 border-violet-500/20'
  }

  const fetchAllPosts = useCallback(async () => {
    try {
      // Fetch all post statuses in parallel
      const [published, draftPosts, scheduledPosts] = await Promise.all([
        getPostsForCreator(address),
        getPostsForCreator(address, 'draft'),
        getPostsForCreator(address, 'scheduled'),
      ])
      setAllPosts(published.filter((p) => p.contentId !== 'seed'))
      setDrafts(draftPosts.filter((p) => p.contentId !== 'seed'))
      setScheduled(scheduledPosts.filter((p) => p.contentId !== 'seed'))
    } catch {
      // Content feed has its own fallback
    }
    setPostsLoaded(true)
  }, [address, getPostsForCreator])

  useEffect(() => { fetchAllPosts() }, [fetchAllPosts])

  // Fetch on-chain dispute counts for published posts with known content hashes
  useEffect(() => {
    if (allPosts.length === 0) return
    const fetchDisputes = async () => {
      const results: Record<string, number> = {}
      await Promise.all(
        allPosts.map(async (post) => {
          if (!post.contentId || post.contentId === 'seed') return
          const hashedId = post.hashedContentId || getContentHash(post.contentId)
          if (!hashedId) return
          try {
            const res = await fetch(`/api/aleo/program/${DEPLOYED_PROGRAM_ID}/mapping/content_disputes/${hashedId}`)
            if (!res.ok) return
            const data = await res.json()
            if (data && data !== 'null') {
              const count = parseInt(String(data).replace(/"/g, '').replace('u64', ''), 10)
              if (Number.isFinite(count) && count > 0) results[post.contentId] = count
            }
          } catch { /* non-critical */ }
        })
      )
      setDisputes(results)
    }
    fetchDisputes()
  }, [allPosts])

  // Collect all unique tags across all posts for the filter dropdown
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const post of [...allPosts, ...drafts, ...scheduled]) {
      if (post.tags) post.tags.forEach(t => tagSet.add(t))
    }
    return Array.from(tagSet).sort()
  }, [allPosts, drafts, scheduled])

  // Get the posts for the active tab
  const currentTabPosts = useMemo(() => {
    if (activeTab === 'drafts') return drafts
    if (activeTab === 'scheduled') return scheduled
    return allPosts
  }, [activeTab, allPosts, drafts, scheduled])

  // Apply tag filter
  const tagFilteredPosts = useMemo(() => {
    if (!selectedTag) return currentTabPosts
    return currentTabPosts.filter(p => p.tags?.includes(selectedTag))
  }, [currentTabPosts, selectedTag])

  // Apply Fuse.js search
  const fuse = useMemo(() => {
    return new Fuse(tagFilteredPosts, {
      keys: ['title', 'body', 'preview'],
      threshold: 0.4,
      ignoreLocation: true,
      includeMatches: true,
    })
  }, [tagFilteredPosts])

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return tagFilteredPosts
    return fuse.search(searchQuery.trim()).map(result => result.item)
  }, [fuse, searchQuery, tagFilteredPosts])

  const getWrappedSign = useCallback(() => {
    return signMessage
      ? async (msg: Uint8Array) => {
          const result = await signMessage(msg)
          if (!result) throw new Error('Signing cancelled')
          return result
        }
      : null
  }, [signMessage])

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Delete this post? This action cannot be undone.')) return
    const wrappedSign = getWrappedSign()
    const ok = await deletePost(address, postId, wrappedSign)
    if (ok) {
      setAllPosts(prev => prev.filter(p => p.id !== postId))
      setDrafts(prev => prev.filter(p => p.id !== postId))
      setScheduled(prev => prev.filter(p => p.id !== postId))
      toast.success('Post deleted')
    } else {
      const msg = feedError?.message || 'Post couldn\u2019t be deleted. Try again.'
      toast.error(msg)
      if (feedError) clearError()
    }
  }

  const handlePublishNow = async (post: ContentPost) => {
    const wrappedSign = getWrappedSign()
    const updated = await editPost(address, post.id, { status: 'published' }, wrappedSign)
    if (updated) {
      toast.success('Post published!')
      fetchAllPosts()
    } else {
      toast.error(feedError?.message || 'Post couldn\u2019t be published')
      if (feedError) clearError()
    }
  }

  const formatScheduledTime = (scheduledAt?: string) => {
    if (!scheduledAt) return ''
    const date = new Date(scheduledAt)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    if (diffMs <= 0) return 'Publishing soon...'
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (diffDays > 0) return `${dateStr} at ${timeStr} (in ${diffDays}d)`
    if (diffHours > 0) return `${dateStr} at ${timeStr} (in ${diffHours}h)`
    const diffMin = Math.max(1, Math.floor(diffMs / (1000 * 60)))
    return `${dateStr} at ${timeStr} (in ${diffMin}m)`
  }

  if (!postsLoaded) {
    return (
      <div className="p-6 rounded-xl bg-surface-1 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-white/[0.05] animate-pulse" />
          <div className="h-5 w-24 rounded bg-white/[0.05] animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05] animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-white/[0.05]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded bg-white/[0.05] w-3/4" />
                  <div className="h-3 rounded bg-white/[0.04] w-1/2" />
                </div>
                <div className="w-16 h-5 rounded-full bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'published', label: 'Published', count: allPosts.length },
    { key: 'drafts', label: 'Drafts', count: drafts.length },
    { key: 'scheduled', label: 'Scheduled', count: scheduled.length },
  ]

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24 }}
      className="p-6 rounded-xl bg-surface-1 border border-border"
    >
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-violet-400" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Your Posts</h2>
        <span className="text-xs text-white/60 ml-auto">
          {allPosts.length + drafts.length + scheduled.length} total
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/[0.03] border border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchQuery(''); setSelectedTag(null) }}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-white/60 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === tab.key ? 'bg-violet-500/20 text-violet-300' : 'bg-white/[0.06] text-white/50'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search and tag filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-400/50 transition-all text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {allTags.length > 0 && (
          <select
            value={selectedTag || ''}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="px-3 py-2 rounded-xl bg-white/[0.05] border border-border text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-400/50 transition-all [color-scheme:dark]"
          >
            <option value="">All tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        )}
      </div>

      {/* Posts list */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-8">
          {searchQuery ? (
            <>
              <Search className="w-6 h-6 text-white/20 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-white/50">No posts match &ldquo;{searchQuery}&rdquo;</p>
              <button
                onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }}
                className="mt-2 text-xs text-violet-300 hover:text-violet-200 transition-colors"
              >
                Clear search
              </button>
            </>
          ) : activeTab === 'drafts' ? (
            <>
              <Edit3 className="w-6 h-6 text-white/20 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-white/50 mb-1">No drafts saved</p>
              <p className="text-xs text-white/40">Start writing and save as draft to pick up where you left off.</p>
            </>
          ) : activeTab === 'scheduled' ? (
            <>
              <CalendarClock className="w-6 h-6 text-white/20 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-white/50 mb-1">No scheduled posts</p>
              <p className="text-xs text-white/40">Use the schedule feature when creating a post to queue it for later.</p>
            </>
          ) : (
            <>
              <FileText className="w-6 h-6 text-white/20 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-white/50 mb-1">Your audience is waiting</p>
              <p className="text-xs text-white/40">Write your first exclusive post. Subscribers verify access without revealing their identity.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPosts.map((post) => {
            const tier = getTierLabel(post.minTier)
            const readingTime = post.body ? estimateReadingTime(post.body) : null
            return (
              <div
                key={post.id}
                className="flex items-start gap-4 p-4 rounded-lg bg-white/[0.02] border border-border group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white truncate">{post.title}</p>
                    {/* Status badge */}
                    {activeTab === 'drafts' && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20">
                        Draft
                      </span>
                    )}
                    {activeTab === 'scheduled' && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20">
                        <CalendarClock className="w-3 h-3" aria-hidden="true" />
                        Scheduled
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs border ${tier.color}`}>
                      {tier.name}
                    </span>
                    {post.createdAt && (
                      <span className="text-xs text-white/60">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    )}
                    {readingTime && (
                      <span className="text-xs text-white/50">{readingTime}</span>
                    )}
                    {post.contentId && post.contentId !== 'seed' && activeTab === 'published' && (
                      <span className="text-xs text-green-500">on-chain</span>
                    )}
                    {post.contentId && disputes[post.contentId] > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        {disputes[post.contentId]} {disputes[post.contentId] === 1 ? 'dispute' : 'disputes'}
                      </span>
                    )}
                  </div>
                  {/* Scheduled time display */}
                  {activeTab === 'scheduled' && post.scheduledAt && (
                    <p className="mt-1 text-xs text-amber-300/80 flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      Publishes {formatScheduledTime(post.scheduledAt)}
                    </p>
                  )}
                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {post.tags.map(tag => (
                        <span
                          key={tag}
                          className={`px-2 py-0.5 rounded-full text-[10px] border ${getTagColor(tag)} cursor-pointer hover:opacity-80 transition-opacity`}
                          onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Edit button (for drafts and scheduled) */}
                  {(activeTab === 'drafts' || activeTab === 'scheduled') && onEditPost && (
                    <button
                      onClick={() => onEditPost(post)}
                      className="p-2 rounded-lg hover:bg-violet-500/10 text-white/60 hover:text-violet-400 active:scale-[0.9] transition-all duration-300"
                      aria-label="Edit post"
                    >
                      <Edit3 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                  {/* Publish Now button (for drafts and scheduled) */}
                  {(activeTab === 'drafts' || activeTab === 'scheduled') && (
                    <button
                      onClick={() => handlePublishNow(post)}
                      className="p-2 rounded-lg hover:bg-green-500/10 text-white/60 hover:text-green-400 active:scale-[0.9] transition-all duration-300"
                      aria-label="Publish now"
                    >
                      <Send className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-400 active:scale-[0.9] transition-all duration-300"
                    aria-label="Delete post"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </m.div>
  )
}
