export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || 'veilsub_v6.aleo'
// API calls use Next.js rewrite proxy (/api/aleo/*) to avoid leaking user interest to third parties
// The actual endpoint is configured in next.config.ts rewrites
export const APP_NAME = 'VeilSub'
export const APP_DESCRIPTION = 'Private Creator Subscriptions on Aleo'

// Fee estimates in microcredits — matched to NullPay baseline (100K = 0.1 ALEO)
// NullPay uses 100K for a single transfer_private + finalize.
// VeilSub does 2x transfer_private + finalize, so ~2-3x NullPay's fee.
export const FEES = {
  REGISTER: 150_000,       // 0.15 credits (finalize only)
  SUBSCRIBE: 300_000,      // 0.3 credits (two transfer_private + finalize)
  TIP: 250_000,            // 0.25 credits (two transfer_private + finalize)
  VERIFY: 100_000,         // 0.1 credits (no finalize)
  RENEW: 300_000,          // 0.3 credits (same as subscribe)
  PUBLISH: 150_000,        // 0.15 credits (finalize only)
  SPLIT: 150_000,          // 0.15 credits (credits.aleo/split)
} as const

// Fee estimates for token-based transitions (v5)
export const TOKEN_FEES = {
  SUBSCRIBE_TOKEN: 1_000_000,
  TIP_TOKEN: 500_000,
  SET_TOKEN_PRICE: 300_000,
} as const

// 1 ALEO credit = 1,000,000 microcredits
export const MICROCREDITS_PER_CREDIT = 1_000_000

// Platform fee configuration
// PLATFORM_ADDRESS must match the PLATFORM_ADDR constant hardcoded in the Leo contract.
export const PLATFORM_ADDRESS = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'
export const PLATFORM_FEE_PCT = 5 // 5% display value

// ~30 days at ~3s/block (864K blocks)
export const SUBSCRIPTION_DURATION_BLOCKS = 864_000

// Seed content for content feed demo
export interface SeedContent {
  id: string
  title: string
  body: string
  minTier: number
  createdAt: string
  contentId: string
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
    minTier: 2,
    createdAt: '2026-02-08T15:30:00Z',
    contentId: 'seed',
  },
  {
    id: 'seed-3',
    title: 'VIP Lounge: Ask Me Anything',
    body: 'Welcome to the inner circle. VIP members get direct access — submit questions for our weekly AMA, request custom content topics, and get priority responses. This month\'s spotlight: advanced Leo patterns for privacy-preserving DeFi.',
    minTier: 3,
    createdAt: '2026-02-05T09:00:00Z',
    contentId: 'seed',
  },
]

// Featured creators shown on the landing page for discovery.
// Populated after v3 deployment with real testnet addresses.
export const FEATURED_CREATORS: { address: string; label: string }[] = [
  { address: 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk', label: 'Prateek (VeilSub Creator)' },
  // Demo creators — populate addresses after v5 testnet registration
  // { address: '<demo_address_2>', label: 'Privacy Advocate' },
  // { address: '<demo_address_3>', label: 'ZK Researcher' },
]
