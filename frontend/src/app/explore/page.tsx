'use client'

import { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Search,
  Shield,
  Users,
  Coins,
  ArrowRight,
  AlertTriangle,
  Star,
  Sparkles,
  SlidersHorizontal,
  FileText,
  ChevronDown,
  X,
  TrendingUp,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import PageTransition from '@/components/PageTransition'
import { spring, cardHover, buttonTap } from '@/lib/motion'
import AddressAvatar from '@/components/ui/AddressAvatar'
import { shortenAddress, isValidAleoAddress, formatCredits } from '@/lib/utils'
import { FEATURED_CREATORS, DEPLOYED_PROGRAM_ID } from '@/lib/config'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { cacheCreators } from '@/lib/creatorCache'

// ─── Constants ────────────────────────────────────────────────────────────────

const FEATURED_ADDRESSES = new Set(FEATURED_CREATORS.map(c => c.address))

const GRADIENT_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 70%)',
} as const

const TITLE_STYLE = { letterSpacing: '-0.03em' } as const

// Categories aligned with OnboardingWizard categories
const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'Content Creator', label: 'Content Creator' },
  { id: 'Writer', label: 'Writer' },
  { id: 'Artist', label: 'Artist' },
  { id: 'Developer', label: 'Developer' },
  { id: 'Educator', label: 'Educator' },
  { id: 'Journalist', label: 'Journalist' },
  { id: 'Other', label: 'Other' },
] as const

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'featured', label: 'Featured' },
] as const

type SortOption = (typeof SORT_OPTIONS)[number]['id']

// ─── Types ────────────────────────────────────────────────────────────────────

interface Creator {
  address: string
  display_name: string | null
  bio: string | null
  category: string | null
  created_at: string
  creator_hash?: string | null
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-surface-1/60 border border-border animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.06]" />
        <div className="flex-1 min-w-0">
          <div className="h-4 w-28 rounded bg-white/[0.06] mb-2" />
          <div className="h-3 w-20 rounded bg-white/[0.04]" />
        </div>
      </div>
      <div className="h-4 w-full rounded bg-white/[0.04] mb-2" />
      <div className="h-3 w-3/4 rounded bg-white/[0.03] mb-4" />
      <div className="flex gap-3">
        <div className="h-6 w-20 rounded-full bg-white/[0.03]" />
        <div className="h-6 w-24 rounded-full bg-white/[0.03]" />
      </div>
    </div>
  )
}

