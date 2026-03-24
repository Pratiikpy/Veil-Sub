'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Lock, Filter, ChevronDown, Clock, ArrowUp, ArrowDown, RefreshCw, FileText, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useContentFeed } from '@/hooks/useContentFeed'
import type { ContentPost, AccessPass } from '@/types'

type SortMode = 'newest' | 'oldest'

interface ContentVaultProps {
  creatorAddress: string
  userPasses: AccessPass[]
  connected: boolean
  walletAddress?: string | null
  blockHeight?: number | null
  viewMode: 'feed' | 'grid'
  onViewModeChange: (mode: 'feed' | 'grid') => void
}

/** Check whether user has access to a gated post */
function hasAccess(post: ContentPost, passes: AccessPass[], blockHeight: number | null): boolean {
  if (!post.gated && post.minTier === 0) return true
  if (!blockHeight) return false
  return passes.some(
    (p) => p.tier >= (post.minTier ?? 1) && p.expiresAt > blockHeight
  )
}

/** Generate a deterministic gradient from a string for placeholder thumbnails */
function postGradient(id: string): string {
  const hash = id.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
  const hue1 = 220 + Math.abs(hash % 80)
  const hue2 = (hue1 + 40 + Math.abs((hash >> 8) % 60)) % 360
  return `linear-gradient(135deg, hsl(${hue1}, 40%, 18%), hsl(${hue2}, 35%, 12%))`
}

/**
 * Content Vault -- organized media library / catalog grid view for a creator's content.
 * Self-contained: fetches posts, renders thumbnail grid with lock overlays,
 * sort/filter controls, and view mode toggle.
 */
export default function ContentVault({
  creatorAddress,
  userPasses,
  connected,
  blockHeight,
  viewMode,
  onViewModeChange,
}: ContentVaultProps) {
  const { getPostsForCreator, loading: feedLoading } = useContentFeed()
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const fetchedRef = useRef(false)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const result = await getPostsForCreator(creatorAddress)
      setPosts(result)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [creatorAddress, getPostsForCreator])

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchPosts()
    }
  }, [fetchPosts])

  // Collect unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    posts.forEach((p) => p.tags?.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [posts])

  // Filter and sort
  const displayPosts = useMemo(() => {
    let filtered = posts
    if (filterTag) {
      filtered = filtered.filter((p) => p.tags?.includes(filterTag))
    }
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortMode === 'newest' ? dateB - dateA : dateA - dateB
    })
    return sorted
  }, [posts, sortMode, filterTag])

  return (
    <div>
      {/* Header */}
      <h2 className="text-lg font-semibold text-white mb-2">Content Vault</h2>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/60">
          Browse all content as a catalog. {posts.length} post{posts.length !== 1 ? 's' : ''} total.
        </p>
        <div className="flex items-center rounded-lg border border-border overflow-hidden ml-3 shrink-0">
          <button
            onClick={() => onViewModeChange('feed')}
            className={`p-2 transition-colors ${viewMode === 'feed' ? 'bg-white/[0.06] text-white/70' : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'}`}
            aria-label="List view"
            title="List view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-white/[0.06] text-white/70' : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'}`}
            aria-label="Grid view"
            title="Grid view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </button>
        </div>
      </div>

      {/* Toolbar: Sort + Filter */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setSortMode((m) => (m === 'newest' ? 'oldest' : 'newest'))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-white/60 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
          title={`Sorted by ${sortMode}`}
        >
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          {sortMode === 'newest' ? 'Newest' : 'Oldest'}
          {sortMode === 'newest' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
        </button>

        {allTags.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowFilters((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors ${
                filterTag
                  ? 'border-white/15 bg-white/[0.04] text-white/70'
                  : 'border-border text-white/60 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" aria-hidden="true" />
              {filterTag ?? 'Filter'}
              <ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showFilters && (
                <m.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 z-20 min-w-[140px] py-1 rounded-xl bg-[#1a1a24] border border-border shadow-2xl"
                >
                  <button
                    onClick={() => { setFilterTag(null); setShowFilters(false) }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${!filterTag ? 'text-white/70 bg-white/[0.04]' : 'text-white/60 hover:bg-white/[0.04]'}`}
                  >
                    All posts
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => { setFilterTag(tag); setShowFilters(false) }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${filterTag === tag ? 'text-white/70 bg-white/[0.04]' : 'text-white/60 hover:bg-white/[0.04]'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-white/60 animate-spin" aria-label="Loading content" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
          <p className="text-sm text-red-400 mb-4">Could not load content. Check your connection and retry.</p>
          <button
            onClick={fetchPosts}
            className="px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && displayPosts.length > 0 && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {displayPosts.map((post, i) => {
            const locked = !hasAccess(post, userPasses, blockHeight ?? null)
            return (
              <m.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.5) }}
              >
                <Link
                  href={`/creator/${creatorAddress}`}
                  className="relative aspect-square rounded-xl overflow-hidden border border-border group block hover:border-white/15 transition-all"
                >
                  {/* Thumbnail */}
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={post.title ?? 'Post thumbnail'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: postGradient(post.id) }}
                    >
                      <span className="text-white/20 text-2xl font-bold">
                        {(post.title ?? 'P')[0].toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Lock overlay */}
                  {locked && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                      <Lock className="w-6 h-6 text-white/60" aria-hidden="true" />
                    </div>
                  )}

                  {/* Bottom info bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                    <p className="text-[11px] font-medium text-white truncate">
                      {post.title ?? 'Untitled'}
                    </p>
                    <p className="text-[10px] text-white/50">
                      {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  {/* Tier badge */}
                  {post.gated && post.minTier && post.minTier > 1 && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-white/60 text-[10px] font-medium text-white">
                      Tier {post.minTier}+
                    </div>
                  )}
                </Link>
              </m.div>
            )
          })}
        </m.div>
      )}

      {/* Empty state */}
      {!loading && !error && displayPosts.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 text-white/20 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-white/40">
            {filterTag ? `No posts with tag "${filterTag}"` : 'No content yet'}
          </p>
        </div>
      )}
    </div>
  )
}
