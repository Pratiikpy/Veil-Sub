import {
  Clock,
  Eye,
  CheckCircle2,
} from 'lucide-react'

// ─── Contract Constants ──────────────────────────────────────────────────────
export const MARKETPLACE_PROGRAM_ID = 'veilsub_marketplace_v2.aleo'
export const ALEO_API = '/api/aleo'

// Fee estimates for marketplace transitions (microcredits)
export const MARKETPLACE_FEES = {
  SUBMIT_REVIEW: 200_000,
  PROVE_REPUTATION: 200_000,
  CREATE_AUCTION: 200_000,
  PLACE_BID: 250_000,
  CLOSE_BIDDING: 150_000,
  REVEAL_BID: 200_000,
  RESOLVE_AUCTION: 250_000,
  CANCEL_AUCTION: 150_000,
  VERIFY_BADGE: 150_000,
} as const

// Auction status codes (match contract)
export const AUCTION_STATUS = {
  OPEN: 0,
  CLOSED: 1,
  RESOLVED: 2,
} as const

export type AuctionStatus = typeof AUCTION_STATUS[keyof typeof AUCTION_STATUS]

export const AUCTION_STATUS_LABELS: Record<number, { label: string; color: string; icon: typeof Clock }> = {
  [AUCTION_STATUS.OPEN]: { label: 'Bidding Open', color: 'emerald', icon: Clock },
  [AUCTION_STATUS.CLOSED]: { label: 'Reveal Phase', color: 'amber', icon: Eye },
  [AUCTION_STATUS.RESOLVED]: { label: 'Resolved', color: 'blue', icon: CheckCircle2 },
}

// Badge level metadata
export const BADGE_LEVELS: Record<number, { label: string; color: string; minReviews: number }> = {
  0: { label: 'No Badge', color: 'zinc', minReviews: 0 },
  1: { label: 'Bronze', color: 'amber', minReviews: 10 },
  2: { label: 'Silver', color: 'slate', minReviews: 25 },
  3: { label: 'Gold', color: 'yellow', minReviews: 50 },
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StoredBid {
  auctionId: string
  amount: number
  salt: string
  commitment: string
  timestamp: number
}

export interface AuctionData {
  id: string
  label: string
  status: AuctionStatus
  creatorHash: string
  bidCount: number
  highest: number
  second: number
  winnerHash: string
}

export interface ReputationData {
  creatorHash: string
  reviewCount: number
  ratingSum: number
  badge: number
}
