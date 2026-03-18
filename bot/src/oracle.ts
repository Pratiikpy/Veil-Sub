// =============================================================================
// VeilSub Oracle Price Feed Bot
//
// Fetches ALEO/USD price from CoinGecko (free, no API key required) and
// logs the price + the transaction parameters that would be submitted to
// veilsub_oracle_v1.aleo's update_price transition.
//
// In production: submits update_price transactions via Aleo SDK.
// For testnet demo: logs prices and calculates dynamic tier costs.
// =============================================================================

import { logInfo, logError } from './notifications.js'

// ── Constants ─────────────────────────────────────────────────────────────

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=aleo&vs_currencies=usd'

const COINGECKO_HISTORY_URL =
  'https://api.coingecko.com/api/v3/coins/aleo/market_chart?vs_currency=usd&days=1'

const ORACLE_PROGRAM_ID = 'veilsub_oracle_v1.aleo'

// Token type constants matching the Leo contract
const TOKEN_ALEO = 0

// Micro-USD scale (6 decimals)
const MICRO_USD_SCALE = 1_000_000

// ── Types ─────────────────────────────────────────────────────────────────

export interface PriceData {
  readonly usd: number
  readonly microUsd: number
  readonly timestamp: string
}

export interface PriceHistoryPoint {
  readonly timestamp: number
  readonly price: number
}

export interface TierPriceCalculation {
  readonly tierUsd: number
  readonly aleoPrice: number
  readonly aleoMicrocredits: number
}

// ── Price Fetching ────────────────────────────────────────────────────────

/**
 * Fetch current ALEO/USD price from CoinGecko.
 * Returns null on failure (network error, rate limit, etc.).
 */
export async function fetchAleoPrice(): Promise<PriceData | null> {
  try {
    const res = await fetch(COINGECKO_URL)
    if (!res.ok) {
      logError(`CoinGecko API error: ${res.status} ${res.statusText}`)
      return null
    }
    const data = await res.json() as { aleo?: { usd?: number } }
    const usd = data?.aleo?.usd
    if (typeof usd !== 'number' || !Number.isFinite(usd) || usd <= 0) {
      logError('CoinGecko returned invalid ALEO price')
      return null
    }
    return {
      usd,
      microUsd: toMicroUsd(usd),
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logError(`Failed to fetch ALEO price: ${message}`)
    return null
  }
}

/**
 * Fetch 24-hour ALEO/USD price history from CoinGecko.
 * Returns hourly data points. Returns empty array on failure.
 */
export async function fetchPriceHistory(): Promise<readonly PriceHistoryPoint[]> {
  try {
    const res = await fetch(COINGECKO_HISTORY_URL)
    if (!res.ok) return []
    const data = await res.json() as { prices?: [number, number][] }
    if (!Array.isArray(data?.prices)) return []
    return data.prices.map(([timestamp, price]) => ({
      timestamp,
      price,
    }))
  } catch {
    return []
  }
}

// ── Conversion Utilities ──────────────────────────────────────────────────

/**
 * Convert USD to micro-USD (6 decimal places).
 * e.g., $1.50 => 1500000
 */
export function toMicroUsd(usd: number): number {
  return Math.round(usd * MICRO_USD_SCALE)
}

/**
 * Convert micro-USD back to USD.
 * e.g., 1500000 => 1.50
 */
export function fromMicroUsd(microUsd: number): number {
  return microUsd / MICRO_USD_SCALE
}

/**
 * Calculate dynamic tier price in ALEO microcredits for a given USD target.
 * e.g., $5 tier at $1.50/ALEO => 3,333,333 microcredits (3.33 ALEO)
 */
export function calculateTierPrice(
  tierUsd: number,
  aleoPriceUsd: number,
): TierPriceCalculation {
  const aleoPrice = tierUsd / aleoPriceUsd
  const aleoMicrocredits = Math.round(aleoPrice * MICRO_USD_SCALE)
  return {
    tierUsd,
    aleoPrice,
    aleoMicrocredits,
  }
}

// ── Oracle Monitor Loop ───────────────────────────────────────────────────

/**
 * Run a single oracle price check cycle.
 * Fetches the current price, logs it, and calculates example tier prices.
 * In production: would submit an update_price transaction.
 */
export async function oraclePriceCycle(): Promise<PriceData | null> {
  const price = await fetchAleoPrice()
  if (!price) {
    logError('[oracle] Failed to fetch ALEO price — skipping cycle')
    return null
  }

  logInfo(
    `[oracle] ALEO/USD: $${price.usd.toFixed(4)} ` +
    `(${price.microUsd} micro-USD) at ${price.timestamp}`
  )

  // Log example dynamic tier prices
  const exampleTiers = [1, 5, 10, 25, 50]
  for (const tierUsd of exampleTiers) {
    const calc = calculateTierPrice(tierUsd, price.usd)
    logInfo(
      `[oracle]   $${tierUsd} tier => ${calc.aleoPrice.toFixed(4)} ALEO ` +
      `(${calc.aleoMicrocredits} microcredits)`
    )
  }

  // Log the transaction that would be submitted
  logInfo(
    `[oracle] Would submit: ${ORACLE_PROGRAM_ID}/update_price ` +
    `(token_type: ${TOKEN_ALEO}u8, price_micro_usd: ${price.microUsd}u128)`
  )

  return price
}

/**
 * Start the oracle price feed loop.
 * Fetches and logs prices at the given interval (default: 60 seconds).
 */
export function startOracleLoop(intervalMs: number = 60_000): {
  stop: () => void
} {
  logInfo(`[oracle] Starting price feed loop (interval: ${intervalMs}ms)`)
  logInfo(`[oracle] Program: ${ORACLE_PROGRAM_ID}`)

  let running = true

  // Initial fetch
  oraclePriceCycle().catch(() => {
    // Best-effort on initial cycle
  })

  // Periodic fetch
  const timer = setInterval(async () => {
    if (!running) return
    await oraclePriceCycle().catch(() => {
      // Best-effort — don't crash the bot
    })
  }, intervalMs)

  return {
    stop: () => {
      running = false
      clearInterval(timer)
      logInfo('[oracle] Price feed loop stopped')
    },
  }
}
