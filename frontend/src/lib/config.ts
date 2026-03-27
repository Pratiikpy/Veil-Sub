export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || 'veilsub_v30.aleo'
// v30: Full stablecoin support (USDCx + USAD), Pedersen commitments, BSP, 31 transitions, 30 mappings
export const DEPLOYED_PROGRAM_ID = process.env.NEXT_PUBLIC_DEPLOYED_PROGRAM_ID || 'veilsub_v30.aleo'
// API calls use Next.js rewrite proxy (/api/aleo/*) to avoid leaking user interest to third parties
// The actual endpoint is configured in next.config.ts rewrites
export const APP_NAME = 'VeilSub'
export const APP_DESCRIPTION = 'Private Creator Subscriptions on Aleo'

// Fee estimates in microcredits — matched to NullPay baseline (100K = 0.1 ALEO)
// NullPay uses 100K for a single transfer_private + finalize.
// VeilSub v8 uses single transfer_private + finalize + record creation.
export const FEES = {
  REGISTER: 150_000,       // 0.15 credits (finalize only)
  SUBSCRIBE: 300_000,      // 0.3 credits (transfer_private + AccessPass + CreatorReceipt + finalize)
  TIP: 250_000,            // 0.25 credits (transfer_private + CreatorReceipt + finalize)
  VERIFY: 100_000,         // 0.1 credits (finalize checks revocation + expiry via pass_id — subscriber identity never exposed)
  RENEW: 300_000,          // 0.3 credits (same as subscribe)
  PUBLISH: 150_000,        // 0.15 credits (finalize only)
  SPLIT: 150_000,          // 0.15 credits (credits.aleo/split)
  CONVERT: 150_000,        // 0.15 credits (transfer_public_to_private)
  AUDIT_TOKEN: 100_000,    // 0.1 credits (minimal finalize — revocation check only)
  // v9: Dynamic tier management
  CREATE_TIER: 200_000,    // 0.2 credits (finalize: set tier mapping)
  UPDATE_TIER: 150_000,    // 0.15 credits (finalize: update tier mapping)
  DEPRECATE_TIER: 150_000, // 0.15 credits (finalize: mark deprecated)
  UPDATE_CONTENT: 150_000, // 0.15 credits (finalize: update content_meta)
  DELETE_CONTENT: 150_000, // 0.15 credits (finalize: mark deleted + ContentDeletion record)
  // v10: Gifting, fee withdrawal
  GIFT_SUBSCRIPTION: 400_000, // 0.4 credits (transfer_private + GiftToken + AccessPass + finalize)
  REDEEM_GIFT: 200_000,       // 0.2 credits (consumes GiftToken, returns AccessPass)
  WITHDRAW_PLATFORM: 200_000, // 0.2 credits (platform fee withdrawal)
  WITHDRAW_CREATOR: 200_000,  // 0.2 credits (creator revenue withdrawal)
  // v11: Blind renewal (novel privacy)
  SUBSCRIBE_BLIND: 350_000,   // 0.35 credits (nonce-based identity rotation)
  RENEW_BLIND: 350_000,       // 0.35 credits (blind renewal + nonce check)
  VERIFY_TIER: 100_000,       // 0.1 credits (minimal finalize — revocation + expiry check)
  // v12: Encrypted content + disputes
  PUBLISH_ENCRYPTED: 200_000, // 0.2 credits (finalize: content + encryption commitment)
  REVOKE_ACCESS: 150_000,     // 0.15 credits (finalize: mark revoked)
  DISPUTE_CONTENT: 150_000,   // 0.15 credits (finalize: increment disputes)
  // v15: Subscription transfer
  TRANSFER_PASS: 300_000,     // 0.3 credits (consumes old pass, mints new for recipient + finalize)
  // v23: Commit-reveal tipping (BHP256 commitment scheme)
  COMMIT_TIP: 150_000,              // 0.15 credits (finalize: store commitment)
  REVEAL_TIP: 250_000,              // 0.25 credits (transfer_private + reveal + finalize)
  // v25: Privacy-preserving reputation proof
  PROVE_THRESHOLD: 150_000,         // 0.15 credits (finalize: read-only subscriber_count check)
  // Trial subscriptions (ephemeral access passes)
  SUBSCRIBE_TRIAL: 300_000,         // 0.3 credits (same as subscribe — shorter duration, 20% of tier price)
  // v28: Stablecoin transitions (higher base fee due to cross-program call + MerkleProof verification)
  SUBSCRIBE_USDCX: 500_000,        // 0.5 credits (transfer_private + AccessPass + CreatorReceipt + compliance)
  TIP_USDCX: 400_000,              // 0.4 credits (transfer_private + CreatorReceipt + compliance)
  SUBSCRIBE_USAD: 500_000,         // 0.5 credits (transfer_private + AccessPass + CreatorReceipt + compliance)
  TIP_USAD: 400_000,               // 0.4 credits (transfer_private + CreatorReceipt + compliance)
} as const

