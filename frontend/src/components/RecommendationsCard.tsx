'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { m } from 'framer-motion'
import { Users, ArrowRight } from 'lucide-react'
import AddressAvatar from '@/components/ui/AddressAvatar'
import { FEATURED_CREATORS } from '@/lib/config'
import { shortenAddress } from '@/lib/utils'

interface RecommendationsCardProps {
  creatorAddress: string
  creatorName?: string
  /** Maximum number of recommendations to show */
  maxItems?: number
  /** Compact mode for embedding in modals */
  compact?: boolean
}

/**
 * Creator Recommendations Loop -- the most powerful organic growth mechanic
 * in the creator economy. Shows creators that [Name] also recommends,
 * with direct links to their pages.
 *
 * Data source: FEATURED_CREATORS (all creators recommend each other).
 * In production, creators would set their own recommendations in settings.
 */
export default function RecommendationsCard({
  creatorAddress,
  creatorName,
  maxItems = 3,
  compact = false,
}: RecommendationsCardProps) {
  const recommendations = useMemo(() => {
    // Filter out the current creator, then take up to maxItems
    return FEATURED_CREATORS
      .filter((c) => c.address !== creatorAddress)
      .slice(0, maxItems)
  }, [creatorAddress, maxItems])

  if (recommendations.length === 0) return null

  const displayName = creatorName
    || FEATURED_CREATORS.find((c) => c.address === creatorAddress)?.label
    || shortenAddress(creatorAddress)

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-xl border border-border ${compact ? 'p-4' : 'p-5'} bg-surface-2`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-violet-400" aria-hidden="true" />
        <p className={`font-medium text-white ${compact ? 'text-xs' : 'text-sm'}`}>
          {displayName} also recommends
        </p>
      </div>

      <div className="space-y-2.5">
        {recommendations.map((creator, i) => (
          <m.div
            key={creator.address}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <Link
              href={`/creator/${creator.address}`}
              className="flex items-center gap-3 group rounded-lg p-2 -mx-2 hover:bg-white/[0.04] transition-colors"
            >
              <AddressAvatar address={creator.address} size={36} />
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-white group-hover:text-violet-300 transition-colors truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                  {creator.label}
                </p>
                {creator.bio && (
                  <p className="text-[11px] text-white/50 truncate">
                    {creator.bio}
                  </p>
                )}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-violet-400 transition-colors shrink-0" aria-hidden="true" />
            </Link>
          </m.div>
        ))}
      </div>

      {FEATURED_CREATORS.filter((c) => c.address !== creatorAddress).length > maxItems && (
        <Link
          href="/explore"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          Explore all creators
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      )}
    </m.div>
  )
}
