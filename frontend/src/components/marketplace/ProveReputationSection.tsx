'use client'

import { useState, useCallback, useEffect } from 'react'
import { Shield, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import GlassCard from '@/components/GlassCard'
import Button from '@/components/ui/Button'
import { useContractExecute } from '@/hooks/useContractExecute'
import { FEATURED_CREATORS, getCreatorHash, MICROCREDITS_PER_CREDIT } from '@/lib/config'
import { MARKETPLACE_PROGRAM_ID, MARKETPLACE_FEES } from './constants'

export default function ProveReputationSection() {
  const { execute, connected, address } = useContractExecute()
  const [creatorHash, setCreatorHash] = useState('')
  const [minAvg, setMinAvg] = useState(4)
  const [submitting, setSubmitting] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState('')

  useEffect(() => {
    if (selectedCreator) {
      const hash = getCreatorHash(selectedCreator)
      if (hash) setCreatorHash(hash)
    }
  }, [selectedCreator])

  const handleProve = useCallback(async () => {
    if (!connected) {
      toast.error('Please connect your wallet')
      return
    }
    if (!creatorHash) {
      toast.error('Please enter a creator hash')
      return
    }
    setSubmitting(true)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < MARKETPLACE_FEES.PROVE_REPUTATION) {
            toast.error(`Insufficient public balance. You need ~${(MARKETPLACE_FEES.PROVE_REPUTATION / MICROCREDITS_PER_CREDIT).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setSubmitting(false)
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      const txId = await execute(
        'prove_reputation_threshold',
        [creatorHash, `${minAvg}u8`],
        MARKETPLACE_FEES.PROVE_REPUTATION,
        MARKETPLACE_PROGRAM_ID
      )
      if (txId) {
        toast.success('Reputation threshold proven! Badge level updated on-chain.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Proof failed'
      if (msg.includes('Average below threshold')) {
        toast.error('Creator does not meet the minimum average rating threshold.')
      } else if (msg.includes('No reviews')) {
        toast.error('Creator has no reviews yet.')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }, [connected, creatorHash, minAvg, execute])

  return (
    <GlassCard className="!p-6 sm:!p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
          <Shield className="w-5 h-5 text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Prove Reputation</h3>
          <p className="text-xs text-white/50">Generate a threshold proof and earn a badge</p>
        </div>
      </div>

      <div className="space-y-4">
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

        <input
          type="text"
          value={creatorHash}
          onChange={e => setCreatorHash(e.target.value)}
          placeholder="Creator hash (field)"
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/50"
        />

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Minimum Average Rating
          </label>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setMinAvg(n)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                  n === minAvg
                    ? 'bg-violet-600 text-white border border-violet-500'
                    : 'bg-white/[0.04] text-white/50 border border-white/10 hover:border-white/20'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="accent"
          className="w-full rounded-xl"
          onClick={handleProve}
          disabled={submitting || !connected || !creatorHash}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Proving on-chain...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Prove Threshold ({(MARKETPLACE_FEES.PROVE_REPUTATION / MICROCREDITS_PER_CREDIT).toFixed(2)} ALEO)
            </>
          )}
        </Button>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <p className="text-xs text-white/60 leading-relaxed">
            This verifies the Pedersen commitment integrity on-chain and awards a badge if the
            creator meets the minimum average and has enough reviews (10+ Bronze, 25+ Silver, 50+ Gold).
          </p>
        </div>
      </div>
    </GlassCard>
  )
}