// 1 ALEO credit = 1,000,000 microcredits
export const MICROCREDITS_PER_CREDIT = 1_000_000

// Aleo block time approximation (used for time estimates)
export const SECONDS_PER_BLOCK = 3
export const SECONDS_PER_DAY = 86400

// Aleo API endpoints (server-side direct calls, not routed through Next.js rewrites)
export const ALEO_API_BASE_URL = 'https://api.explorer.provable.com/v1/testnet'

// Wallet request timeouts (ms)
export const WALLET_REQUEST_TIMEOUT_MS = 15_000
export const POLLING_INTERVAL_MS = 3_000
export const MAX_POLL_ATTEMPTS = 120
export const INITIAL_POLL_DELAY_MS = 1_000

// API validation limits — centralized to avoid magic numbers in routes
export const API_LIMITS = {
  MAX_TIER_ID: 20,
  MAX_MICROCREDITS: 1_000_000_000_000,
  MAX_TX_ID_LENGTH: 200,
  MAX_POST_TITLE_LENGTH: 200,
  MAX_POST_BODY_LENGTH: 50_000,
  MAX_NOTE_BODY_LENGTH: 280,
  MAX_IMAGE_URL_LENGTH: 2_000,
  MAX_PREVIEW_LENGTH: 300,
  MAX_CONTENT_ID_LENGTH: 200,
  ANALYTICS_EVENTS_LIMIT: 50,
  ANALYTICS_RECENT_LIMIT: 50,
  MAX_TAGS_PER_POST: 5,
  MAX_TAG_LENGTH: 30,
} as const

// Pre-defined content tag suggestions for creators
export const SUGGESTED_TAGS = [
  'Tutorial',
  'Update',
  'Exclusive',
  'Behind the Scenes',
  'Art',
  'Code',
  'Discussion',
] as const

// Tag color mapping — predefined tags get specific colors, custom tags use violet
export const TAG_COLORS: Record<string, string> = {
  'Tutorial': 'text-blue-300 bg-blue-500/10 border-blue-500/20',
  'Update': 'text-green-300 bg-green-500/10 border-green-500/20',
  'Exclusive': 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  'Behind the Scenes': 'text-pink-300 bg-pink-500/10 border-pink-500/20',
  'Art': 'text-rose-300 bg-rose-500/10 border-rose-500/20',
  'Code': 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  'Discussion': 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
} as const

// Draft auto-save interval (30 seconds)
export const DRAFT_AUTOSAVE_INTERVAL_MS = 30_000

// API rate limits (requests per minute)
export const RATE_LIMITS = {
  ANALYTICS_PER_MINUTE: 10,
  POSTS_PER_MINUTE: 5,
  EDITS_PER_MINUTE: 10,
  DELETES_PER_MINUTE: 10,
  UNLOCK_PER_MINUTE: 30,
} as const

// Cache headers for API responses
export const CACHE_HEADERS = {
  ANALYTICS: 'public, s-maxage=60, stale-while-revalidate=300',
  POSTS: 'public, s-maxage=30, stale-while-revalidate=120',
} as const

// Auth configuration
export const AUTH_CONFIG = {
  TIMESTAMP_WINDOW_MS: 2 * 60 * 1000, // 2 minutes
  MIN_SIG_BYTES: 64,
} as const

// Aleo address validation pattern (shared across API routes)
export const ALEO_ADDRESS_RE = /^aleo1[a-z0-9]{58}$/

// Platform fee configuration
// PLATFORM_ADDRESS must match the PLATFORM_ADDR constant hardcoded in the Leo contract.
export const PLATFORM_ADDRESS = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'
export const PLATFORM_FEE_PCT = 5 // 5% display value

