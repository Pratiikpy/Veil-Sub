'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Search,
  Shield,
  Users,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import PageTransition from '@/components/PageTransition'
import { shortenAddress } from '@/lib/utils'

interface Creator {
  address: string
  display_name: string | null
  bio: string | null
  created_at: string
}

function CreatorCard({ creator, index }: { creator: Creator; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/creator/${creator.address}`}
        className="block p-5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-violet-500/30 hover:-translate-y-0.5 transition-all group"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate">
              {creator.display_name || shortenAddress(creator.address)}
            </p>
            {creator.display_name && (
              <p className="text-xs text-slate-500 font-mono truncate">
                {shortenAddress(creator.address)}
              </p>
            )}
          </div>
        </div>
        {creator.bio && (
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">
            {creator.bio}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Joined {new Date(creator.created_at).toLocaleDateString()}
          </span>
          <span className="text-xs text-violet-400 group-hover:text-violet-300 flex items-center gap-1">
            View page <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

export default function ExplorePage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

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
        setCreators(data.creators || [])
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
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl font-bold text-white mb-2">
              Explore Creators
            </h1>
            <p className="text-slate-400">
              Discover creators and subscribe privately. Your identity stays hidden.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-lg mx-auto mb-10"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search creators by name..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm"
              />
            </div>
          </motion.div>

          {/* Results */}
          {fetchError ? (
            <div className="text-center py-16">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-1">Failed to Load Creators</h3>
              <p className="text-sm text-slate-500 mb-4">Could not reach the server. Please try again.</p>
              <button
                onClick={() => setRetryKey(k => k + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
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
              <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-1">
                {search ? 'No Creators Found' : 'No Creators Yet'}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                {search
                  ? 'Try a different search term or browse all creators.'
                  : 'Be the first to register as a creator on VeilSub!'}
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium text-sm hover:from-violet-500 hover:to-purple-500 transition-all active:scale-[0.98]"
              >
                Become a Creator
                <ArrowRight className="w-4 h-4" />
              </Link>
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
