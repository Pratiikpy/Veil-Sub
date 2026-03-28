'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Users, ArrowRight } from 'lucide-react'
import { getCachedCreator } from '@/lib/creatorCache'
import { useSupabase } from '@/hooks/useSupabase'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { shortenAddress } from '@/lib/utils'
import { FEATURED_CREATORS } from '@/lib/config'
import { cacheSingleCreator } from '@/lib/creatorCache'
import AddressAvatar from '@/components/ui/AddressAvatar'

interface ProfileHoverCardProps {
  address: string
  children: React.ReactNode
}

interface CreatorData {
  displayName: string
  bio: string | null
  imageUrl: string | null
  category: string | null
  subscriberThreshold: string | null
}

const SHOW_DELAY = 300
const HIDE_DELAY = 200

export default function ProfileHoverCard({ address, children }: ProfileHoverCardProps) {
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<CreatorData | null>(null)
  const [loading, setLoading] = useState(false)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { getCreatorProfile } = useSupabase()
  const { fetchCreatorStats } = useCreatorStats()

  const clearTimers = useCallback(() => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null }
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  const loadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (fetchedRef.current || loadingRef.current) return
    fetchedRef.current = true
    loadingRef.current = true
    setLoading(true)

    try {
      // 1. Check sessionStorage cache first
      const cached = getCachedCreator(address)
      const featured = FEATURED_CREATORS.find(c => c.address === address)

      let displayName = cached?.display_name || featured?.label || shortenAddress(address)
      let bio = cached?.bio || featured?.bio || null
      let imageUrl = cached?.image_url || null
      let category = cached?.category || featured?.category || null

      // 2. If cache miss on key fields, fetch from Supabase
      if (!cached?.display_name && !featured?.label) {
        const profile = await getCreatorProfile(address)
        if (profile) {
          displayName = profile.display_name || displayName
          bio = profile.bio || bio
          imageUrl = profile.image_url || imageUrl
          category = profile.category || category
          cacheSingleCreator({
            address,
            display_name: profile.display_name,
            bio: profile.bio,
            category: profile.category,
            image_url: profile.image_url,
            cover_url: profile.cover_url,
            creator_hash: profile.creator_hash,
          })
        }
      }

      // 3. Fetch stats for subscriber threshold
      let subscriberThreshold: string | null = null
      try {
        const stats = await fetchCreatorStats(address)
        if (stats.subscriberThreshold) {
          subscriberThreshold = stats.subscriberThreshold
        }
      } catch {
        // Non-critical: card still shows without stats
      }

      setData({
        displayName,
        bio,
        imageUrl,
        category,
        subscriberThreshold,
      })
    } catch {
      // On error, show what we have from cache/featured
      const cached = getCachedCreator(address)
      const featured = FEATURED_CREATORS.find(c => c.address === address)
      setData({
        displayName: cached?.display_name || featured?.label || shortenAddress(address),
        bio: cached?.bio || featured?.bio || null,
        imageUrl: cached?.image_url || null,
        category: cached?.category || featured?.category || null,
        subscriberThreshold: null,
      })
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [address, getCreatorProfile, fetchCreatorStats])

  const handleMouseEnter = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
    showTimer.current = setTimeout(() => {
      setVisible(true)
      loadData()
    }, SHOW_DELAY)
  }, [loadData])

  const handleMouseLeave = useCallback(() => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null }
    hideTimer.current = setTimeout(() => {
      setVisible(false)
    }, HIDE_DELAY)
  }, [])

  const categoryColors: Record<string, string> = {
    'Content Creator': 'bg-white/[0.06] text-white/70 border-white/12',
    'Writer': 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    'Artist': 'bg-pink-500/15 text-pink-300 border-pink-500/25',
    'Developer': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    'Educator': 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    'Journalist': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    'Other': 'bg-white/[0.08] text-white/60 border-white/10',
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {visible && (
        <div
          className="absolute left-0 bottom-full mb-2 z-50 w-[320px] rounded-xl bg-surface-1 border border-border shadow-xl backdrop-blur-sm p-4"
          style={{ animation: 'fadeInScale 150ms ease-out' }}
          onMouseEnter={() => {
            if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
          }}
          onMouseLeave={handleMouseLeave}
        >
          {loading && !data ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-3.5 w-24 rounded bg-white/[0.06] animate-pulse mb-1.5" />
                <div className="h-2.5 w-16 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          ) : data ? (
            <>
              {/* Header: Avatar + Name + Address */}
              <div className="flex items-center gap-3 mb-3">
                {data.imageUrl ? (
                  <img
                    src={data.imageUrl}
                    alt={data.displayName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/[0.06] shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                      ;(e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <AddressAvatar
                  address={address}
                  size={40}
                  className={`ring-1 ring-white/[0.06] ${data.imageUrl ? 'hidden' : ''}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {data.displayName}
                  </p>
                  <p className="text-xs text-white/50 font-mono truncate">
                    {shortenAddress(address)}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {data.bio && (
                <p className="text-xs text-white/60 leading-relaxed mb-3 line-clamp-3">
                  {data.bio.length > 120 ? data.bio.slice(0, 120) + '...' : data.bio}
                </p>
              )}

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {data.subscriberThreshold && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/[0.04] border border-border/50 text-white/60">
                    <Users className="w-3 h-3 text-white/50" aria-hidden="true" />
                    {data.subscriberThreshold} subscribers
                  </span>
                )}
                {data.category && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${categoryColors[data.category] || categoryColors['Other']}`}>
                    {data.category}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/creator/${address}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-white/90 active:scale-[0.98] transition-all"
                >
                  Subscribe
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </Link>
                <Link
                  href={`/creator/${address}`}
                  className="px-3 py-2 rounded-lg bg-white/[0.06] border border-border text-xs text-white/70 hover:bg-white/[0.1] transition-all"
                >
                  View Profile
                </Link>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