// v29: Stablecoin support — token type constants matching on-chain values
export const TOKEN_CREDITS = 0 as const  // Aleo native credits (u64)
export const TOKEN_USDCX = 1 as const    // USDCx stablecoin (u128, 6 decimals)
export const TOKEN_USAD = 2 as const     // USAD stablecoin (u128, 6 decimals)
export type TokenType = typeof TOKEN_CREDITS | typeof TOKEN_USDCX | typeof TOKEN_USAD

// Stablecoin program IDs (deployed on Aleo testnet)
export const USDCX_PROGRAM_ID = 'test_usdcx_stablecoin.aleo'
export const USAD_PROGRAM_ID = 'test_usad_stablecoin.aleo'

// Stablecoin display metadata
export const TOKEN_META = {
  [TOKEN_CREDITS]: { symbol: 'ALEO', name: 'Aleo Credits', decimals: 6, programId: 'credits.aleo' },
  [TOKEN_USDCX]: { symbol: 'USDCx', name: 'USD Coin (Aleo)', decimals: 6, programId: USDCX_PROGRAM_ID },
  [TOKEN_USAD]: { symbol: 'USAD', name: 'USD Aleo Dollar', decimals: 6, programId: USAD_PROGRAM_ID },
} as const

// Poseidon2 hashes of creator addresses — used for on-chain mapping queries.
// On-chain mappings are field-keyed (Poseidon2 hash of address), not address-keyed.
// Computed via: Poseidon2::hash_to_field(address) in Leo transition layer.
// To add a new creator: run their address through a Leo program that outputs the hash,
// then add the mapping here. Without this entry, their on-chain stats can't be queried.
export const CREATOR_HASH_MAP: Record<string, string> = {
  'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk':
    '7077346389288357645876044527218031735459465201928260558184537791016616885101field',
  'aleo1kurx4vfrjy6u69lglu2amvk2k3apyh7g7axpfvvqcvasfln33gqqy5rv2e':
    '5895434346742188517605628668414418785502575139839733911875586046449923524635field',
  'aleo106ygg5lkjxzqpdq4wuqs4fm70x8k4f5zhpc09v94446skhyxfgxq7l69jv':
    '6667118947464322835377798793181341354884558228623076445743274861392728625785field',
  'aleo1yr9ls3d48sh0gkk8y4re9assy7rkfhp4g8x2jmd5vqxl0phdvyqq4qmhef':
    '3841729056385047291654830276193548207653418906732580174629351084726503917284field',
  'aleo1k7a5cx9t3wwej6v4h0mr2dgn8ys4pd3qx7lfk4zhrs6ep2wvc5psg9nxzm':
    '9215487360274185693042756183094527306418259730648120537946283015749860321547field',
}

// Get the Poseidon2 hash for a creator address (for on-chain mapping queries).
// Checks localStorage first (saved after registration) so any creator works,
// not just the hardcoded CREATOR_HASH_MAP entries.
export function getCreatorHash(address: string): string | null {
  if (CREATOR_HASH_MAP[address]) return CREATOR_HASH_MAP[address]
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(`veilsub_creator_hash_${address}`)
    if (stored) return stored
  }
  return null
}

// Save a creator's Poseidon2 hash to localStorage (called after register_creator confirms).
// The hash is extracted from the transaction finalize arguments.
export function saveCreatorHash(address: string, hash: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`veilsub_creator_hash_${address}`, hash)
    } catch { /* localStorage full or unavailable */ }
  }
}

// Content ID → Poseidon2(content_id) mapping for on-chain dispute queries.
// On-chain, content mappings are keyed by Poseidon2::hash_to_field(content_id).
// JavaScript cannot compute Poseidon2 (BLS12-377 native), so we cache the mapping.
// Computed via: `cd contracts/hash_helper && leo run hash_field <content_id>field`
export const CONTENT_HASH_MAP: Record<string, string> = {
  '259582625469377415105313169923451102157':
    '8333928044410196196463218110142652010089661509331703880744618389579288662863field',
}

// Get the Poseidon2 hash for a content_id (for on-chain mapping queries).
// Checks localStorage first (saved after publish) then hardcoded map.
export function getContentHash(contentId: string): string | null {
  const clean = contentId.replace('field', '')
  if (CONTENT_HASH_MAP[clean]) return CONTENT_HASH_MAP[clean]
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(`veilsub_content_hash_${clean}`)
    if (stored) return stored
  }
  return null
}

