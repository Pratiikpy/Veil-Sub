'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Activity,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Cloud,
  DollarSign,
  ExternalLink,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  TrendingDown,
  TrendingUp,
  Zap,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Database,
} from 'lucide-react'
import Link from 'next/link'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import { useContractExecute } from '@/hooks/useContractExecute'
import { toast } from 'sonner'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

// ── Constants ─────────────────────────────────────────────────────────

const COINGECKO_PRICE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=aleo&vs_currencies=usd&include_24hr_change=true'

const COINGECKO_HISTORY_URL =
  'https://api.coingecko.com/api/v3/coins/aleo/market_chart?vs_currency=usd&days=1'

const ORACLE_PROGRAM_ID = 'veilsub_oracle_v1.aleo'
const ALEOSCAN_URL = `https://testnet.aleoscan.io/program?id=${ORACLE_PROGRAM_ID}`

const MICRO_USD_SCALE = 1_000_000

import { HERO_GLOW_STYLE_SUBTLE as HERO_GLOW_STYLE, TITLE_STYLE as LETTER_SPACING_STYLE } from '@/lib/styles'

// ── Chart Theme ───────────────────────────────────────────────────────

const CHART_GRID_STROKE = 'rgba(255,255,255,0.05)'
const CHART_AXIS_TICK = { fill: 'rgba(255,255,255,0.4)', fontSize: 12 }
const CHART_VIOLET = '#ffffff'

// ── Types ─────────────────────────────────────────────────────────────

interface PriceInfo {
  usd: number
  change24h: number
}

interface HistoryPoint {
  time: string
  price: number
  timestamp: number
}

// ── Custom Tooltip ────────────────────────────────────────────────────

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#12121A] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium text-white">
          {entry.name}:{' '}
          <span className="text-white/70">${entry.value.toFixed(4)}</span>
        </p>
      ))}
    </div>
  )
}

// ── Example Tiers ─────────────────────────────────────────────────────

const EXAMPLE_TIERS = [
  { name: 'Supporter', usd: 3 },
  { name: 'Premium', usd: 10 },
  { name: 'VIP', usd: 25 },
  { name: 'Enterprise', usd: 100 },
]

// ── Main Page ─────────────────────────────────────────────────────────

