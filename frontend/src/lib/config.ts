export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || 'veilsub_v4.aleo'
// API calls use Next.js rewrite proxy (/api/aleo/*) to avoid leaking user interest to third parties
// The actual endpoint is configured in next.config.ts rewrites
export const APP_NAME = 'VeilSub'
export const APP_DESCRIPTION = 'Private Creator Subscriptions on Aleo'

// Fee estimates in microcredits
export const FEES = {
  REGISTER: 500_000,       // 0.5 credits
  SUBSCRIBE: 5_000_000,    // 5 credits (two transfer_private calls + finalize)
  TIP: 3_000_000,          // 3 credits (two transfer_private calls + finalize)
  VERIFY: 350_000,         // 0.35 credits (no finalize)
  RENEW: 5_000_000,        // 5 credits (same as subscribe)
  PUBLISH: 500_000,        // 0.5 credits (finalize only)
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
    createdAt: new Date().toISOString(),
    contentId: 'seed',
  },
  {
    id: 'seed-2',
    title: 'Behind the Scenes: Building on Aleo',
    body: 'Premium members get a look behind the curtain. Today: how we designed VeilSub\'s privacy model, the challenges of building ZK subscription proofs, and what we learned from auditing other Aleo programs. Plus a sneak peek at upcoming features.',
    minTier: 2,
    createdAt: new Date().toISOString(),
    contentId: 'seed',
  },
  {
    id: 'seed-3',
    title: 'VIP Lounge: Ask Me Anything',
    body: 'Welcome to the inner circle. VIP members get direct access — submit questions for our weekly AMA, request custom content topics, and get priority responses. This month\'s spotlight: advanced Leo patterns for privacy-preserving DeFi.',
    minTier: 3,
    createdAt: new Date().toISOString(),
    contentId: 'seed',
  },
]

// Featured creators shown on the landing page for discovery.
// Populated after v3 deployment with real testnet addresses.
export const FEATURED_CREATORS: { address: string; label: string }[] = [
  { address: 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk', label: 'Prateek (VeilSub Creator)' },
]
