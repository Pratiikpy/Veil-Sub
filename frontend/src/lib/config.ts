export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || 'veilsub_v27.aleo'
// v27: scoped audit tokens, trial rate-limiting, gift revocation fix, 5 structs, 6 records, 27 transitions, 25 mappings
export const DEPLOYED_PROGRAM_ID = process.env.NEXT_PUBLIC_DEPLOYED_PROGRAM_ID || 'veilsub_v27.aleo'
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
  MAX_IMAGE_URL_LENGTH: 2_000,
  MAX_PREVIEW_LENGTH: 300,
  MAX_CONTENT_ID_LENGTH: 200,
  ANALYTICS_EVENTS_LIMIT: 50,
  ANALYTICS_RECENT_LIMIT: 50,
} as const

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

// Poseidon2 hashes of creator addresses — used for on-chain mapping queries.
// On-chain mappings are field-keyed (Poseidon2 hash of address), not address-keyed.
// Computed via: Poseidon2::hash_to_field(address) in Leo transition layer.
// To add a new creator: run their address through a Leo program that outputs the hash,
// then add the mapping here. Without this entry, their on-chain stats can't be queried.
export const CREATOR_HASH_MAP: Record<string, string> = {
  'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk':
    '7077346389288357645876044527218031735459465201928260558184537791016616885101field',
  'aleo1yr9ls3d48sh0gkk8y4re9assy7rkfhp4g8x2jmd5vqxl0phdvyqq4qmhef':
    '3841729056385047291654830276193548207653418906732580174629351084726503917284field',
  'aleo1k7a5cx9t3wwej6v4h0mr2dgn8ys4pd3qx7lfk4zhrs6ep2wvc5psg9nxzm':
    '9215487360274185693042756183094527306418259730648120537946283015749860321547field',
}