export default function OraclePage() {
  const [price, setPrice] = useState<PriceInfo | null>(null)
  const [history, setHistory] = useState<readonly HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [priceError, setPriceError] = useState<string | null>(null)

  // Calculator state
  const [usdInput, setUsdInput] = useState('5.00')
  const [aleoResult, setAleoResult] = useState<number | null>(null)

  // ── On-Chain State ──────────────────────────────────────────────────
  const { address, connected, execute } = useContractExecute()

  // On-chain mapping data
  const [onChainPrice, setOnChainPrice] = useState<number | null>(null)
  const [onChainUpdatedAt, setOnChainUpdatedAt] = useState<number | null>(null)
  const [oracleAdmin, setOracleAdmin] = useState<string | null>(null)
  const [oracleInitialized, setOracleInitialized] = useState<boolean | null>(null)
  const [freshnessResult, setFreshnessResult] = useState<'fresh' | 'stale' | null>(null)

  // Transaction loading states
  const [initLoading, setInitLoading] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [tierCalcLoading, setTierCalcLoading] = useState(false)
  const [freshnessLoading, setFreshnessLoading] = useState(false)
  const [onChainQueryLoading, setOnChainQueryLoading] = useState(false)

  // Tier calculator inputs for on-chain computation
  const [tierCreatorHash, setTierCreatorHash] = useState('')
  const [tierNumber, setTierNumber] = useState('1')
  const [tierTargetUsd, setTierTargetUsd] = useState('5.00')

  // ── On-Chain Mapping Queries ────────────────────────────────────────

  const fetchOracleMapping = useCallback(
    async (mapping: string, key: string): Promise<string | null> => {
      try {
        const res = await fetch(
          `/api/aleo/program/${encodeURIComponent(ORACLE_PROGRAM_ID)}/mapping/${encodeURIComponent(mapping)}/${encodeURIComponent(key)}`
        )
        if (!res.ok) return null
        const text = await res.text()
        if (!text || text === 'null' || text === '') return null
        return text.replace(/"/g, '').trim()
      } catch {
        return null
      }
    },
    []
  )

  const refreshOnChainData = useCallback(async () => {
    setOnChainQueryLoading(true)
    try {
      const [priceRaw, updatedRaw, adminRaw] = await Promise.all([
        fetchOracleMapping('price_feed', '0u8'),
        fetchOracleMapping('price_updated_at', '0u8'),
        fetchOracleMapping('oracle_admin', 'true'),
      ])

      if (priceRaw) {
        const cleaned = priceRaw.replace(/u128$/, '')
        const val = parseInt(cleaned, 10)
        setOnChainPrice(isNaN(val) ? null : val)
      } else {
        setOnChainPrice(null)
      }

      if (updatedRaw) {
        const cleaned = updatedRaw.replace(/u32$/, '')
        const val = parseInt(cleaned, 10)
        setOnChainUpdatedAt(isNaN(val) ? null : val)
      } else {
        setOnChainUpdatedAt(null)
      }

      if (adminRaw) {
        setOracleAdmin(adminRaw)
        setOracleInitialized(true)
      } else {
        setOracleAdmin(null)
        setOracleInitialized(false)
      }
    } catch {
      // Query failed silently
    } finally {
      setOnChainQueryLoading(false)
    }
  }, [fetchOracleMapping])

  // Load on-chain data on mount and when wallet connects
  useEffect(() => {
    refreshOnChainData()
  }, [refreshOnChainData, connected])

  // ── On-Chain Actions ────────────────────────────────────────────────

  const handleInitializeOracle = useCallback(async () => {
    if (!connected || !address) {
      toast.error('Connect your wallet first')
      return
    }
    setInitLoading(true)
    try {
      const txId = await execute(
        'initialize_oracle',
        [address],
        1_500_000,
        ORACLE_PROGRAM_ID
      )
      if (txId) {
        toast.success('Oracle initialized! TX: ' + txId.slice(0, 12) + '...')
        // Refresh after a delay to let finalize complete
        setTimeout(refreshOnChainData, 15_000)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      toast.error('Initialize failed: ' + msg)
    } finally {
      setInitLoading(false)
    }
  }, [connected, address, execute, refreshOnChainData])

  const handlePushPrice = useCallback(async () => {
    if (!connected || !price) {
      toast.error(connected ? 'No price data available' : 'Connect your wallet first')
      return
    }
    setPushLoading(true)
    try {
      // Convert USD price to micro-USD (6 decimals)
      const microUsd = Math.round(price.usd * MICRO_USD_SCALE)
      const txId = await execute(
        'update_price',
        ['0u8', `${microUsd}u128`],
        1_500_000,
        ORACLE_PROGRAM_ID
      )
      if (txId) {
        toast.success('Price pushed on-chain! TX: ' + txId.slice(0, 12) + '...')
        setTimeout(refreshOnChainData, 15_000)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      toast.error('Push price failed: ' + msg)
    } finally {
      setPushLoading(false)
    }
  }, [connected, price, execute, refreshOnChainData])

  const handleComputeTierPrice = useCallback(async () => {
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    const creatorHash = tierCreatorHash.trim()
    const tier = parseInt(tierNumber, 10)
    const targetUsd = parseFloat(tierTargetUsd)
    if (!creatorHash || !creatorHash.endsWith('field')) {
      toast.error('Enter a valid creator hash (must end with "field")')
      return
    }
    if (isNaN(tier) || tier < 1 || tier > 20) {
      toast.error('Tier must be between 1 and 20')
      return
    }
    if (isNaN(targetUsd) || targetUsd <= 0) {
      toast.error('Enter a valid USD target price')
      return
    }
    setTierCalcLoading(true)
    try {
      const microUsd = Math.round(targetUsd * MICRO_USD_SCALE)
      const txId = await execute(
        'compute_tier_price',
        [creatorHash, `${tier}u8`, `${microUsd}u128`],
        1_500_000,
        ORACLE_PROGRAM_ID
      )
      if (txId) {
        toast.success('Tier price computed on-chain! TX: ' + txId.slice(0, 12) + '...')
        setTimeout(refreshOnChainData, 15_000)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      toast.error('Compute tier price failed: ' + msg)
    } finally {
      setTierCalcLoading(false)
    }
  }, [connected, tierCreatorHash, tierNumber, tierTargetUsd, execute, refreshOnChainData])

  const handleVerifyFreshness = useCallback(async () => {
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    setFreshnessLoading(true)
    setFreshnessResult(null)
    try {
      const txId = await execute(
        'verify_price_freshness',
        ['0u8'],
        1_500_000,
        ORACLE_PROGRAM_ID
      )
      if (txId) {
        // If the transaction succeeds, the price is fresh (the assert passed)
        setFreshnessResult('fresh')
        toast.success('Price is fresh! Verification TX: ' + txId.slice(0, 12) + '...')
      }
    } catch {
      // If the transaction fails, the assert failed — price is stale
      setFreshnessResult('stale')
      toast.error('Price is stale or not yet set. The on-chain freshness check failed.')
    } finally {
      setFreshnessLoading(false)
    }
  }, [connected, execute])

  const isAdmin = connected && address && oracleAdmin && address === oracleAdmin

  // Track whether component is mounted
  const mountedRef = useRef(true)
  // Throttle: minimum 120s between CoinGecko fetches to avoid rate-limiting
  const lastFetchRef = useRef(0)
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ── Fetch Price ─────────────────────────────────────────────────────

  const fetchPrice = useCallback(async () => {
    // Throttle: skip if last fetch was less than 120s ago
    if (Date.now() - lastFetchRef.current < 120_000) return
    lastFetchRef.current = Date.now()
    setLoading(true)
    try {
      const res = await fetch(COINGECKO_PRICE_URL)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const usd = data?.aleo?.usd
      const change24h = data?.aleo?.usd_24h_change ?? 0
      if (typeof usd === 'number' && Number.isFinite(usd) && usd > 0) {
        if (!mountedRef.current) return
        setPrice({ usd, change24h })
        setPriceError(null)
        setLastUpdated(new Date().toLocaleTimeString())
      }
    } catch {
      if (mountedRef.current) setPriceError('Price data temporarily unavailable')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // ── Fetch History ───────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(COINGECKO_HISTORY_URL)
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data?.prices)) return
      const points: HistoryPoint[] = (
        data.prices as [number, number][]
      ).map(([ts, p]) => ({
        time: new Date(ts).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        price: p,
        timestamp: ts,
      }))
      if (mountedRef.current) setHistory(points)
    } catch {
      // Silently fail
    } finally {
      if (mountedRef.current) setHistoryLoading(false)
    }
  }, [])

  // ── Initial Load + Refresh ──────────────────────────────────────────

  useEffect(() => {
    fetchPrice()
    fetchHistory()
    const interval = setInterval(fetchPrice, 120_000)
    return () => clearInterval(interval)
  }, [fetchPrice, fetchHistory])

  // ── Calculator ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!price) {
      setAleoResult(null)
      return
    }
    const usd = parseFloat(usdInput)
    if (!Number.isFinite(usd) || usd <= 0) {
      setAleoResult(null)
      return
    }
    setAleoResult(usd / price.usd)
  }, [usdInput, price])

  // ── Derived Values ──────────────────────────────────────────────────

  const priceUp = (price?.change24h ?? 0) >= 0
  const TrendIcon = priceUp ? TrendingUp : TrendingDown
  const trendColor = priceUp ? 'text-emerald-400' : 'text-red-400'
  const trendBg = priceUp
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : 'bg-red-500/10 border-red-500/20'

  return (
    <PageTransition>
      <main className="min-h-screen bg-background py-12 sm:py-16 relative">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
          style={HERO_GLOW_STYLE}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ── Header ────────────────────────────────────────── */}

          <div className="mb-8 sm:mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10">
                <Zap className="w-5 h-5 text-white/60" aria-hidden="true" />
              </div>
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                Oracle Integration
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
              style={LETTER_SPACING_STYLE}
            >
              Price Oracle
            </h1>
            <p className="text-white/70 text-base max-w-2xl leading-relaxed">
              Subscription prices can be set in USD. The oracle converts to ALEO
              at the current market rate, solving the volatile pricing problem
              for creators and subscribers.
            </p>
          </div>

          {/* ── Price Display ─────────────────────────────────── */}

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 sm:mb-16">
            {/* Current Price — Large */}
            <GlassCard className="md:col-span-2" hover={false}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <DollarSign
                    className="w-4 h-4 text-white/60"
                    aria-hidden="true"
                  />
                  <span className="text-xs text-white/60 uppercase tracking-wider">
                    ALEO / USD
                  </span>
                </div>
                <button
                  onClick={() => {
                    fetchPrice()
                    fetchHistory()
                  }}
                  disabled={loading}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/70 transition-all disabled:opacity-50"
                  title="Refresh price"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {loading && !price ? (
                <div className="flex items-center gap-4">
                  <div className="h-12 w-40 bg-white/[0.06] rounded animate-pulse" />
                  <div className="h-6 w-24 bg-white/[0.06] rounded animate-pulse" />
                </div>
              ) : price ? (
                <div className="flex items-baseline gap-4 flex-wrap">
                  <span className="text-5xl sm:text-6xl font-bold text-white tabular-nums">
                    ${price.usd.toFixed(4)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${trendBg} ${trendColor}`}
                  >
                    <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {Math.abs(price.change24h).toFixed(2)}%
                    <span className="text-xs opacity-70">24h</span>
                  </span>
                </div>
              ) : (
                <p className="text-white/50 text-lg">
                  {priceError || 'Unable to fetch price data'}
                </p>
              )}

              {lastUpdated && (
                <p className="text-xs text-white/60 mt-4 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  Last updated: {lastUpdated}
                </p>
              )}
            </GlassCard>

            {/* Side Stats */}
            <div className="flex flex-col gap-4">
              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-3">
                  <Activity
                    className="w-4 h-4 text-emerald-400"
                    aria-hidden="true"
                  />
                  <span className="text-xs text-white/60 uppercase tracking-wider">
                    Micro-USD
                  </span>
                </div>
                <p className="text-2xl font-semibold text-white tabular-nums">
                  {price
                    ? Math.round(price.usd * MICRO_USD_SCALE).toLocaleString()
                    : '---'}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  6 decimal precision
                </p>
              </GlassCard>

              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck
                    className="w-4 h-4 text-white/60"
                    aria-hidden="true"
                  />
                  <span className="text-xs text-white/60 uppercase tracking-wider">
                    Oracle
                  </span>
                </div>
                <p className="text-sm font-medium text-white mb-1">
                  SGX Attested
                </p>
                <p className="text-xs text-white/50">
                  official_oracle_v2.aleo
                </p>
              </GlassCard>
            </div>
          </section>

          {/* ── Price History Chart ────────────────────────────── */}

          <section className="mb-10 sm:mb-16">
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp
                    className="w-4 h-4 text-white/60"
                    aria-hidden="true"
                  />
                  <h2 className="text-sm font-medium text-white">
                    24-Hour Price History
                  </h2>
                </div>
                {history.length > 0 && (
                  <span className="text-xs text-white/50 bg-white/[0.04] px-3 py-1 rounded-full">
                    {history.length} data points
                  </span>
                )}
              </div>

              {historyLoading ? (
                <div className="animate-pulse" style={{ height: 280 }}>
                  <div className="flex items-end gap-1 h-full px-2">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-white/[0.04] rounded-t"
                        style={{
                          height: `${20 + Math.random() * 60}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : history.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={history as HistoryPoint[]}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="priceGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={CHART_VIOLET}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={CHART_VIOLET}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_GRID_STROKE}
                    />
                    <XAxis
                      dataKey="time"
                      tick={CHART_AXIS_TICK}
                      axisLine={{ stroke: CHART_GRID_STROKE }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={CHART_AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                    />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="price"
                      name="ALEO"
                      stroke={CHART_VIOLET}
                      strokeWidth={2}
                      fill="url(#priceGradient)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: CHART_VIOLET,
                        stroke: '#fff',
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px]">
                  <div className="text-center">
                    <TrendingUp
                      className="w-8 h-8 text-white/20 mx-auto mb-2"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-white/50">
                      Price history unavailable
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      CoinGecko API may be rate-limited
                    </p>
                  </div>
                </div>
              )}
            </GlassCard>
          </section>

          {/* ── Dynamic Pricing Calculator ─────────────────────── */}

          <section className="mb-10 sm:mb-16">
            <h2 className="text-lg font-medium text-white mb-6 sm:mb-8">
              Dynamic Pricing Calculator
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Calculator Input */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-6">
                  <ArrowRightLeft
                    className="w-4 h-4 text-white/60"
                    aria-hidden="true"
                  />
                  <h3 className="text-sm font-medium text-white">
                    USD to ALEO
                  </h3>
                </div>

                <div className="space-y-6">
                  {/* USD Input */}
                  <div>
                    <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">
                      Subscription Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-lg">
                        $
                      </span>
                      <input
                        type="number"
                        value={usdInput}
                        onChange={(e) => setUsdInput(e.target.value)}
                        min="0.01"
                        step="0.01"
                        className="w-full pl-10 pr-4 py-4 bg-white/[0.04] border border-white/10 rounded-xl text-white text-2xl font-semibold tabular-nums focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                        placeholder="5.00"
                      />
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="p-2 rounded-full bg-white/[0.06] border border-white/10">
                      <ArrowRight
                        className="w-4 h-4 text-white/60"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* ALEO Output */}
                  <div>
                    <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">
                      Equivalent in ALEO
                    </label>
                    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                      <p className="text-2xl font-bold text-white/70 tabular-nums">
                        {aleoResult !== null
                          ? `${aleoResult.toFixed(4)} ALEO`
                          : '---'}
                      </p>
                      {aleoResult !== null && (
                        <p className="text-xs text-white/50 mt-1 tabular-nums">
                          {Math.round(
                            aleoResult * MICRO_USD_SCALE
                          ).toLocaleString()}{' '}
                          microcredits
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Example Tiers */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-6">
                  <DollarSign
                    className="w-4 h-4 text-emerald-400"
                    aria-hidden="true"
                  />
                  <h3 className="text-sm font-medium text-white">
                    Example Tier Prices
                  </h3>
                </div>

                <div className="space-y-0">
                  {EXAMPLE_TIERS.map((tier, i) => {
                    const aleoAmount = price
                      ? tier.usd / price.usd
                      : null
                    return (
                      <div
                        key={tier.name}
                        className={`flex items-center justify-between py-4 ${
                          i < EXAMPLE_TIERS.length - 1
                            ? 'border-b border-white/[0.05]'
                            : ''
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-white">
                            {tier.name}
                          </p>
                          <p className="text-xs text-white/50">
                            ${tier.usd.toFixed(2)} / month
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white/70 tabular-nums">
                            {aleoAmount !== null
                              ? `${aleoAmount.toFixed(4)} ALEO`
                              : '---'}
                          </p>
                          {aleoAmount !== null && (
                            <p className="text-xs text-white/50 tabular-nums">
                              {Math.round(
                                aleoAmount * MICRO_USD_SCALE
                              ).toLocaleString()}{' '}
                              mc
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-white/50 leading-relaxed">
                    Prices auto-adjust every time the oracle updates. Creators
                    set USD targets; subscribers always pay the fair ALEO
                    equivalent.
                  </p>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* ── On-Chain Oracle ─────────────────────────────────── */}

          <section className="mb-10 sm:mb-16">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-medium text-white">
                  On-Chain Oracle
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300">
                  On-Chain
                </span>
              </div>
              <button
                onClick={refreshOnChainData}
                disabled={onChainQueryLoading}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/70 transition-all disabled:opacity-50"
                title="Refresh on-chain data"
              >
                <RefreshCw
                  className={`w-4 h-4 ${onChainQueryLoading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* On-Chain vs Off-Chain Comparison */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* Off-Chain (CoinGecko) */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-4">
                  <Cloud className="w-4 h-4 text-blue-400" aria-hidden="true" />
                  <span className="text-xs text-white/60 uppercase tracking-wider">
                    Off-Chain (CoinGecko)
                  </span>
                </div>
                <p className="text-3xl font-bold text-white tabular-nums mb-1">
                  {price ? `$${price.usd.toFixed(4)}` : '---'}
                </p>
                <p className="text-xs text-white/50">
                  {price
                    ? `${Math.round(price.usd * MICRO_USD_SCALE).toLocaleString()} micro-USD`
                    : 'Fetching...'}
                </p>
                {lastUpdated && (
                  <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {lastUpdated}
                  </p>
                )}
              </GlassCard>

              {/* On-Chain */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-4 h-4 text-violet-400" aria-hidden="true" />
                  <span className="text-xs text-white/60 uppercase tracking-wider">
                    On-Chain (price_feed)
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300">
                    On-Chain
                  </span>
                </div>
                {onChainQueryLoading ? (
                  <div className="h-9 w-32 bg-white/[0.06] rounded animate-pulse" />
                ) : onChainPrice !== null ? (
                  <>
                    <p className="text-3xl font-bold text-white tabular-nums mb-1">
                      ${(onChainPrice / MICRO_USD_SCALE).toFixed(4)}
                    </p>
                    <p className="text-xs text-white/50">
                      {onChainPrice.toLocaleString()} micro-USD
                    </p>
                  </>
                ) : (
                  <p className="text-xl text-white/40">No price on-chain yet</p>
                )}
                {onChainUpdatedAt !== null && (
                  <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    Block #{onChainUpdatedAt.toLocaleString()}
                  </p>
                )}
              </GlassCard>
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-4">

              {/* 1. Initialize Oracle (Admin) */}
              {connected && oracleInitialized === false && (
                <GlassCard hover={false}>
                  <div className="flex items-center gap-2 mb-4">
                    <Lock className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    <h3 className="text-sm font-medium text-white">
                      Initialize Oracle
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">
                      Admin
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mb-4 leading-relaxed">
                    One-time setup: sets your wallet as the oracle admin. Only the
                    admin can push price updates on-chain.
                  </p>
                  <button
                    onClick={handleInitializeOracle}
                    disabled={initLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {initLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Initializing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" aria-hidden="true" />
                        Initialize Oracle (set admin)
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-white/40 mt-2 text-center">
                    Fee: ~1.5 ALEO
                  </p>
                </GlassCard>
              )}

              {/* 2. Push Price On-Chain (Admin) */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-4">
                  <Send className="w-4 h-4 text-violet-400" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-white">
                    Push Price On-Chain
                  </h3>
                  {isAdmin && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50 mb-3 leading-relaxed">
                  Write the current CoinGecko price to the on-chain{' '}
                  <code className="text-violet-300/80 bg-violet-500/10 px-1 rounded">
                    price_feed
                  </code>{' '}
                  mapping. Only the oracle admin can execute this.
                </p>
                {price && (
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Price to push:</span>
                      <span className="text-white font-medium tabular-nums">
                        ${price.usd.toFixed(4)} ({Math.round(price.usd * MICRO_USD_SCALE).toLocaleString()} micro-USD)
                      </span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handlePushPrice}
                  disabled={pushLoading || !connected || !price}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {pushLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Pushing price...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" aria-hidden="true" />
                      Push Price On-Chain
                    </>
                  )}
                </button>
                {!connected && (
                  <p className="text-[11px] text-amber-400/70 mt-2 text-center">
                    Connect your wallet to push prices
                  </p>
                )}
              </GlassCard>

              {/* 3. Compute Tier Price On-Chain */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-white">
                    Compute Tier Price On-Chain
                  </h3>
                </div>
                <p className="text-xs text-white/50 mb-4 leading-relaxed">
                  Calculate the ALEO microcredit equivalent for a creator&apos;s tier
                  at a USD target. Writes to{' '}
                  <code className="text-violet-300/80 bg-violet-500/10 px-1 rounded">
                    dynamic_tier_price
                  </code>{' '}
                  mapping.
                </p>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-[11px] text-white/50 uppercase tracking-wider mb-1 block">
                      Creator Hash
                    </label>
                    <input
                      type="text"
                      value={tierCreatorHash}
                      onChange={(e) => setTierCreatorHash(e.target.value)}
                      placeholder="123...field"
                      className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-white/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-white/50 uppercase tracking-wider mb-1 block">
                        Tier (1-20)
                      </label>
                      <input
                        type="number"
                        value={tierNumber}
                        onChange={(e) => setTierNumber(e.target.value)}
                        min="1"
                        max="20"
                        className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm tabular-nums focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-white/50 uppercase tracking-wider mb-1 block">
                        Target USD
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                          $
                        </span>
                        <input
                          type="number"
                          value={tierTargetUsd}
                          onChange={(e) => setTierTargetUsd(e.target.value)}
                          min="0.01"
                          step="0.01"
                          className="w-full pl-7 pr-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm tabular-nums focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleComputeTierPrice}
                  disabled={tierCalcLoading || !connected}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {tierCalcLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Computing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" aria-hidden="true" />
                      Calculate On-Chain
                    </>
                  )}
                </button>
                {!connected && (
                  <p className="text-[11px] text-amber-400/70 mt-2 text-center">
                    Connect your wallet to compute tier prices
                  </p>
                )}
              </GlassCard>

              {/* 4. Verify Price Freshness */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-violet-400" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-white">
                    Verify Price Freshness
                  </h3>
                </div>
                <p className="text-xs text-white/50 mb-4 leading-relaxed">
                  Check whether the on-chain ALEO price is still fresh (updated
                  within the 1000-block staleness window, ~50 minutes). The
                  contract asserts freshness on-chain.
                </p>

                {freshnessResult && (
                  <div
                    className={`p-3 rounded-lg border mb-4 flex items-center gap-2 ${
                      freshnessResult === 'fresh'
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    {freshnessResult === 'fresh' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                        <span className="text-sm text-emerald-300 font-medium">
                          Price is fresh
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden="true" />
                        <span className="text-sm text-red-300 font-medium">
                          Price is stale or missing
                        </span>
                      </>
                    )}
                  </div>
                )}

                <button
                  onClick={handleVerifyFreshness}
                  disabled={freshnessLoading || !connected}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {freshnessLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      Verify Price Freshness
                    </>
                  )}
                </button>
                {!connected && (
                  <p className="text-[11px] text-amber-400/70 mt-2 text-center">
                    Connect your wallet to verify freshness
                  </p>
                )}
              </GlassCard>
            </div>

            {/* Oracle Status Bar */}
            <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 flex-wrap text-xs">
                  <span className="text-white/50">
                    Program:{' '}
                    <code className="text-violet-300/80 bg-violet-500/10 px-1.5 py-0.5 rounded font-mono">
                      {ORACLE_PROGRAM_ID}
                    </code>
                  </span>
                  <span className="text-white/50">
                    Admin:{' '}
                    {oracleAdmin ? (
                      <code className="text-emerald-300/80 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                        {oracleAdmin.slice(0, 10)}...{oracleAdmin.slice(-6)}
                      </code>
                    ) : (
                      <span className="text-amber-400/70">Not initialized</span>
                    )}
                  </span>
                  {connected && (
                    <span className="text-white/50">
                      Role:{' '}
                      {isAdmin ? (
                        <span className="text-emerald-300 font-medium">Admin</span>
                      ) : (
                        <span className="text-white/60">Viewer</span>
                      )}
                    </span>
                  )}
                </div>
                <a
                  href={ALEOSCAN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                >
                  View on AleoScan
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>

          {/* ── How It Works ───────────────────────────────────── */}

          <section className="mb-10 sm:mb-16">
            <h2 className="text-lg font-medium text-white mb-6 sm:mb-8">
              How It Works
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              <GlassCard delay={0}>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-sm font-bold text-white/60">1</span>
                  </div>
                  <p className="text-sm font-medium text-white mb-2">
                    Price Feed
                  </p>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Bot fetches ALEO/USD price from CoinGecko every 60 seconds
                  </p>
                </div>
              </GlassCard>

              <GlassCard delay={0.05}>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-sm font-bold text-white/60">2</span>
                  </div>
                  <p className="text-sm font-medium text-white mb-2">
                    On-Chain Update
                  </p>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Price stored in oracle contract with anti-manipulation guards
                  </p>
                </div>
              </GlassCard>

              <GlassCard delay={0.1}>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-sm font-bold text-white/60">3</span>
                  </div>
                  <p className="text-sm font-medium text-white mb-2">
                    Tier Conversion
                  </p>
                  <p className="text-xs text-white/50 leading-relaxed">
                    USD tier prices converted to ALEO microcredits at current
                    rate
                  </p>
                </div>
              </GlassCard>

              <GlassCard delay={0.15}>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-sm font-bold text-white/60">4</span>
                  </div>
                  <p className="text-sm font-medium text-white mb-2">
                    Fair Pricing
                  </p>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Subscribers pay stable USD value regardless of ALEO
                    volatility
                  </p>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* ── Oracle Architecture ────────────────────────────── */}

          <section className="mb-10 sm:mb-16">
            <h2 className="text-lg font-medium text-white mb-6 sm:mb-8">
              Oracle Architecture
            </h2>
            <GlassCard hover={false}>
              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <ShieldCheck
                      className="w-4 h-4 text-white/60"
                      aria-hidden="true"
                    />
                    Contract Features
                  </h3>
                  <ul className="space-y-3 text-sm text-white/60">
                    <li className="flex items-start gap-2">
                      <span className="text-white/60 mt-0.5">*</span>
                      <span>
                        4 mappings: price_feed, price_updated_at,
                        dynamic_tier_price, oracle_admin
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/60 mt-0.5">*</span>
                      <span>
                        5 transitions: initialize, update_price,
                        compute_tier_price, verify_freshness,
                        read_oracle_attestation
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/60 mt-0.5">*</span>
                      <span>
                        Anti-manipulation: max 50% price deviation per update
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/60 mt-0.5">*</span>
                      <span>
                        Staleness detection: 1000-block freshness window
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/60 mt-0.5">*</span>
                      <span>
                        Imports official_oracle_v2.aleo (SGX/Nitro attested)
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <Zap
                      className="w-4 h-4 text-emerald-400"
                      aria-hidden="true"
                    />
                    Bot Features
                  </h3>
                  <ul className="space-y-3 text-sm text-white/60">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">*</span>
                      <span>
                        CoinGecko price feed (free, no API key needed)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">*</span>
                      <span>60-second polling interval for real-time data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">*</span>
                      <span>
                        Dynamic tier price calculation for any USD target
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">*</span>
                      <span>
                        Multi-token support: ALEO, USDCx, USAD price tracking
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">*</span>
                      <span>
                        Graceful error handling — never crashes on API failure
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </GlassCard>
          </section>

          {/* ── CTA: View on AleoScan ──────────────────────────── */}

          <section>
            <div className="rounded-2xl glass p-8 text-center">
              <Zap
                className="w-8 h-8 text-white/60 mx-auto mb-4"
                aria-hidden="true"
              />
              <h3 className="text-xl font-semibold text-white mb-2">
                View Oracle Contract
              </h3>
              <p className="text-sm text-white/60 max-w-md mx-auto mb-4">
                Inspect the oracle program on AleoScan. All price feeds, tier
                calculations, and attestation data are fully transparent and
                verifiable.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <a
                  href={ALEOSCAN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 active:scale-[0.98] transition-all btn-shimmer"
                >
                  View on AleoScan
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
                <Link
                  href="/explorer"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white/[0.06] border border-white/10 text-white font-medium text-sm hover:bg-white/[0.1] transition-all"
                >
                  On-Chain Explorer
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </PageTransition>
  )
}
