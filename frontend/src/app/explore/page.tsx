'use client'

import { useState, useEffect } from 'react'
import { m } from 'framer-motion'
import Link from 'next/link'
import {
  Search,
  Shield,
  Users,
  Coins,
  ArrowRight,
  AlertTriangle,
  Star,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import PageTransition from '@/components/PageTransition'
import AddressAvatar from '@/components/ui/AddressAvatar'
import { shortenAddress, isValidAleoAddress, formatCredits } from '@/lib/utils'
import { FEATURED_CREATORS, DEPLOYED_PROGRAM_ID } from '@/lib/config'
import { useCreatorStats } from '@/hooks/useCreatorStats'

const FEATURED_ADDRESSES = new Set(FEATURED_CREATORS.map(c => c.address))

interface Creator {
  address: string
  display_name: string | null
  bio: string | null
  created_at: string
}

function CreatorCard({ creator, index }: { creator: Creator; index: number }) {
  const isFeatured = FEATURED_ADDRESSES.has(creator.address)
  const { fetchCreatorStats } = useCreatorStats()
  const [stats, setStats] = useState<{ subscriberCount: number; tierPrice: number | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCreatorStats(creator.address).then((s) => {
      if (!cancelled) setStats(s)
    })
    return () => { cancelled = true }
  }, [creator.address, fetchCreatorStats])

  return (
    <m.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/creator/${creator.address}`}
        className="block p-5 rounded-xl glass hover:-translate-y-0.5 hover:border-violet-500/[0.2] hover:shadow-accent-lg transition-all duration-300 group"
      >
        <div className="flex items-center gap-3 mb-3">
          <AddressAvatar address={creator.address} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-white font-medium text-sm truncate">
                {creator.display_name || shortenAddress(creator.address)}
              </p>
              {isFeatured && (
                <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-400 font-medium">
                  <Star className="w-2.5 h-2.5" />
                  Featured
                </span>
              )}
            </div>
            {creator.display_name && (
              <p className="text-xs text-subtle font-mono truncate">
                {shortenAddress(creator.address)}
              </p>
            )}
          </div>
        </div>
        {creator.bio && (
          <p className="text-sm text-muted mb-3 line-clamp-2">
            {creator.bio}
          </p>
        )}
        {/* On-chain stats */}
        {stats && stats.tierPrice !== null && (
          <div className="flex gap-4 text-xs text-subtle mb-3">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {stats.subscriberCount} subscriber{stats.subscriberCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3" />
              from {formatCredits(stats.tierPrice)} ALEO
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-subtle">
            Joined {new Date(creator.created_at).toLocaleDateString()}
          </span>
          <span className="text-xs text-subtle group-hover:text-violet-300 flex items-center gap-1 transition-colors">
            View page <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </Link>
    </m.div>
  )
}

export default function ExplorePage() {
  const router = useRouter()
  const [creators, setCreators] = useState<Creator[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [sortBy, setSortBy] = useState<'featured' | 'newest'>('featured')
  const [platformStats, setPlatformStats] = useState<{ creators: number | null; content: number | null }>({ creators: null, content: null })

  // Fetch platform-wide stats (total_creators, total_content mappings, key=0u8)
  useEffect(() => {
    const base = `/api/aleo/program/${encodeURIComponent(DEPLOYED_PROGRAM_ID)}/mapping`
    Promise.all([
      fetch(`${base}/total_creators/0u8`).then(r => r.ok ? r.text() : null),
      fetch(`${base}/total_content/0u8`).then(r => r.ok ? r.text() : null),
    ]).then(([c, p]) => {
      const parse = (v: string | null) => {
        if (!v) return null
        const n = parseInt(v.replace(/"/g, '').replace(/u(8|16|32|64|128)$/, '').trim(), 10)
        return isNaN(n) ? null : n
      }
      setPlatformStats({ creators: parse(c), content: parse(p) })
    }).catch(() => {})
  }, [])

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()
    const params = debouncedSearch.trim() ? `?q=${encodeURIComponent(debouncedSearch.trim())}` : ''
    setLoading(true)
    setFetchError(false)
    fetch(`/api/creators/list${params}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('API error')
        return r.json()
      })
      .then((data) => {
        const apiCreators = data.creators || []
        // Fallback: show featured creators when API returns empty (demo mode)
        if (apiCreators.length === 0 && !debouncedSearch.trim()) {
          setCreators(FEATURED_CREATORS.map(fc => ({
            address: fc.address,
            display_name: fc.label,
            bio: fc.bio ?? null,
            created_at: '2026-02-01T00:00:00Z',
          })))
        } else {
          setCreators(apiCreators)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setCreators([])
        setFetchError(true)
        setLoading(false)
      })
    return () => controller.abort()
  }, [debouncedSearch, retryKey])

  return (
    <PageTransition>
      <div className="min-h-screen relative">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.05) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/[0.06] border border-violet-500/[0.12] mb-6">
              <Shield className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-medium tracking-wide uppercase text-violet-300">
                Browse Creators
              </span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-serif italic text-white mb-3"
              style={{ letterSpacing: '-0.03em' }}
            >
              Explore Creators
            </h1>
            <p className="text-lg text-muted max-w-lg mx-auto">
              Discover creators and subscribe privately. Your identity stays hidden.
            </p>
          </m.div>

          {/* Platform Stats Bar */}
          {(platformStats.creators !== null || platformStats.content !== null) && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="flex items-center justify-center gap-6 mb-8"
            >
              {platformStats.creators !== null && (
                <div className="flex items-center gap-1.5 text-xs text-subtle">
                  <Users className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-white font-medium tabular-nums">{platformStats.creators}</span> registered creator{platformStats.creators !== 1 ? 's' : ''}
                </div>
              )}
              {platformStats.content !== null && (
                <div className="flex items-center gap-1.5 text-xs text-subtle">
                  <Shield className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-white font-medium tabular-nums">{platformStats.content}</span> published post{platformStats.content !== 1 ? 's' : ''}
                </div>
              )}
            </m.div>
          )}

          {/* Search */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-lg mx-auto mb-10"
          >
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle group-focus-within:text-violet-400 transition-colors" />
              {/* Debounce loading indicator */}
              {search !== debouncedSearch && search.trim() !== '' && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                </div>
              )}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search creators by name or address. Press Enter to navigate to address."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValidAleoAddress(search.trim())) {
                    router.push(`/creator/${search.trim()}`)
                  }
                }}
                placeholder="Search creators by name or paste aleo1... address"
                className="w-full pl-11 pr-4 py-3 rounded-xl glass text-white placeholder-subtle focus:outline-none focus:border-violet-500/[0.3] focus:shadow-accent-md transition-all duration-300 text-base"
              />
            </div>
            {/* Direct address navigation hint */}
            {isValidAleoAddress(search.trim()) && (
              <m.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2"
              >
                <button
                  onClick={() => router.push(`/creator/${search.trim()}`)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-white">Go to creator page</span>
                    <span className="text-xs text-subtle font-mono">{shortenAddress(search.trim())}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </m.div>
            )}
          </m.div>

          {/* Results header */}
          {!loading && !fetchError && creators.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-subtle">
                {creators.length} creator{creators.length !== 1 ? 's' : ''}{debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
              </p>
              {!debouncedSearch && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-subtle mr-1">Sort:</span>
                  <button
                    onClick={() => {
                      setSortBy('featured')
                      setCreators(prev => [...prev].sort((a, b) => {
                        const aFeatured = FEATURED_ADDRESSES.has(a.address) ? 0 : 1
                        const bFeatured = FEATURED_ADDRESSES.has(b.address) ? 0 : 1
                        return aFeatured - bFeatured
                      }))
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${sortBy === 'featured' ? 'text-violet-300 bg-violet-500/10' : 'text-subtle hover:text-white hover:bg-white/[0.06]'}`}
                  >
                    Featured
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('newest')
                      setCreators(prev => [...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${sortBy === 'newest' ? 'text-violet-300 bg-violet-500/10' : 'text-subtle hover:text-white hover:bg-white/[0.06]'}`}
                  >
                    Newest
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {fetchError ? (
            <div className="text-center py-16">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-1">Failed to Load Creators</h3>
              <p className="text-sm text-subtle mb-4">Could not reach the server. Please try again.</p>
              <button
                onClick={() => setRetryKey(k => k + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-border text-sm text-white hover:bg-white/10 transition-all duration-300"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl bg-surface-1 border border-border animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-sm bg-white/[0.06]" />
                    <div>
                      <div className="h-4 w-24 rounded bg-white/[0.06] mb-1" />
                      <div className="h-3 w-16 rounded bg-white/[0.04]" />
                    </div>
                  </div>
                  <div className="h-3 w-full rounded bg-white/[0.03] mb-2" />
                  <div className="h-3 w-2/3 rounded bg-white/[0.03]" />
                </div>
              ))}
            </div>
          ) : creators.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-2xl bg-violet-500/10 animate-pulse" />
                <div className="relative w-full h-full rounded-2xl bg-surface-1 border border-border flex items-center justify-center">
                  <Users className="w-8 h-8 text-subtle" />
                </div>
              </div>
              <h3 className="text-white font-medium mb-1">
                {search ? 'No Creators Found' : 'No Creators Yet'}
              </h3>
              <p className="text-sm text-subtle mb-6 max-w-sm mx-auto">
                {search
                  ? 'Try a different search term, or paste a full aleo1... address above to go directly to any creator page.'
                  : 'Be the first to register as a creator on VeilSub!'}
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {search ? (
                  <button
                    onClick={() => setSearch('')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] transition-all duration-300"
                  >
                    Clear search
                  </button>
                ) : (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 transition-all duration-300 active:scale-[0.98]"
                  >
                    Become a Creator
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {creators.map((creator, i) => (
                <CreatorCard key={creator.address} creator={creator} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
