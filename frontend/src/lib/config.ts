export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || 'veilsub_v20.aleo'
// Deployed on-chain version (v20 exceeds testnet variable limit; v15 is deployed)
export const DEPLOYED_PROGRAM_ID = process.env.NEXT_PUBLIC_DEPLOYED_PROGRAM_ID || 'veilsub_v15.aleo'
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
  VERIFY: 100_000,         // 0.1 credits (finalize checks revocation only via pass_id — subscriber identity never exposed)
  RENEW: 300_000,          // 0.3 credits (same as subscribe)
  PUBLISH: 150_000,        // 0.15 credits (finalize only)
  SPLIT: 150_000,          // 0.15 credits (credits.aleo/split)
  CONVERT: 150_000,        // 0.15 credits (transfer_public_to_private)
  AUDIT_TOKEN: 100_000,    // 0.1 credits (no finalize — zero footprint)
  // v9: Dynamic tier management
  CREATE_TIER: 200_000,    // 0.2 credits (finalize: set tier mapping)
  UPDATE_TIER: 150_000,    // 0.15 credits (finalize: update tier mapping)
  DEPRECATE_TIER: 150_000, // 0.15 credits (finalize: mark deprecated)
  UPDATE_CONTENT: 150_000, // 0.15 credits (finalize: update content_meta)
  DELETE_CONTENT: 150_000, // 0.15 credits (finalize: mark deleted + ContentDeletion record)
  // v10: Gifting, escrow, fee withdrawal
  GIFT_SUBSCRIPTION: 400_000, // 0.4 credits (transfer_private + GiftToken + AccessPass + finalize)
  REDEEM_GIFT: 200_000,       // 0.2 credits (consumes GiftToken, returns AccessPass)
  SUBSCRIBE_ESCROW: 350_000,  // 0.35 credits (transfer + AccessPass + RefundEscrow + finalize)
  CLAIM_REFUND: 250_000,      // 0.25 credits (consumes escrow + pass, returns credits)
  WITHDRAW_PLATFORM: 200_000, // 0.2 credits (platform fee withdrawal)
  WITHDRAW_CREATOR: 200_000,  // 0.2 credits (creator revenue withdrawal)
  // v11: Blind renewal (novel privacy)
  SUBSCRIBE_BLIND: 350_000,   // 0.35 credits (nonce-based identity rotation)
  RENEW_BLIND: 350_000,       // 0.35 credits (blind renewal + nonce check)
  VERIFY_TIER: 100_000,       // 0.1 credits (no finalize — zero footprint)
  // v12: Encrypted content + disputes
  PUBLISH_ENCRYPTED: 200_000, // 0.2 credits (finalize: content + encryption commitment)
  REVOKE_ACCESS: 150_000,     // 0.15 credits (finalize: mark revoked)
  DISPUTE_CONTENT: 150_000,   // 0.15 credits (finalize: increment disputes)
  // v15: Subscription transfer
  TRANSFER_PASS: 300_000,     // 0.3 credits (consumes old pass, mints new for recipient + finalize)
  // v16: Referral subscription
  SUBSCRIBE_REFERRAL: 500_000, // 0.5 credits (2x transfer_private + AccessPass + CreatorReceipt + ReferralReward + finalize)
  // v17: Private subscriber count + Pedersen proofs
  SUBSCRIBE_PRIVATE_COUNT: 350_000, // 0.35 credits (subscribe + Pedersen commitment aggregation)
  PROVE_SUB_COUNT: 100_000,         // 0.1 credits (zero-footprint Pedersen proof)
  PROVE_REVENUE_RANGE: 100_000,     // 0.1 credits (zero-footprint range proof)
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

// v10: Refund escrow window (~25 minutes at ~3s/block)
export const ESCROW_WINDOW_BLOCKS = 500

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
  {
    id: 'seed-4',
    title: 'Weekly Update: v15 Deployed, v20 Source Ready',
    body: 'VeilSub v15 is deployed on testnet with 28 transitions and 13 on-chain transactions verified! Source code has evolved to v20 with 31 transitions, 30 mappings, 8 record types — 1,750+ lines of Leo, 972 statements. 12 version iterations in Wave 3 alone. v20 exceeds testnet variable limit (2.3M vs 2.1M max) — optimization planned for Wave 4.',
    minTier: 1,
    createdAt: '2026-03-01T10:00:00Z',
    contentId: 'seed',
  },
  {
    id: 'seed-5',
    title: 'Deep Dive: Blind Renewal Privacy Technique',
    body: 'In this premium post, we explain how blind renewal works: each renew_blind() call generates a unique subscriber hash via BHP256(caller, nonce). The creator sees "different" subscribers each time — they cannot link renewals to the same person. This is equivalent to lasagna\'s DAR technique but for subscriber identity.',
    minTier: 2,
    createdAt: '2026-03-02T14:00:00Z',
    contentId: 'seed',
  },
  {
    id: 'seed-6',
    title: 'VIP: Mainnet Roadmap & Token Strategy',
    body: 'Exclusive VIP briefing on mainnet plans. Topics: production deployment timeline, multi-token stablecoin strategy (USDCx, USAD), DAO governance model, SDK for third-party integrations, and partnership discussions with Aleo ecosystem projects.',
    minTier: 3,
    createdAt: '2026-03-03T16:00:00Z',
    contentId: 'seed',
  },
]

// Featured creators shown on the landing page for discovery.
// Populated after v3 deployment with real testnet addresses.
export const FEATURED_CREATORS: { address: string; label: string }[] = [
  { address: 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk', label: 'Prateek (VeilSub Creator)' },
  { address: 'aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fez7pqgys4x7s3m', label: 'Privacy Research Lab' },
  { address: 'aleo1qnr4dkkvkgfqph0vzc3y6z2eu975wnpz2925ntjccd5cfqxtyu8sta57j8', label: 'ZK Developer Academy' },
  { address: 'aleo1y9mnptjlkg5dqx3gm2s5fy3u8q5zax7c0fsmx0453a3y0fj59ypswzz9p0', label: 'Aleo Alpha Newsletter' },
  { address: 'aleo1wyvu96dvv0auq9e4qme54kjuhzglyfcf576h0g3nrrmrmr0505pq9krwfd', label: 'DeFi Privacy Research' },
]
