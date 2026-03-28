'use client'

import { useState, useCallback, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { spring } from '@/lib/motion'
import { Award, Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import GlassCard from '@/components/GlassCard'
import Button from '@/components/ui/Button'
import { FEATURED_CREATORS, getCreatorHash } from '@/lib/config'
import type { ReputationData } from './constants'
import { queryMapping, parseU64, parseU8 } from './helpers'
import { StarRating, BadgeDisplay } from './SharedComponents'

export default function ReputationLookupSection() {
  const [creatorHash, setCreatorHash] = useState('')
  const [reputation, setReputation] = useState<ReputationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState('')

  useEffect(() => {
    if (selectedCreator) {
      const hash = getCreatorHash(selectedCreator)
      if (hash) setCreatorHash(hash)
    }
  }, [selectedCreator])

  const lookupReputation = useCallback(async () => {
    if (!creatorHash) return
    setLoading(true)
    try {
      const [countRaw, sumRaw, badgeRaw] = await Promise.all([
        queryMapping('reputation_count', creatorHash),
        queryMapping('reputation_sum', creatorHash),
        queryMapping('creator_badge', creatorHash),
      ])

      setReputation({
        creatorHash,
        reviewCount: parseU64(countRaw),
        ratingSum: parseU64(sumRaw),
        badge: parseU8(badgeRaw),
      })
    } catch {
      toast.error('Failed to query reputation data')
    } finally {
      setLoading(false)
    }
  }, [creatorHash])

  const avgRating = reputation && reputation.reviewCount > 0
    ? (reputation.ratingSum / reputation.reviewCount).toFixed(1)
    : null

  return (
    <GlassCard className="!p-6 sm:!p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
          <Award className="w-5 h-5 text-violet-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Reputation Lookup</h3>
          <p className="text-xs text-white/50">Check a creator&apos;s on-chain reputation badge</p>
        </div>
      </div>

      <div className="space-y-4">
        <select
          value={selectedCreator}
          onChange={e => {
            setSelectedCreator(e.target.value)
            setReputation(null)
            if (!e.target.value) setCreatorHash('')
          }}
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
        >
          <option value="" className="bg-neutral-900">Select a creator...</option>
          {FEATURED_CREATORS.map(c => (
            <option key={c.address} value={c.address} className="bg-neutral-900">
              {c.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={creatorHash}
          onChange={e => { setCreatorHash(e.target.value); setReputation(null) }}
          placeholder="Creator hash (field)"
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/50"
        />

        <Button
          variant="secondary"
          className="w-full rounded-xl"
          onClick={lookupReputation}
          disabled={loading || !creatorHash}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Querying...
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" aria-hidden="true" />
              Lookup Reputation
            </>
          )}
        </Button>

        <AnimatePresence>
          {reputation && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring.gentle}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Badge</span>
                  <BadgeDisplay level={reputation.badge} />
                  {reputation.badge === 0 && (
                    <span className="text-xs text-white/60">No badge yet</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Reviews</span>
                  <span className="text-sm font-semibold text-white">{reputation.reviewCount}</span>
                </div>
                {avgRating && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Average Rating</span>
                    <div className="flex items-center gap-2">
                      <StarRating rating={Math.round(Number(avgRating))} interactive={false} size="sm" />
                      <span className="text-sm font-semibold text-white">{avgRating}</span>
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-white/[0.06]">
                  <p className="text-xs text-white/60">
                    Aggregate is a Pedersen commitment. Individual ratings are hidden.
                  </p>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  )
}
