'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Loader2, Check, AlertCircle, WifiOff, HelpCircle } from 'lucide-react'
import { DEPLOYED_PROGRAM_ID, getCreatorHash, saveCreatorHash } from '@/lib/config'

interface Props {
  creatorAddress: string
  mappingName: 'tier_prices' | 'subscriber_count' | 'total_revenue'
  displayedValue: number
}

export default function OnChainVerify({
  creatorAddress,
  mappingName,
  displayedValue,
}: Props) {
  const [state, setState] = useState<
    'idle' | 'verifying' | 'verified' | 'mismatch' | 'error' | 'no-hash'
  >('idle')
  const [resolvedHash, setResolvedHash] = useState<string | null>(null)

  // Resolve the Poseidon2 hash for this creator address on mount / address change
  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      // 1. Check hardcoded map + localStorage
      const local = getCreatorHash(creatorAddress)
      if (local) {
        if (!cancelled) setResolvedHash(local)
        return
      }

      // 2. Try the server-side recover-hash endpoint
      try {
        const res = await fetch(`/api/creators/recover-hash?address=${encodeURIComponent(creatorAddress)}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.creator_hash && typeof data.creator_hash === 'string' && data.creator_hash.endsWith('field')) {
            saveCreatorHash(creatorAddress, data.creator_hash)
            if (!cancelled) setResolvedHash(data.creator_hash)
            return
          }
        }
      } catch {
        // Recovery failed — fall through to no-hash state
      }

      if (!cancelled) setResolvedHash(null)
    }

    setResolvedHash(null)
    resolve()
    return () => { cancelled = true }
  }, [creatorAddress])

  const verify = useCallback(async () => {
    if (!resolvedHash) {
      setState('no-hash')
      return
    }

    setState('verifying')
    try {
      const res = await fetch(
        `/api/aleo/program/${DEPLOYED_PROGRAM_ID}/mapping/${mappingName}/${resolvedHash}`
      )
      if (!res.ok) {
        setState(res.status >= 500 ? 'error' : 'mismatch')
        return
      }
      const text = await res.text()
      if (!text || text === 'null' || text === '') {
        setState(displayedValue === 0 ? 'verified' : 'mismatch')
        return
      }
      const cleaned = text.replace(/"/g, '').replace(/u(8|16|32|64|128)$/, '').trim()
      const onChainValue = parseInt(cleaned, 10)
      if (isNaN(onChainValue)) {
        setState('error')
        return
      }
      setState(onChainValue === displayedValue ? 'verified' : 'mismatch')
    } catch {
      setState('error')
    }
  }, [resolvedHash, mappingName, displayedValue])

  if (state === 'idle') {
    return (
      <button
        onClick={verify}
        aria-label={`Verify ${mappingName} on-chain`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/[0.05] border border-border text-white/70 hover:text-white hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none transition-all"
      >
        <ShieldCheck className="w-3 h-3" aria-hidden="true" />
        Verify
      </button>
    )
  }

  if (state === 'verifying') {
    return (
      <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/[0.04] border border-white/10 text-white/70">
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
        Checking on-chain
      </span>
    )
  }

  if (state === 'verified') {
    return (
      <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 border border-green-500/20 text-green-400">
        <Check className="w-3 h-3" aria-hidden="true" />
        Aleo mapping verified
      </span>
    )
  }

  if (state === 'no-hash') {
    return (
      <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-500/10 border border-zinc-500/20 text-zinc-400">
        <HelpCircle className="w-3 h-3" aria-hidden="true" />
        Hash not available
      </span>
    )
  }

  if (state === 'error') {
    return (
      <button
        onClick={verify}
        aria-label="Retry on-chain verification"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none transition-all"
      >
        <WifiOff className="w-3 h-3" aria-hidden="true" />
        Retry
      </button>
    )
  }

  return (
    <button
      onClick={verify}
      aria-label="Retry on-chain verification after mismatch"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:outline-none transition-all"
    >
      <AlertCircle className="w-3 h-3" aria-hidden="true" />
      Mismatch — Retry
    </button>
  )
}
