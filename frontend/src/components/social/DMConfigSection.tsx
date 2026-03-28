'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Settings2,
  Shield,
  Radio,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useContractExecute } from '@/hooks/useContractExecute'
import { MICROCREDITS_PER_CREDIT, getCreatorHash } from '@/lib/config'
import { formatCredits } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { SOCIAL_PROGRAM_ID, SOCIAL_FEES, TIER_OPTIONS } from './constants'
import { NotConnectedCard, InfoCard, CardSkeleton } from './SharedComponents'

interface DMConfigState {
  enabled: boolean | null
  price: number
  minTier: number
}

export default function DMConfigSection() {
  const { address, connected } = useWallet()
  const { execute } = useContractExecute()
  const creatorHash = address ? getCreatorHash(address) : null

  const [config, setConfig] = useState<DMConfigState>({ enabled: null, price: 0, minTier: 1 })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [tierInput, setTierInput] = useState(1)
  const configuringRef = useRef(false)

  // Fetch current config from mappings
  useEffect(() => {
    if (!creatorHash) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchConfig() {
      try {
        const [enabledRes, priceRes, tierRes] = await Promise.allSettled([
          fetch(`/api/aleo/program/${SOCIAL_PROGRAM_ID}/mapping/dm_enabled/${creatorHash}`),
          fetch(`/api/aleo/program/${SOCIAL_PROGRAM_ID}/mapping/dm_price/${creatorHash}`),
          fetch(`/api/aleo/program/${SOCIAL_PROGRAM_ID}/mapping/dm_min_tier/${creatorHash}`),
        ])

        if (cancelled) return

        const enabledText = enabledRes.status === 'fulfilled' && enabledRes.value.ok
          ? await enabledRes.value.text() : null
        const priceText = priceRes.status === 'fulfilled' && priceRes.value.ok
          ? await priceRes.value.text() : null
        const tierText = tierRes.status === 'fulfilled' && tierRes.value.ok
          ? await tierRes.value.text() : null

        const enabled = enabledText?.includes('true') ?? null
        const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, ''), 10) || 0 : 0
        const minTier = tierText ? parseInt(tierText.replace(/[^0-9]/g, ''), 10) || 1 : 1

        setConfig({ enabled, price, minTier })
        setPriceInput(price > 0 ? (price / MICROCREDITS_PER_CREDIT).toString() : '')
        setTierInput(minTier)
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchConfig()
    return () => { cancelled = true }
  }, [creatorHash])

  const handleConfigure = useCallback(async () => {
    if (configuringRef.current) return
    if (!creatorHash || submitting) return

    const priceMicrocredits = Math.floor(parseFloat(priceInput || '0') * MICROCREDITS_PER_CREDIT)
    if (priceMicrocredits < 0) {
      toast.error('Price cannot be negative')
      return
    }
    if (tierInput < 1 || tierInput > 3) {
      toast.error('Tier must be between 1 and 3')
      return
    }

    configuringRef.current = true
    setSubmitting(true)
    try {
      const txId = await execute(
        'configure_dm',
        [`${creatorHash}`, `${priceMicrocredits}u64`, `${tierInput}u8`],
        SOCIAL_FEES.CONFIGURE_DM,
        SOCIAL_PROGRAM_ID,
      )
      if (txId) {
        toast.success('DM configuration submitted!', {
          description: `TX: ${txId.slice(0, 16)}...`,
        })
        setConfig({ enabled: true, price: priceMicrocredits, minTier: tierInput })
      }
    } catch (err) {
      toast.error('Failed to configure DMs', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setSubmitting(false)
      configuringRef.current = false
    }
  }, [creatorHash, priceInput, tierInput, submitting, execute])

  if (!connected) {
    return <NotConnectedCard message="Connect your wallet to configure DM settings for your creator profile." />
  }

  if (!creatorHash) {
    return (
      <InfoCard
        icon={AlertCircle}
        title="Creator Hash Not Found"
        description="You need to register as a creator first to configure DM settings. Go to the Dashboard to register."
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      {/* Current Status */}
      <motion.div variants={staggerItem} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            config.enabled ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.04] border border-white/[0.08]'
          }`}>
            <Radio className={`w-5 h-5 ${config.enabled ? 'text-emerald-400' : 'text-white/60'}`} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">DM Status</h3>
            <p className="text-xs text-white/50">
              {config.enabled === null ? 'Not configured' : config.enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          {config.enabled && (
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">Live</span>
            </div>
          )}
        </div>

        {config.enabled && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
              <p className="text-[11px] text-white/60 uppercase tracking-wider mb-1">Price per DM</p>
              <p className="text-sm font-medium text-white">
                {config.price > 0 ? `${formatCredits(config.price)} ALEO` : 'Free (for subs)'}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
              <p className="text-[11px] text-white/60 uppercase tracking-wider mb-1">Min Tier</p>
              <p className="text-sm font-medium text-white">Tier {config.minTier}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Configure Form */}
      <motion.div variants={staggerItem} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <h3 className="text-sm font-medium text-white mb-4">
          {config.enabled ? 'Update DM Settings' : 'Enable Paid DMs'}
        </h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="dm-price" className="block text-xs text-white/50 mb-1.5">Price per message (ALEO)</label>
            <div className="relative">
              <input
                id="dm-price"
                type="number"
                min="0"
                step="0.01"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-violet-500/40 transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60">ALEO</span>
            </div>
            <p className="text-[11px] text-white/60 mt-1">Set to 0 for free DMs (subscribers still need min tier)</p>
          </div>

          <div>
            <label htmlFor="dm-tier" className="block text-xs text-white/50 mb-1.5">Minimum subscription tier</label>
            <div className="relative">
              <select
                id="dm-tier"
                value={tierInput}
                onChange={e => setTierInput(parseInt(e.target.value, 10))}
                className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-colors"
              >
                {TIER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={handleConfigure}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-200 font-medium text-sm hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting ZK Proof...</>
            ) : (
              <><Settings2 className="w-4 h-4" /> {config.enabled ? 'Update DM Config' : 'Enable DMs'}</>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4 text-[11px] text-white/60">
          <Shield className="w-3 h-3 shrink-0" />
          <span>Configuration is stored on-chain via Poseidon2 hash keys. Your address is never exposed.</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
