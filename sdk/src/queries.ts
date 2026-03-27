import { API_URL, PROGRAM_ID } from './constants'
import type { CreatorStats, VeilSubConfig } from './types'

export async function queryMapping(
  mapping: string,
  key: string,
  config?: VeilSubConfig
): Promise<string | null> {
  const baseUrl = config?.apiUrl || API_URL
  const programId = config?.programId || PROGRAM_ID
  const res = await fetch(`${baseUrl}/program/${programId}/mapping/${mapping}/${key}`)
  if (!res.ok) return null
  const text = await res.text()
  if (!text || text === 'null') return null
  return text.replace(/"/g, '').trim()
}

function parseU64(raw: string | null): number {
  if (!raw) return 0
  const cleaned = raw.replace(/u(8|16|32|64|128)$/, '')
  const val = parseInt(cleaned, 10)
  return Number.isFinite(val) ? val : 0
}

function thresholdLabel(count: number): string {
  if (count === 0) return 'New'
  if (count < 10) return `${count}`
  if (count < 50) return '10+'
  if (count < 100) return '50+'
  if (count < 500) return '100+'
  if (count < 1000) return '500+'
  return '1K+'
}

export async function queryCreatorStats(
  creatorHash: string,
  config?: VeilSubConfig
): Promise<CreatorStats> {
  const [subRaw, revRaw, contentRaw, priceRaw] = await Promise.all([
    queryMapping('subscriber_count', creatorHash, config),
    queryMapping('total_revenue', creatorHash, config),
    queryMapping('content_count', creatorHash, config),
    queryMapping('tier_prices', creatorHash, config),
  ])

  const subscriberCount = parseU64(subRaw)
  const totalRevenue = parseU64(revRaw)
  const contentCount = parseU64(contentRaw)
  const tierPrice = priceRaw ? parseU64(priceRaw) : null

  return {
    subscriberCount,
    totalRevenue,
    contentCount,
    tierPrice,
    subscriberThreshold: thresholdLabel(subscriberCount),
    revenueThreshold: totalRevenue === 0 ? 'New' : `${(totalRevenue / 1_000_000).toFixed(1)}+ ALEO`,
  }
}
