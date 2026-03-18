'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { m } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Users, Coins, ArrowRight, Shield, Sparkles } from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import Button from '@/components/ui/Button'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import AddressAvatar from '@/components/ui/AddressAvatar'
import { FEATURED_CREATORS } from '@/lib/config'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { shortenAddress, formatCredits } from '@/lib/utils'

/* ─── Types ─── */
interface CreatorListItem {
  address: string
  display_name: string | null
  bio: string | null
  category: string | null
  created_at: string
}

/* ─── Creator Card (fetches live data from API) ─── */
const HomepageCreatorCard = React.memo(function HomepageCreatorCard({
  creator,
}: {
  creator: CreatorListItem
}) {
  const { fetchCreatorStats } = useCreatorStats()
  const [stats, setStats] = useState<{ subscriberCount: number; subscriberThreshold: string; tierPrice: number | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCreatorStats(creator.address).then((s) => {
      if (!cancelled) setStats(s)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator.address])

  return (
    <Link
      href={`/creator/${creator.address}`}
      className="group block p-6 rounded-3xl glass glass-accent transition-all duration-300"
    >
      <div className="flex items-center gap-4 mb-3">
        <AddressAvatar address={creator.address} />
        <div className="min-w-0 flex-1">
          <p className="text-white font-medium text-sm truncate">
            {creator.display_name || shortenAddress(creator.address)}
          </p>
          <p className="text-xs text-white/50 font-mono truncate">
            {shortenAddress(creator.address)}
          </p>
        </div>
      </div>
      {creator.bio && (
        <p className="text-xs text-white/50 line-clamp-2 mb-3 leading-relaxed">
          {creator.bio}
        </p>
      )}
      {stats && stats.tierPrice !== null ? (
        <div className="flex gap-4 text-xs text-white/55 mb-3">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" aria-hidden="true" />
            {stats.subscriberThreshold} subscribers
          </span>
          <span className="flex items-center gap-1">
            <Coins className="w-3 h-3" aria-hidden="true" />
            {formatCredits(stats.tierPrice)} ALEO
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-[10px] text-emerald-300/80">
            <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
            New Creator
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/[0.05] border border-emerald-500/15 text-[10px] font-medium text-emerald-300/70">
          <Shield className="w-2.5 h-2.5" aria-hidden="true" />
          ZK-Private
        </span>
        <span className="text-xs text-white/50 group-hover:text-violet-300 flex items-center gap-1 transition-colors">
          View creator <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
})

/* ─── Main Component ─── */
export default function ExploreCreators() {
  const [searchAddress, setSearchAddress] = useState('')
  const [creators, setCreators] = useState<CreatorListItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const router = useRouter()

  // Fetch real creators from API, fall back to FEATURED_CREATORS
  useEffect(() => {
    let cancelled = false
    fetch('/api/creators/list?limit=6&sort=newest')
      .then((r) => {
        if (!r.ok) throw new Error('API error')
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const apiCreators: CreatorListItem[] = data.creators || []
        if (apiCreators.length > 0) {
          setCreators(apiCreators.slice(0, 6))
        } else {
          // Fallback to featured creators for demo
          setCreators(FEATURED_CREATORS.map((fc) => ({
            address: fc.address,
            display_name: fc.label,
            bio: fc.bio ?? null,
            category: fc.category ?? null,
            created_at: new Date().toISOString(),
          })))
        }
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        // Fallback to featured creators
        setCreators(FEATURED_CREATORS.map((fc) => ({
          address: fc.address,
          display_name: fc.label,
          bio: fc.bio ?? null,
          category: fc.category ?? null,
          created_at: new Date().toISOString(),
        })))
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [])

  const handleSearch = () => {
    const trimmed = searchAddress.trim()
    if (trimmed.startsWith('aleo1') && trimmed.length > 10) {
      router.push(`/creator/${trimmed}`)
    }
  }

  return (
    <section className="py-24 lg:py-36 section-divider">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="Creators"
            title="Explore Creators"
            subtitle="Discover privacy-first creators or search by Aleo address. Subscribe anonymously with zero-knowledge proofs."
          />
        </ScrollReveal>

        {/* Creator grid: show up to 6 */}
        {creators.length > 0 && (
          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
            {creators.map((creator) => (
              <m.div key={creator.address} variants={staggerItemVariants}>
                <HomepageCreatorCard creator={creator} />
              </m.div>
            ))}
          </StaggerContainer>
        )}

        {/* Loading skeleton */}
        {!loaded && creators.length === 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-3xl glass animate-pulse">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.06]" />
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
        )}

        {/* Search + View All */}
        <ScrollReveal delay={0.2} className="max-w-xl mx-auto mt-10">
          <div className="flex gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 group-focus-within:text-violet-400 transition-colors" aria-hidden="true" />
              <input
                type="text"
                id="creator-search"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by Aleo address..."
                aria-label="Enter creator Aleo address"
                aria-describedby="creator-search-help"
                className="w-full pl-11 pr-4 py-4 rounded-full glass text-white placeholder-subtle focus:outline-none focus:border-violet-500/40 focus:shadow-accent-lg focus:scale-[1.01] transition-all duration-300 text-base"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!searchAddress.trim().startsWith('aleo1')}
              size="md"
            >
              Go
            </Button>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <p id="creator-search-help" className="text-xs text-white/60">
              Know a creator&apos;s address? Paste it above to visit their page.
            </p>
            <Link
              href="/explore"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              View all creators <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  )
}
