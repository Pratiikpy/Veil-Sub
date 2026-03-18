export interface AccessPass {
  owner: string
  creator: string
  tier: number
  passId: string
  expiresAt: number    // block height when pass expires
  rawPlaintext: string
}

export type PostStatus = 'published' | 'draft' | 'scheduled'

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
  imageUrl?: string | null  // attached image URL, null when gated
  videoUrl?: string | null  // attached video URL (YouTube or direct), null when gated
  hasImage?: boolean        // true when post has image (visible even when gated as metadata)
  hasVideo?: boolean        // true when post has video (visible even when gated as metadata)
  status?: PostStatus       // 'published' (default), 'draft', or 'scheduled'
  tags?: string[]            // content tags (max 5 per post)
  scheduledAt?: string       // ISO 8601 timestamp for scheduled publish time
  hashedContentId?: string   // Poseidon2 hash for on-chain dispute tracking
}

export interface CustomTierInfo {
  price: number   // microcredits
  name: string
}

export interface CreatorProfile {
  address: string
  tierPrice: number | null  // microcredits, null = not registered
  subscriberCount: number
  totalRevenue: number      // microcredits
  contentCount?: number     // number of published posts
  tierCount?: number        // number of custom tiers on-chain (from tier_count mapping)
  customTiers?: Record<number, CustomTierInfo>  // tier_id → {price, name} from on-chain + cache
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
    description: 'Basic access to exclusive content',
    features: ['Early access posts', 'Community chat'],
  },
  {
    id: 2,
    name: 'Premium',
    priceMultiplier: 2,
    description: 'Enhanced access with bonus perks',
    features: ['Everything in Supporter', 'Behind-the-scenes', 'Monthly Q&A'],
  },
  {
    id: 3,
    name: 'VIP',
    priceMultiplier: 5,
    description: 'Full access with direct interaction',
    features: [
      'Everything in Premium',
      '1-on-1 sessions',
      'Custom content requests',
    ],
  },
]
