'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { GOVERNANCE_PROGRAM_ID } from '@/lib/config'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Proposal {
  id: string               // proposal_id field value (e.g. "12345field")
  status: number           // 0=active, 1=resolved, 2=cancelled
  descriptionHash: string  // on-chain description_hash
  creatorHash: string      // on-chain creator_hash
  voteCount: number        // total ballots cast
  yesCommit: string        // aggregate Pedersen commitment (group element string)
  noCommit: string         // aggregate Pedersen commitment (group element string)
  resolvedYes: number | null  // set after resolution
  resolvedNo: number | null   // set after resolution
  // Local metadata (from localStorage)
  title?: string
  createdAt?: number       // timestamp (ms)
}

export interface BallotSalt {
  proposalId: string
  salt: string
  vote: boolean
  timestamp: number
}

const STATUS_LABELS: Record<number, string> = {
  0: 'Active',
  1: 'Resolved',
  2: 'Cancelled',
}

export function getStatusLabel(status: number): string {
  return STATUS_LABELS[status] ?? 'Unknown'
}

// ─── LocalStorage helpers ───────────────────────────────────────────────────

const PROPOSALS_KEY = 'veilsub_gov_proposals'
const BALLOTS_KEY = 'veilsub_gov_ballots'

function loadLocalProposals(): Record<string, { title: string; createdAt: number }> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PROPOSALS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveLocalProposal(proposalId: string, title: string): void {
  if (typeof window === 'undefined') return
  try {
    const existing = loadLocalProposals()
    const updated = { ...existing, [proposalId]: { title, createdAt: Date.now() } }
    localStorage.setItem(PROPOSALS_KEY, JSON.stringify(updated))
  } catch { /* localStorage full or unavailable */ }
}

function loadBallotSalts(): BallotSalt[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(BALLOTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveBallotSalt(entry: BallotSalt): void {
  if (typeof window === 'undefined') return
  try {
    const existing = loadBallotSalts()
    // Avoid duplicates for same proposal
    const filtered = existing.filter(b => b.proposalId !== entry.proposalId)
    localStorage.setItem(BALLOTS_KEY, JSON.stringify([...filtered, entry]))
  } catch { /* localStorage full or unavailable */ }
}

export function getBallotSalt(proposalId: string): BallotSalt | null {
  const salts = loadBallotSalts()
  return salts.find(b => b.proposalId === proposalId) ?? null
}

// ─── On-chain mapping fetcher ───────────────────────────────────────────────

const ALEO_API = '/api/aleo'

// Module-level cache for governance mapping lookups
const govMappingCache = new Map<string, { data: string | null; timestamp: number }>()
const GOV_CACHE_TTL = 15_000 // 15 seconds

async function fetchGovMapping(mapping: string, key: string): Promise<string | null> {
  const cacheKey = `${mapping}:${key}`
  const cached = govMappingCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < GOV_CACHE_TTL) {
    return cached.data
  }

  try {
    const res = await fetch(
      `${ALEO_API}/program/${encodeURIComponent(GOVERNANCE_PROGRAM_ID)}/mapping/${encodeURIComponent(mapping)}/${encodeURIComponent(key)}`
    )
    if (!res.ok) {
      govMappingCache.set(cacheKey, { data: null, timestamp: Date.now() })
      return null
    }
    const text = await res.text()
    if (!text || text === 'null' || text === '') {
      govMappingCache.set(cacheKey, { data: null, timestamp: Date.now() })
      return null
    }
    // Remove wrapping quotes if present
    const cleaned = text.replace(/^"|"$/g, '').trim()
    govMappingCache.set(cacheKey, { data: cleaned, timestamp: Date.now() })
    return cleaned
  } catch {
    return null
  }
}

function parseU64(raw: string | null): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/u(8|16|32|64|128)$/, '').trim()
  const parsed = parseInt(cleaned, 10)
  return isNaN(parsed) ? null : parsed
}

// ─── Fetch a single proposal's on-chain data ───────────────────────────────

