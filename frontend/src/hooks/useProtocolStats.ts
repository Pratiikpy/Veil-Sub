'use client'

import { useState, useEffect } from 'react'
import { DEPLOYED_PROGRAM_ID } from '@/lib/config'

// Use Next.js rewrite proxy to avoid leaking user IP to Provable API
const ALEO_API = '/api/aleo'

interface ProtocolStats {
  programDeployed: boolean
  transitionCount: number
  recordTypes: number
  versions: number
}

// Module-level cache for program deployment check — prevents repeated
// calls to the Aleo API on every component mount / navigation.
const deployedCache: { data: boolean | null; timestamp: number } = { data: null, timestamp: 0 }
const DEPLOYED_CACHE_TTL = 30_000 // 30 seconds

async function checkProgramDeployed(): Promise<boolean> {
  if (deployedCache.data !== null && Date.now() - deployedCache.timestamp < DEPLOYED_CACHE_TTL) {
    return deployedCache.data
  }

  try {
    const res = await fetch(`${ALEO_API}/program/${DEPLOYED_PROGRAM_ID}`)
    const result = res.ok
    deployedCache.data = result
    deployedCache.timestamp = Date.now()
    return result
  } catch {
    return false
  }
}

export function useProtocolStats() {
  const [stats, setStats] = useState<ProtocolStats>({
    programDeployed: false,
    transitionCount: 27,
    recordTypes: 6,
    versions: 27,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      const deployed = await checkProgramDeployed()
      if (cancelled) return

      // If deployed, we use the known contract stats
      // These are verified from the compiled contract
      setStats({
        programDeployed: deployed,
        transitionCount: 27,
        recordTypes: 6,
        versions: 27,
      })
      setLoading(false)
    }

    fetchStats()
    return () => { cancelled = true }
  }, [])

  return { stats, loading }
}
