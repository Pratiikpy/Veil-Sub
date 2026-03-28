'use client'

import { useState, useCallback, useEffect } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import GlassCard from '@/components/GlassCard'
import Button from '@/components/ui/Button'
import { useContractExecute } from '@/hooks/useContractExecute'
import { FEATURED_CREATORS, getCreatorHash, MICROCREDITS_PER_CREDIT } from '@/lib/config'
import { MARKETPLACE_PROGRAM_ID, MARKETPLACE_FEES } from './constants'
import { StarRating } from './SharedComponents'

export default function SubmitReviewSection() {
  const { execute, connected, address } = useContractExecute()
  const [creatorHash, setCreatorHash] = useState('')
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState('')

  useEffect(() => {
    if (selectedCreator) {
      const hash = getCreatorHash(selectedCreator)
      if (hash) setCreatorHash(hash)
    }
  }, [selectedCreator])

  const handleSubmit = useCallback(async () => {
    if (!connected || !address) {
      toast.error('Please connect your wallet first')
      return
    }
    if (rating < 1 || rating > 5) {
      toast.error('Please select a rating (1-5 stars)')
      return
    }
    if (!creatorHash || !creatorHash.endsWith('field')) {
      toast.error('Please enter a valid creator hash (must end with "field")')
      return
    }

    setSubmitting(true)
    try {
      let contentHash = '0field'
      if (reviewText.trim()) {
        let hash = BigInt(0)
        for (let i = 0; i < reviewText.length; i++) {
          hash = (hash * BigInt(31) + BigInt(reviewText.charCodeAt(i))) % (BigInt(2) ** BigInt(128))
        }
        contentHash = `${hash}field`
      }

      const txId = await execute(
        'submit_review',
        [creatorHash, `${rating}u8`, contentHash],
        MARKETPLACE_FEES.SUBMIT_REVIEW,
        MARKETPLACE_PROGRAM_ID
      )

      if (txId) {
        toast.success('Review submitted! Your rating is now part of the aggregate Pedersen commitment.')
        setRating(0)
        setReviewText('')
        setCreatorHash('')
        setSelectedCreator('')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit review'
      if (msg.includes('Already reviewed')) {
        toast.error('You have already reviewed this creator. One review per (reviewer, creator) pair.')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }, [connected, address, rating, creatorHash, reviewText, execute])

  return (
    <GlassCard className="!p-6 sm:!p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
          <Star className="w-5 h-5 text-amber-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Submit Review</h3>
          <p className="text-xs text-white/50">Rate a creator privately using Pedersen commitments</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Creator</label>
          <select
            value={selectedCreator}
            onChange={e => {
              setSelectedCreator(e.target.value)
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
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Creator Hash <span className="text-white/60">(or enter directly)</span>
          </label>
          <input
            type="text"
            value={creatorHash}
            onChange={e => setCreatorHash(e.target.value)}
            placeholder="e.g. 7077346389...field"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Rating</label>
          <StarRating rating={rating} onRate={setRating} size="lg" />
          {rating > 0 && (
            <p className="text-xs text-white/60 mt-1">
              {rating} star{rating !== 1 ? 's' : ''} -- your individual rating is hidden via Pedersen commitment
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Review Text <span className="text-white/60">(optional, stored off-chain)</span>
          </label>
          <textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            placeholder="Share your experience..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/50 resize-none"
          />
        </div>

        <Button
          variant="accent"
          className="w-full rounded-xl"
          onClick={handleSubmit}
          disabled={submitting || !connected || rating === 0 || !creatorHash}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Generating ZK Proof...
            </>
          ) : (
            <>
              <Star className="w-4 h-4" aria-hidden="true" />
              Submit Review ({(MARKETPLACE_FEES.SUBMIT_REVIEW / MICROCREDITS_PER_CREDIT).toFixed(2)} ALEO)
            </>
          )}
        </Button>

        {!connected && (
          <p className="text-xs text-amber-400/70 text-center">
            Connect your wallet to submit a review
          </p>
        )}
      </div>
    </GlassCard>
  )
}
