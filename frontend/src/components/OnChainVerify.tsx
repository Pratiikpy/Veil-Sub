'use client'

import { useState } from 'react'
import { ShieldCheck, Loader2, Check, AlertCircle, WifiOff } from 'lucide-react'
import { PROGRAM_ID } from '@/lib/config'

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
    'idle' | 'verifying' | 'verified' | 'mismatch' | 'error'
  >('idle')

  const verify = async () => {
    setState('verifying')
    try {
      const res = await fetch(
        `/api/aleo/program/${PROGRAM_ID}/mapping/${mappingName}/${creatorAddress}`
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
      const cleaned = text.replace(/"/g, '').replace('u64', '').trim()
      const onChainValue = parseInt(cleaned, 10)
      if (isNaN(onChainValue)) {
        setState('error')
        return
      }
      setState(onChainValue === displayedValue ? 'verified' : 'mismatch')
    } catch {
      setState('error')
    }
  }

  if (state === 'idle') {
    return (
      <button
        onClick={verify}
        aria-label={`Verify ${mappingName} on-chain`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
      >
        <ShieldCheck className="w-3 h-3" />
        Verify
      </button>
    )
  }

  if (state === 'verifying') {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-300">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking
      </span>
    )
  }

  if (state === 'verified') {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 border border-green-500/20 text-green-400">
        <Check className="w-3 h-3" />
        On-chain verified
      </span>
    )
  }

  if (state === 'error') {
    return (
      <button
        onClick={verify}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
      >
        <WifiOff className="w-3 h-3" />
        Retry
      </button>
    )
  }

  return (
    <button
      onClick={verify}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"
    >
      <AlertCircle className="w-3 h-3" />
      Mismatch — Retry
    </button>
  )
}
