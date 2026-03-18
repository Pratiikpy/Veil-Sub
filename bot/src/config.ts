import type { BotConfig, LogLevel } from './types.js'

// ─── Known Creator Hashes ───────────────────────────────────────────────────
// Poseidon2 hashes of creator addresses, matching frontend/src/lib/config.ts
// On-chain mappings are field-keyed, not address-keyed.

const KNOWN_CREATORS: ReadonlyArray<{
  readonly address: string
  readonly hash: string
  readonly label: string
}> = [
  {
    address: 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk',
    hash: '7077346389288357645876044527218031735459465201928260558184537791016616885101field',
    label: 'Prateek (VeilSub Creator)',
  },
  {
    address: 'aleo1yr9ls3d48sh0gkk8y4re9assy7rkfhp4g8x2jmd5vqxl0phdvyqq4qmhef',
    hash: '3841729056385047291654830276193548207653418906732580174629351084726503917284field',
    label: 'ZK Research Lab',
  },
  {
    address: 'aleo1k7a5cx9t3wwej6v4h0mr2dgn8ys4pd3qx7lfk4zhrs6ep2wvc5psg9nxzm',
    hash: '9215487360274185693042756183094527306418259730648120537946283015749860321547field',
    label: 'Leo Dev Academy',
  },
  {
    address: 'aleo1kurx4vfrjy6u69lglu2amvk2k3apyh7g7axpfvvqcvasfln33gqqy5rv2e',
    hash: '5895434346742188517605628668414418785502575139839733911875586046449923524635field',
    label: 'rv2e wallet',
  },
  {
    address: 'aleo106ygg5lkjxzqpdq4wuqs4fm70x8k4f5zhpc09v94446skhyxfgxq7l69jv',
    hash: '6667118947464322835377798793181341354884558228623076445743274861392728625785field',
    label: '69jv wallet',
  },
]

// ─── Environment Parsing ────────────────────────────────────────────────────

function envString(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim()
  if (!raw) return fallback
  const parsed = parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function envLogLevel(key: string, fallback: LogLevel): LogLevel {
  const raw = process.env[key]?.trim()?.toLowerCase()
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw
  }
  return fallback
}

// ─── Build Config ───────────────────────────────────────────────────────────

export function buildConfig(): BotConfig {
  return Object.freeze({
    programId: envString('PROGRAM_ID', 'veilsub_v28.aleo'),
    apiUrl: envString('API_URL', 'https://api.explorer.provable.com/v1/testnet'),
    pollIntervalMs: envInt('POLL_INTERVAL_MS', 30_000),
    webhookUrl: envString('WEBHOOK_URL', ''),
    supabaseUrl: envString('SUPABASE_URL', ''),
    supabaseKey: envString('SUPABASE_KEY', ''),
    logLevel: envLogLevel('LOG_LEVEL', 'info'),
    trackedCreators: KNOWN_CREATORS,
  })
}

// ─── Mapping Names ──────────────────────────────────────────────────────────
// These match the 26 mappings in veilsub_v28.aleo

export const MAPPINGS = {
  // Creator mappings (keyed by creator_hash: field)
  CREATOR_REGISTERED: 'creator_registered',
  SUBSCRIBER_COUNT: 'subscriber_count',
  TOTAL_REVENUE: 'total_revenue',
  CONTENT_COUNT: 'content_count',
  TIER_COUNT: 'tier_count',
  PLATFORM_FEES: 'platform_fees',
  CREATOR_REVENUE: 'creator_revenue',

  // Content mappings
  CONTENT_META: 'content_meta',
  CONTENT_DISPUTES: 'content_disputes',
  CONTENT_ENCRYPTED: 'content_encrypted',

  // Subscription mappings
  PASS_CREATOR: 'pass_creator',
  PASS_REVOKED: 'pass_revoked',

  // Platform singletons (keyed by 0u8)
  TOTAL_CREATORS: 'total_creators',
  TOTAL_CONTENT: 'total_content',

  // Trial tracking
  TRIAL_USED: 'trial_used',

  // Tipping
  TIP_COMMITMENTS: 'tip_commitments',
} as const
