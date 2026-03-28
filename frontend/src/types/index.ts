export interface AccessPass {
  owner: string
  creator: string
  tier: number
  passId: string
  expiresAt: number    // block height when pass expires
  privacyLevel: number // 0=standard, 1=blind, 2=trial
  rawPlaintext: string
}

export type PostStatus = 'published' | 'draft' | 'scheduled'
export type PostType = 'post' | 'note'

export interface ContentPost {
  id: string
  title: string
  body: string | null  // null when server-gated (content not yet unlocked)
  preview?: string     // short teaser shown to non-subscribers (max 300 chars)
  minTier: number
  createdAt: string
  updatedAt?: string   // set when post is edited via PUT
  contentId: string    // on-chain content_id (field), or 'seed' for seed content
  gated?: boolean      // true when body is server-redacted
  e2e?: boolean        // true when body is end-to-end encrypted (server cannot decrypt)
  imageUrl?: string | null  // attached image URL, null when gated
  videoUrl?: string | null  // attached video URL (YouTube or direct), null when gated
  hasImage?: boolean        // true when post has image (visible even when gated as metadata)
  hasVideo?: boolean        // true when post has video (visible even when gated as metadata)
  status?: PostStatus       // 'published' (default), 'draft', or 'scheduled'
  tags?: string[]            // content tags (max 5 per post)
  scheduledAt?: string       // ISO 8601 timestamp for scheduled publish time
  hashedContentId?: string   // Poseidon2 hash for on-chain dispute tracking
  // Pay-Per-View: individual posts that cost a one-time fee to unlock
  ppvPrice?: number          // microcredits, 0 or undefined = not PPV
  ppvUnlocked?: boolean      // client-side tracking (localStorage-backed)
  // Notes: short-form public posts (always free, no title, max 280 chars)
  postType?: PostType        // 'post' (default) or 'note'
}

export interface CustomTierInfo {
  price: number   // microcredits
  name: string
}

export interface CreatorProfile {
  address: string
  tierPrice: number | null  // microcredits, null = not registered
  subscriberCount: number   // raw count — kept for backward compat, prefer subscriberThreshold for display
  totalRevenue: number      // microcredits — raw count, prefer revenueThreshold for display
  subscriberThreshold: string  // privacy-friendly label: "50+", "100+", "1K+", "New"
  revenueThreshold: string     // privacy-friendly label: "10+ ALEO", "100+ ALEO", "New"
  contentCount?: number     // number of published posts
  tierCount?: number        // number of custom tiers on-chain (from tier_count mapping)
  customTiers?: Record<number, CustomTierInfo>  // tier_id → {price, name} from on-chain + cache
  dataUnavailable?: boolean // true when stats could not be fetched (API error) — distinguishes from genuine zeros
}

export type TxStatus =
  | 'idle'
  | 'signing'
  | 'proving'
  | 'broadcasting'
  | 'confirmed'
  | 'failed'

export interface SubscriptionTier {
  id: number
  name: string
  priceMultiplier: number
  description: string
  features: string[]
}

export const TIERS: SubscriptionTier[] = [
  {
    id: 1,
    name: 'Supporter',
    priceMultiplier: 1,
    description: '',
    features: [],
  },
  {
    id: 2,
    name: 'Premium',
    priceMultiplier: 2,
    description: '',
    features: [],
  },
  {
    id: 3,
    name: 'VIP',
    priceMultiplier: 5,
    description: '',
    features: [],
  },
]