// ─── Category Badge ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null

  const colorMap: Record<string, string> = {
    'Content Creator': 'bg-violet-500/15 text-violet-300 border-violet-500/25',
    'Writer': 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    'Artist': 'bg-pink-500/15 text-pink-300 border-pink-500/25',
    'Developer': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    'Educator': 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    'Journalist': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    'Other': 'bg-white/[0.08] text-white/60 border-white/10',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${colorMap[category] || colorMap['Other']}`}>
      {category}
    </span>
  )
}

// ─── Creator Card ─────────────────────────────────────────────────────────────

const CreatorCard = memo(function CreatorCard({ creator, index }: { creator: Creator; index: number }) {
  const isFeatured = FEATURED_ADDRESSES.has(creator.address)
  const { fetchCreatorStats } = useCreatorStats()
  const [stats, setStats] = useState<{ subscriberCount: number; subscriberThreshold: string; tierPrice: number | null; contentCount?: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCreatorStats(creator.address).then((s) => {
      if (!cancelled) setStats(s)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator.address])

  const bioSnippet = creator.bio
    ? creator.bio.length > 120 ? creator.bio.slice(0, 120) + '...' : creator.bio
    : null

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={cardHover}
      whileTap={buttonTap}
    >
      <Link
        href={`/creator/${creator.address}`}
        className="group block p-5 sm:p-6 rounded-2xl bg-surface-1/40 backdrop-blur-sm border border-border/75 hover:border-violet-500/25 hover:bg-surface-1/60 hover:shadow-[0_8px_32px_-8px_rgba(139,92,246,0.12)] hover:-translate-y-0.5 transition-all duration-300"
      >
        {/* Header row */}
        <div className="flex items-start gap-3.5 mb-3.5">
          <AddressAvatar address={creator.address} size={48} className="ring-2 ring-white/[0.04] group-hover:ring-violet-500/20 transition-all" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-white font-semibold text-sm truncate">
                {creator.display_name || shortenAddress(creator.address)}
              </p>
              {isFeatured && (
                <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/20">
                  <Star className="w-2.5 h-2.5 text-violet-400" aria-hidden="true" />
                  <span className="text-[9px] text-violet-400 font-semibold uppercase tracking-wider">Featured</span>
                </span>
              )}
            </div>
            {creator.display_name && (
              <p className="text-[11px] text-white/40 font-mono truncate">
                {shortenAddress(creator.address)}
              </p>
            )}
          </div>
        </div>

        {/* Category + Bio */}
        <div className="mb-3.5">
          {creator.category && (
            <div className="mb-2">
              <CategoryBadge category={creator.category} />
            </div>
          )}
          {bioSnippet && (
            <p className="text-xs text-white/55 leading-relaxed line-clamp-2">
              {bioSnippet}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
          {stats && stats.tierPrice !== null ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-border/50 text-[11px] text-white/60" title="Privacy threshold badge">
                <Users className="w-3 h-3 text-violet-400/80" aria-hidden="true" />
                {stats.subscriberThreshold} subscribers
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-border/50 text-[11px] text-white/60">
                <Coins className="w-3 h-3 text-amber-400/80" aria-hidden="true" />
                from {formatCredits(stats.tierPrice)} ALEO
              </span>
              {stats.contentCount !== undefined && stats.contentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-border/50 text-[11px] text-white/60">
                  <FileText className="w-3 h-3 text-blue-400/80" aria-hidden="true" />
                  {stats.contentCount} post{stats.contentCount !== 1 ? 's' : ''}
                </span>
              )}
            </>
          ) : stats === null ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-[11px] text-emerald-300/80">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              New Creator
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-[11px] text-emerald-300/80">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              New Creator
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/[0.06] border border-emerald-500/15 text-[10px] font-medium text-emerald-300/80">
            <Shield className="w-2.5 h-2.5" aria-hidden="true" />
            Private
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/30">
          <span className="text-[11px] text-white/35">
            Joined {new Date(creator.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="text-[11px] text-white/40 group-hover:text-violet-300 flex items-center gap-1 transition-colors duration-200">
            View Profile
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </m.div>
  )
}, (prevProps, nextProps) => {
  return prevProps.creator.address === nextProps.creator.address && prevProps.index === nextProps.index
})

// ─── Sort Dropdown ────────────────────────────────────────────────────────────

function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const current = SORT_OPTIONS.find(o => o.id === value) || SORT_OPTIONS[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-border/75 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
        {current.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={spring.snappy}
            className="absolute right-0 top-full mt-1.5 z-20 w-36 rounded-xl bg-surface-1 border border-border shadow-xl overflow-hidden"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false) }}
                className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors ${
                  value === opt.id
                    ? 'text-violet-300 bg-violet-500/10'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Featured Spotlight ───────────────────────────────────────────────────────

function FeaturedSpotlight({ creators }: { creators: Creator[] }) {
  const featured = creators.filter(c => FEATURED_ADDRESSES.has(c.address)).slice(0, 4)
  if (featured.length === 0) return null

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: 0.05 }}
      className="mb-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
          <TrendingUp className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
          <span className="text-xs font-medium text-violet-400">Featured Creators</span>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {featured.map((creator) => (
          <Link
            key={creator.address}
            href={`/creator/${creator.address}`}
            className="flex-shrink-0 w-56 sm:w-64 p-4 rounded-xl bg-gradient-to-br from-violet-500/[0.08] to-transparent border border-violet-500/15 hover:border-violet-500/30 hover:shadow-[0_4px_24px_-4px_rgba(139,92,246,0.1)] transition-all duration-300 group"
          >
            <div className="flex items-center gap-3 mb-2.5">
              <AddressAvatar address={creator.address} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium text-sm truncate">
                  {creator.display_name || shortenAddress(creator.address)}
                </p>
                <div className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-violet-400" aria-hidden="true" />
                  <span className="text-[10px] text-violet-400 font-medium">Featured</span>
                </div>
              </div>
            </div>
            {creator.bio && (
              <p className="text-[11px] text-white/50 line-clamp-2 mb-2.5">{creator.bio}</p>
            )}
            <div className="flex items-center justify-between text-[11px] text-white/40">
              <span>View profile</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </m.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const router = useRouter()
  const [creators, setCreators] = useState<Creator[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [platformStats, setPlatformStats] = useState<{ creators: number | null; content: number | null }>({ creators: null, content: null })
  const [platformStatsError, setPlatformStatsError] = useState(false)

  // Derived: filter by category client-side when sorting by 'featured' (since featured sort is client-side)
  const displayCreators = useMemo(() => {
    let list = creators

    // Client-side category filter when API doesn't handle it (featured sort)
    if (selectedCategory !== 'all') {
      list = list.filter((c) => {
        if (!c.category) return false
        return c.category.toLowerCase() === selectedCategory.toLowerCase()
      })
    }

    // Client-side featured sort: featured creators first, then by date
    if (sortBy === 'featured' && !debouncedSearch) {
      list = [...list].sort((a, b) => {
        const aFeat = FEATURED_ADDRESSES.has(a.address) ? 0 : 1
        const bFeat = FEATURED_ADDRESSES.has(b.address) ? 0 : 1
        if (aFeat !== bFeat) return aFeat - bFeat
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    return list
  }, [creators, selectedCategory, sortBy, debouncedSearch])

  // Search handler for direct address navigation
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValidAleoAddress(search.trim())) {
      router.push(`/creator/${search.trim()}`)
    }
  }, [search, router])

  const handleGoToCreator = useCallback(() => {
    if (isValidAleoAddress(search.trim())) {
      router.push(`/creator/${search.trim()}`)
    }
  }, [search, router])

  const handleClearSearch = useCallback(() => {
    setSearch('')
    setDebouncedSearch('')
  }, [])

  // Fetch platform-wide stats
  useEffect(() => {
    const base = `/api/aleo/program/${encodeURIComponent(DEPLOYED_PROGRAM_ID)}/mapping`
    setPlatformStatsError(false)
    Promise.all([
      fetch(`${base}/total_creators/0u8`).then(r => r.ok ? r.text() : null),
      fetch(`${base}/total_content/0u8`).then(r => r.ok ? r.text() : null),
    ]).then(([c, p]) => {
      const parse = (v: string | null) => {
        if (!v) return null
        const n = parseInt(v.replace(/"/g, '').replace(/u(8|16|32|64|128)$/, '').trim(), 10)
        return Number.isFinite(n) ? n : null
      }
      setPlatformStats({ creators: parse(c), content: parse(p) })
    }).catch(() => {
      setPlatformStatsError(true)
    })
  }, [])

  // Debounce search by 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch creators from API
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()

    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    // Send category to API for server-side filter (unless featured sort, where we filter client-side)
    if (selectedCategory !== 'all' && sortBy !== 'featured') {
      params.set('category', selectedCategory)
    }
    if (sortBy === 'newest' || sortBy === 'oldest') {
      params.set('sort', sortBy)
    }
    params.set('limit', '60')

    const qs = params.toString()
    setLoading(true)
    setFetchError(false)

    fetch(`/api/creators/list${qs ? '?' + qs : ''}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('API error')
        return r.json()
      })
      .then((data) => {
        const apiCreators: Creator[] = data.creators || []
        setTotalCount(data.total ?? apiCreators.length)

        // Fallback: show featured creators when API returns empty (demo mode)
        if (apiCreators.length === 0 && !debouncedSearch.trim()) {
          const now = new Date()
          const featured = FEATURED_CREATORS.map((fc, i) => ({
            address: fc.address,
            display_name: fc.label,
            bio: fc.bio ?? null,
            category: fc.category ?? null,
            created_at: new Date(now.getTime() - (30 - i * 5) * 24 * 60 * 60 * 1000).toISOString(),
          }))
          setCreators(featured)
          // Cache featured creators so /creator/[address] can use them without individual fetches
          cacheCreators(featured)
        } else {
          setCreators(apiCreators)
          // Cache all fetched creators — hides individual browsing interest from Supabase logs
          cacheCreators(apiCreators)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        // On API error, fall back to featured creators instead of showing error
        const now = new Date()
        const featured = FEATURED_CREATORS.map((fc, i) => ({
          address: fc.address,
          display_name: fc.label,
          bio: fc.bio ?? null,
          category: fc.category ?? null,
          created_at: new Date(now.getTime() - (30 - i * 5) * 24 * 60 * 60 * 1000).toISOString(),
        }))
        setCreators(featured)
        cacheCreators(featured)
        setFetchError(false)
        setLoading(false)
      })
    return () => controller.abort()
  }, [debouncedSearch, retryKey, sortBy, selectedCategory])

  return (
    <PageTransition>
      <div className="min-h-screen relative overflow-x-hidden">
        {/* Background gradient */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[1000px] h-[300px] sm:h-[500px] pointer-events-none"
          style={GRADIENT_STYLE}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

          {/* ── Hero Section ──────────────────────────────────────────────── */}
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.gentle}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/[0.06] border border-emerald-500/[0.12] mb-6">
              <Shield className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span className="text-xs font-medium tracking-wide uppercase text-emerald-300">
                Private Discovery
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-serif italic text-white mb-3"
              style={TITLE_STYLE}
            >
              Discover Creators
            </h1>
            <p className="text-base sm:text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
              Find creators who value your privacy. Subscribe anonymously — your identity stays private.
            </p>
          </m.div>

          {/* ── Platform Stats ─────────────────────────────────────────────── */}
          {(platformStats.creators !== null || platformStats.content !== null || platformStatsError) && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="flex items-center justify-center gap-4 sm:gap-8 mb-8"
            >
              {platformStatsError ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Stats syncing -- creator discovery still works</span>
                </div>
              ) : (
                <>
                  {platformStats.creators !== null && (
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      <Users className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
                      <span className="text-white font-medium tabular-nums">{platformStats.creators}</span> registered creator{platformStats.creators !== 1 ? 's' : ''}
                    </div>
                  )}
                  {platformStats.content !== null && (
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      <FileText className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                      <span className="text-white font-medium tabular-nums">{platformStats.content}</span> published post{platformStats.content !== 1 ? 's' : ''}
                    </div>
                  )}
                </>
              )}
            </m.div>
          )}

          {/* ── Search Bar ─────────────────────────────────────────────────── */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.1 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-violet-400 transition-colors" aria-hidden="true" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search creators by name, bio, or paste an aleo1 address"
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by name, bio, or paste aleo1... address"
                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-surface-1/60 backdrop-blur-sm border border-border/75 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/30 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] transition-all duration-300 text-base"
              />
              {/* Clear button */}
              {search && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/[0.06] text-white/40 hover:text-white/60 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              {/* Debounce spinner */}
              {search !== debouncedSearch && search.trim() !== '' && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Direct address navigation */}
            {isValidAleoAddress(search.trim()) && (
              <m.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2"
              >
                <button
                  onClick={handleGoToCreator}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-violet-500/[0.08] border border-violet-500/20 hover:bg-violet-500/[0.12] transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-400" aria-hidden="true" />
                    <span className="text-sm text-white">Go to creator page</span>
                    <span className="text-xs text-white/50 font-mono">{shortenAddress(search.trim())}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </m.div>
            )}
          </m.div>

          {/* ── Category Filter Chips ──────────────────────────────────────── */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                      isSelected
                        ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30 shadow-[0_0_12px_-2px_rgba(139,92,246,0.15)]'
                        : 'bg-white/[0.03] text-white/50 border border-transparent hover:bg-white/[0.06] hover:text-white/70'
                    }`}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </m.div>

          {/* ── Results Header ─────────────────────────────────────────────── */}
          {!loading && !fetchError && creators.length > 0 && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between mb-5"
            >
              <p className="text-xs text-white/50">
                {displayCreators.length} creator{displayCreators.length !== 1 ? 's' : ''}
                {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
                {selectedCategory !== 'all' ? ` in ${CATEGORIES.find(c => c.id === selectedCategory)?.label}` : ''}
                {totalCount !== null && totalCount > displayCreators.length ? ` of ${totalCount} total` : ''}
              </p>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </m.div>
          )}

          {/* ── Featured Spotlight (only when not searching) ───────────────── */}
          {!loading && !fetchError && creators.length > 0 && !debouncedSearch && selectedCategory === 'all' && sortBy !== 'featured' && (
            <FeaturedSpotlight creators={creators} />
          )}

          {/* ── Results Grid ──────────────────────────────────────────────── */}
          {fetchError ? (
            <div className="text-center py-20">
              <AlertTriangle className="w-10 h-10 text-red-400/70 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-white font-medium mb-1">Couldn&apos;t load the creator directory</h3>
              <p className="text-sm text-white/50 mb-6">This is usually a connection issue. Check your network and try again.</p>
              <button
                onClick={() => setRetryKey(k => k + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.1] text-sm font-medium text-white hover:bg-white/[0.12] transition-all"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : displayCreators.length === 0 ? (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="relative w-16 h-16 mx-auto mb-5">
                <div className="absolute inset-0 rounded-2xl bg-violet-500/10 animate-pulse" />
                <div className="relative w-full h-full rounded-2xl bg-surface-1 border border-border flex items-center justify-center">
                  {search ? (
                    <Search className="w-7 h-7 text-white/40" aria-hidden="true" />
                  ) : (
                    <Users className="w-7 h-7 text-white/40" aria-hidden="true" />
                  )}
                </div>
              </div>
              <h3 className="text-lg text-white font-medium mb-2">
                {search
                  ? `No creators match "${search}"`
                  : selectedCategory !== 'all'
                    ? `No creators in ${CATEGORIES.find(c => c.id === selectedCategory)?.label} yet`
                    : 'No creators yet'}
              </h3>
              <p className="text-sm text-white/50 mb-8 max-w-md mx-auto leading-relaxed">
                {search
                  ? 'Try a different search or paste a full aleo1... address to go directly to any creator page.'
                  : selectedCategory !== 'all'
                    ? 'Try browsing all categories or be the first creator in this space.'
                    : 'Be the first creator on VeilSub. Start building your audience -- your subscribers will be mathematically hidden.'}
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {search ? (
                  <button
                    onClick={handleClearSearch}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] transition-all"
                  >
                    Clear Search
                  </button>
                ) : selectedCategory !== 'all' ? (
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] transition-all"
                  >
                    View All Creators
                  </button>
                ) : (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 transition-all active:scale-[0.98]"
                  >
                    Become a Creator
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </m.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayCreators.map((creator, i) => (
                <CreatorCard key={creator.address} creator={creator} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
