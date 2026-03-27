export const PROGRAM_ID = 'veilsub_v30.aleo'
export const API_URL = 'https://api.explorer.provable.com/v1/testnet'

export const FEES = {
  SUBSCRIBE: 300_000,
  SUBSCRIBE_BLIND: 350_000,
  SUBSCRIBE_TRIAL: 300_000,
  RENEW: 300_000,
  TIP: 250_000,
  PUBLISH: 150_000,
  CREATE_TIER: 200_000,
} as const

export const TIERS = [
  { id: 1, name: 'Supporter', priceMultiplier: 1 },
  { id: 2, name: 'Premium', priceMultiplier: 2 },
  { id: 3, name: 'VIP', priceMultiplier: 5 },
] as const

export const SUBSCRIPTION_DURATION_BLOCKS = 864_000
export const TRIAL_DURATION_BLOCKS = 1_000
