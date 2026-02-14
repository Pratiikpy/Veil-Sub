export interface AccessPass {
  owner: string
  creator: string
  tier: number
  passId: string
  expiresAt: number    // block height when pass expires
  rawPlaintext: string
}

export interface ContentPost {
  id: string
  title: string
  body: string
  minTier: number
  createdAt: string
  contentId: string  // on-chain content_id (field), or 'seed' for seed content
}

export interface CreatorProfile {
  address: string
  tierPrice: number | null  // microcredits, null = not registered
  subscriberCount: number
  totalRevenue: number      // microcredits
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
