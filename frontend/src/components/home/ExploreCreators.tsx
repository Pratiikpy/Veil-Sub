'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { m } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Users, Coins, ArrowRight } from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import Button from '@/components/ui/Button'
import ScrollReveal from '@/components/ScrollReveal'
import StaggerContainer, { staggerItemVariants } from '@/components/StaggerContainer'
import AddressAvatar from '@/components/ui/AddressAvatar'
import { FEATURED_CREATORS } from '@/lib/config'
import { useCreatorStats } from '@/hooks/useCreatorStats'
import { shortenAddress, formatCredits } from '@/lib/utils'

/* ─── Featured Creator Card ─── */
const FeaturedCreatorCard = React.memo(function FeaturedCreatorCard({
  address,
  label,
}: {
  address: string
  label: string
}) {
  const { fetchCreatorStats } = useCreatorStats()
  const [stats, setStats] = useState<{ subscriberCount: number; tierPrice: number | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCreatorStats(address).then((s) => {
      if (!cancelled) setStats(s)
    })
    return () => { cancelled = true }
  }, [address, fetchCreatorStats])

  return (
    <Link
      href={`/creator/${address}`}
      className="group block p-6 rounded-3xl glass glass-accent transition-all duration-300"
    >
      <div className="flex items-center gap-4 mb-4">
        <AddressAvatar address={address} />
        <div>
          <p className="text-white font-medium text-sm">{label}</p>
          <p className="text-xs text-white/60 font-mono">{shortenAddress(address)}</p>
        </div>
      </div>
      {stats && stats.tierPrice !== null && (
        <div className="flex gap-4 text-xs text-white/60">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {stats.subscriberCount} subscribers
          </span>
          <span className="flex items-center gap-1">
            <Coins className="w-3 h-3" />
            {formatCredits(stats.tierPrice)} ALEO
          </span>
        </div>
      )}
      <div className="mt-3 text-xs text-white/60 group-hover:text-violet-300 flex items-center gap-1 transition-colors">
        View creator <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  )
})

export default function ExploreCreators() {
  const [searchAddress, setSearchAddress] = useState('')
  const router = useRouter()

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
            title="Explore a Creator"
            subtitle="Enter any creator's Aleo address to view their page and subscription tiers."
          />
        </ScrollReveal>

        {FEATURED_CREATORS.length > 0 && (
          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
            {FEATURED_CREATORS.map((fc) => (
              <m.div key={fc.address} variants={staggerItemVariants}>
                <FeaturedCreatorCard address={fc.address} label={fc.label} />
              </m.div>
            ))}
          </StaggerContainer>
        )}

        <ScrollReveal delay={0.2} className="max-w-xl mx-auto mt-10">
          <div className="flex gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 group-focus-within:text-violet-400 transition-colors" />
              <input
                type="text"
                id="creator-search"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by Aleo address..."
                aria-label="Enter creator Aleo address"
                aria-describedby="creator-search-help"
                className="w-full pl-11 pr-4 py-3 rounded-full glass text-white placeholder-subtle focus:outline-none focus:border-violet-500/40 focus:shadow-accent-lg focus:scale-[1.01] transition-all duration-300 text-base"
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
              View all creators <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  )
}