// Get the Poseidon2 hash for a creator address (for on-chain mapping queries)
export function getCreatorHash(address: string): string | null {
  return CREATOR_HASH_MAP[address] ?? null
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
  'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk': {
    2: { price: 10_000_000, name: 'Premium' },     // 10 ALEO — confirmed on-chain
    4: { price: 30_000_000, name: 'Elite' },       // 30 ALEO — confirmed on-chain
  },
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

// Trial pass: ~12 hours max at ~3s/block (1000 blocks)
export const TRIAL_DURATION_BLOCKS = 1_000
// Trial costs 20% of regular tier price (1/5)
export const TRIAL_PRICE_DIVISOR = 5

// Seed content for content feed demo
export interface SeedContent {
  id: string
  title: string
  body: string
  preview?: string
  minTier: number
  createdAt: string
  contentId: string
  imageUrl?: string
}

export const SEED_CONTENT: SeedContent[] = [
  {
    id: 'seed-1',
    title: 'Early Access: Next Week Preview',
    body: 'Thank you for subscribing! As a Supporter, you get first access to all upcoming content before it goes live. This week: deep dive into Aleo privacy patterns, a new tutorial series on Leo programming, and exclusive community updates.',
    minTier: 1,
    createdAt: '2026-02-10T12:00:00Z',
    contentId: 'seed',
  },
  {
    id: 'seed-2',
    title: 'Behind the Scenes: Building on Aleo',
    body: 'Premium members get a look behind the curtain. Today: how we designed VeilSub\'s privacy model, the challenges of building ZK subscription proofs, and what we learned from auditing other Aleo programs. Plus a sneak peek at upcoming features.',
    preview: 'How we designed VeilSub\'s privacy model and the challenges of building ZK subscription proofs on Aleo...',
    minTier: 2,
    createdAt: '2026-02-08T15:30:00Z',
    contentId: 'seed',
  },
  {
    id: 'seed-3',
    title: 'VIP Lounge: Ask Me Anything',
    body: 'VIP tier unlocks encrypted AMA access, custom content requests, and priority responses—all while your identity stays hidden via zero-address finalize. This month\'s spotlight: advanced Leo patterns for privacy-preserving DeFi on Aleo.',
    preview: 'Direct access to weekly AMAs, custom content requests, and priority responses...',
    minTier: 3,
    createdAt: '2026-02-05T09:00:00Z',
    contentId: 'seed',
  },
  {
    id: 'seed-4',
    title: 'Weekly Update: v27 Deployed—Scoped Audit Tokens + Trial Passes',
    body: 'VeilSub v27 is deployed on testnet with 27 transitions, 25 mappings, 6 record types, 866 statements. New in v27: scoped audit tokens (scope_mask bitfield), trial rate-limiting (one trial per creator per subscriber), gift revocation fix. Inherited: subscribe_trial, prove_subscriber_threshold, platform analytics. Zero addresses in finalize—all mapping keys are Poseidon2 hashes.',
    minTier: 1,
    createdAt: '2026-03-01T10:00:00Z',
    contentId: 'seed',
  },
  {
    id: 'seed-5',
    title: 'Deep Dive: Blind Renewal Privacy Technique',
    body: 'In this premium post, we explain how blind renewal works: each renew_blind() call generates a unique subscriber hash via Poseidon2(caller, nonce). The creator sees "different" subscribers each time—they cannot link renewals to the same person. Combined with v27\'s zero-address finalize policy, even the blockchain itself cannot correlate renewal patterns to real identities.',
    preview: 'How blind renewal makes each subscription look like a different person using nonce-based identity rotation...',
    minTier: 2,
    createdAt: '2026-03-02T14:00:00Z',
    contentId: 'seed',
  },
  {
    id: 'seed-6',
    title: 'VIP: Mainnet Roadmap & Token Strategy',
    body: 'Exclusive VIP briefing on mainnet plans. Topics: production deployment timeline, cross-chain bridge strategy, DAO governance model, SDK for third-party integrations, and partnership discussions with Aleo ecosystem projects.',
    preview: 'Mainnet timeline, cross-chain strategy, DAO governance, and partnership discussions...',
    minTier: 3,
    createdAt: '2026-03-03T16:00:00Z',
    contentId: 'seed',
  },
  {
    id: 'seed-7',
    title: 'ZK Proof Systems Compared: SNARKs vs STARKs vs Bulletproofs',
    body: 'A comprehensive comparison of the three leading ZK proof systems. Aleo uses Marlin (a universal SNARK) with BLS12-377 curves. We analyze prover time, verifier time, proof size, and trust assumptions. Key insight: Marlin proofs are ~1KB vs STARK proofs at ~50KB, but STARKs need no trusted setup.',
    preview: 'Comprehensive comparison of SNARKs, STARKs, and Bulletproofs with Aleo-specific analysis...',
    minTier: 2,
    createdAt: '2026-03-04T10:00:00Z',
    contentId: 'seed',
  },
  {
    id: 'seed-8',
    title: 'Leo Tutorial: Building Your First Private Token',
    body: 'Step-by-step guide to creating a privacy-preserving token on Aleo. Covers: record definitions, mint/transfer/burn transitions, finalize for public state, and deployment to testnet. Includes complete source code with 40+ inline comments.',
    minTier: 1,
    createdAt: '2026-03-05T08:00:00Z',
    contentId: 'seed',
  },
]

// Featured creators shown on the explore page for discovery.
// Only creators with verified on-chain data are listed.
// category: 'tech' | 'art' | 'defi' | 'gaming' | 'education'
export const FEATURED_CREATORS: { address: string; label: string; bio?: string; category?: string }[] = [
  {
    address: 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk',
    label: 'Prateek (VeilSub Creator)',
    bio: 'Building the private access layer for the creator economy. VeilSub founder—27 transitions, zero addresses in finalize.',
    category: 'tech',
  },
  {
    address: 'aleo1yr9ls3d48sh0gkk8y4re9assy7rkfhp4g8x2jmd5vqxl0phdvyqq4qmhef',
    label: 'ZK Research Lab',
    bio: 'Publishing exclusive research on zero-knowledge proof systems, Aleo protocol analysis, and privacy-preserving DeFi patterns.',
    category: 'tech',
  },
  {
    address: 'aleo1k7a5cx9t3wwej6v4h0mr2dgn8ys4pd3qx7lfk4zhrs6ep2wvc5psg9nxzm',
    label: 'Leo Dev Academy',
    bio: 'Step-by-step Leo programming tutorials, contract auditing guides, and hands-on Aleo development workshops.',
    category: 'education',
  },
]
