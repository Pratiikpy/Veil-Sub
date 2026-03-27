export interface AccessPass {
  owner: string
  creator: string
  tier: number
  passId: string
  expiresAt: number
  privacyLevel: number
}

export interface CreatorStats {
  subscriberCount: number
  totalRevenue: number
  contentCount: number
  tierPrice: number | null
  subscriberThreshold: string
  revenueThreshold: string
}

export interface SubscriptionTier {
  id: number
  name: string
  price: number
  priceMultiplier: number
}

export interface TransactionResult {
  txId: string
  status: 'confirmed' | 'failed' | 'timeout'
}

export interface VeilSubConfig {
  network?: 'testnet' | 'mainnet'
  apiUrl?: string
  programId?: string
}