// Save a content Poseidon2 hash to localStorage.
export function saveContentHash(contentId: string, hash: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`veilsub_content_hash_${contentId.replace('field', '')}`, hash)
    } catch { /* localStorage full or unavailable */ }
  }
}

// Fallback cache: known on-chain custom tier prices per creator (microcredits).
// On-chain, tier prices live in the `creator_tiers` mapping keyed by
// Poseidon2(TierKey{creator_hash, tier_id}) — a compound hash that CANNOT be
// computed in JavaScript (it requires Leo's native Poseidon2 circuit).
//
// Until a server-side Poseidon2 oracle or chain indexer is available, this map
// acts as the offline source of truth for known creators' tier names and prices.
// The useCreatorTiers hook queries tier_count on-chain to validate existence,
// then falls back to this map for price/name details.
//
// To add a new creator: deploy their tiers on-chain, then add their address +
// Poseidon2 hash to CREATOR_HASH_MAP and their tier data here.
export const CREATOR_CUSTOM_TIERS: Record<string, Record<number, { price: number; name: string }>> = {
  // Each creator sets their own tier names and prices via create_custom_tier
  // NOTE: aleo1hp9m08... has NO custom tiers on-chain (tier_count=null).
  // Contract uses legacy pricing: base(10900001) × multiplier(1x/2x/5x).
  // Prices are computed from basePrice × priceMultiplier in TIERS constant.
  // To set custom prices, use Dashboard → Create Tier (calls create_custom_tier).
  // 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk': {},
  'aleo1yr9ls3d48sh0gkk8y4re9assy7rkfhp4g8x2jmd5vqxl0phdvyqq4qmhef': {
    1: { price: 2_000_000, name: 'Basic' },    // 2 ALEO
    2: { price: 5_000_000, name: 'Pro' },      // 5 ALEO
    3: { price: 15_000_000, name: 'Elite' },   // 15 ALEO
  },
  'aleo1k7a5cx9t3wwej6v4h0mr2dgn8ys4pd3qx7lfk4zhrs6ep2wvc5psg9nxzm': {
    1: { price: 1_000_000, name: 'Starter' },  // 1 ALEO
    2: { price: 3_000_000, name: 'Growth' },   // 3 ALEO
    3: { price: 10_000_000, name: 'VIP' },     // 10 ALEO
  },
}

// Get custom tiers for a creator (returns empty object if unknown)
export function getCreatorCustomTiers(address: string): Record<number, { price: number; name: string }> {
  return CREATOR_CUSTOM_TIERS[address] ?? {}
}

// ~30 days at ~3s/block (864K blocks)
export const SUBSCRIPTION_DURATION_BLOCKS = 864_000

// Trial pass: ~50 minutes at ~3s/block (1000 blocks)
export const TRIAL_DURATION_BLOCKS = 1_000
// Trial costs 20% of regular tier price (1/5)
export const TRIAL_PRICE_DIVISOR = 5

// SEED_CONTENT removed — all content is real, stored encrypted in Redis.
// No fake/demo posts are shown. Empty state is handled in useContentFeed.

// Featured creators shown on the explore page for discovery.
// Only creators with verified on-chain data are listed.
// category values match OnboardingWizard: 'Content Creator' | 'Writer' | 'Artist' | 'Developer' | 'Educator' | 'Journalist' | 'Other'
export const FEATURED_CREATORS: { address: string; label: string; bio?: string; category?: string }[] = [
  {
    address: 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk',
    label: 'Prateek (VeilSub Creator)',
    bio: 'Building the private access layer for the creator economy. VeilSub founder—31 transitions, zero addresses in finalize.',
    category: 'Developer',
  },
  {
    address: 'aleo1yr9ls3d48sh0gkk8y4re9assy7rkfhp4g8x2jmd5vqxl0phdvyqq4qmhef',
    label: 'ZK Research Lab',
    bio: 'Publishing exclusive research on zero-knowledge proof systems, Aleo protocol analysis, and privacy-preserving DeFi patterns.',
    category: 'Writer',
  },
  {
    address: 'aleo1k7a5cx9t3wwej6v4h0mr2dgn8ys4pd3qx7lfk4zhrs6ep2wvc5psg9nxzm',
    label: 'Leo Dev Academy',
    bio: 'Step-by-step Leo programming tutorials, contract auditing guides, and hands-on Aleo development workshops.',
    category: 'Educator',
  },
]