async function fetchProposalOnChain(proposalId: string): Promise<Proposal | null> {
  const statusRaw = await fetchGovMapping('proposals', proposalId)
  if (statusRaw === null) return null

  const status = parseU64(statusRaw) ?? -1
  if (status < 0 || status > 2) return null

  // Fetch remaining data in parallel
  const [descHash, creatorHash, voteCountRaw, yesCommitRaw, noCommitRaw, resolvedYesRaw, resolvedNoRaw] =
    await Promise.all([
      fetchGovMapping('proposal_description', proposalId),
      fetchGovMapping('proposal_creator', proposalId),
      fetchGovMapping('vote_count', proposalId),
      fetchGovMapping('yes_commit', proposalId),
      fetchGovMapping('no_commit', proposalId),
      status === 1 ? fetchGovMapping('resolved_yes', proposalId) : Promise.resolve(null),
      status === 1 ? fetchGovMapping('resolved_no', proposalId) : Promise.resolve(null),
    ])

  const localData = loadLocalProposals()
  const local = localData[proposalId]

  return {
    id: proposalId,
    status,
    descriptionHash: descHash ?? '',
    creatorHash: creatorHash ?? '',
    voteCount: parseU64(voteCountRaw) ?? 0,
    yesCommit: yesCommitRaw ?? '0group',
    noCommit: noCommitRaw ?? '0group',
    resolvedYes: parseU64(resolvedYesRaw),
    resolvedNo: parseU64(resolvedNoRaw),
    title: local?.title,
    createdAt: local?.createdAt,
  }
}

// ─── Platform-wide governance stats ─────────────────────────────────────────

export interface GovernanceStats {
  totalProposals: number
  totalBallots: number
}

async function fetchGovernanceStats(): Promise<GovernanceStats> {
  const [proposalsRaw, ballotsRaw] = await Promise.all([
    fetchGovMapping('total_proposals', '0u8'),
    fetchGovMapping('total_ballots', '0u8'),
  ])
  return {
    totalProposals: parseU64(proposalsRaw) ?? 0,
    totalBallots: parseU64(ballotsRaw) ?? 0,
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useGovernance() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [stats, setStats] = useState<GovernanceStats>({ totalProposals: 0, totalBallots: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // Load proposals from localStorage proposal IDs + on-chain data
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch platform stats first to know how many proposals exist
      const govStats = await fetchGovernanceStats()
      if (!mountedRef.current) return
      setStats(govStats)

      // Load locally-known proposal IDs
      const localProposals = loadLocalProposals()
      const proposalIdSet = new Set(Object.keys(localProposals))

      // Also fetch proposal IDs from global Supabase registry (cross-device discovery)
      try {
        const regRes = await fetch('/api/registry?type=proposal')
        if (regRes.ok) {
          const regData = await regRes.json()
          if (regData?.entries) {
            for (const entry of regData.entries) {
              if (entry.item_id && !proposalIdSet.has(entry.item_id)) {
                proposalIdSet.add(entry.item_id)
                // Also save to localStorage so they persist for next load
                saveLocalProposal(entry.item_id, entry.label || `Proposal ${entry.item_id.slice(0, 12)}...`)
                // Save description if available
                if (entry.metadata?.description && typeof window !== 'undefined') {
                  try {
                    const descKey = `veilsub_gov_desc_${entry.item_id}`
                    if (!localStorage.getItem(descKey)) {
                      localStorage.setItem(descKey, entry.metadata.description)
                    }
                  } catch { /* ignore */ }
                }
              }
            }
          }
        }
      } catch { /* registry fetch failed — local data still available */ }

      const proposalIds = Array.from(proposalIdSet)

      if (proposalIds.length === 0) {
        setProposals([])
        setLoading(false)
        return
      }

      // Fetch all known proposals in parallel
      const results = await Promise.all(
        proposalIds.map(id => fetchProposalOnChain(id))
      )

      if (!mountedRef.current) return

      const valid = results.filter((p): p is Proposal => p !== null)
      // Sort: active first, then by creation time (newest first)
      valid.sort((a, b) => {
        if (a.status !== b.status) return a.status - b.status
        return (b.createdAt ?? 0) - (a.createdAt ?? 0)
      })

      setProposals(valid)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load proposals')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // Fetch a single proposal by ID (for after creation)
  const fetchProposal = useCallback(async (proposalId: string): Promise<Proposal | null> => {
    return fetchProposalOnChain(proposalId)
  }, [])

  // Register a new proposal locally (called after tx confirms)
  const registerProposal = useCallback((proposalId: string, title: string) => {
    saveLocalProposal(proposalId, title)
    // Clear cache to ensure fresh data on next fetch
    govMappingCache.clear()
  }, [])

  // Save ballot salt locally
  const saveBallot = useCallback((proposalId: string, salt: string, vote: boolean) => {
    saveBallotSalt({ proposalId, salt, vote, timestamp: Date.now() })
  }, [])

  // Clear mapping cache (call after mutations)
  const clearCache = useCallback(() => {
    govMappingCache.clear()
  }, [])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    return () => { mountedRef.current = false }
  }, [refresh])

  return {
    proposals,
    stats,
    loading,
    error,
    refresh,
    fetchProposal,
    registerProposal,
    saveBallot,
    clearCache,
  }
}
