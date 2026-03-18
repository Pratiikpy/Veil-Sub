// =============================================================================
// @veilsub/sdk — Type Definitions
//
// All TypeScript types for VeilSub contract interactions.
// Mirrors the on-chain structs, records, and mapping shapes.
// =============================================================================

// ---------------------------------------------------------------------------
// Network & Configuration
// ---------------------------------------------------------------------------

/** Aleo network identifier */
export type Network = 'testnet' | 'mainnet';

/** SDK client configuration */
export interface VeilSubConfig {
  /** VeilSub program ID (default: veilsub_v28.aleo) */
  programId?: string;
  /** Aleo API base URL (default: https://api.explorer.provable.com/v1/testnet) */
  networkUrl?: string;
  /** Network identifier (default: testnet) */
  network?: Network;
  /** Request timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Custom fetch implementation (for Node.js <18 or testing) */
  fetchFn?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
}

// ---------------------------------------------------------------------------
// On-Chain Record Types (mirror Leo record definitions)
// ---------------------------------------------------------------------------

/** AccessPass record — proves subscription ownership */
export interface AccessPass {
  owner: string;
  creator: string;
  tier: number;
  passId: string;
  expiresAt: number;
  privacyLevel: number; // 0=standard, 1=blind, 2=trial
}

/** CreatorReceipt record — payment proof for creator */
export interface CreatorReceipt {
  owner: string;
  subscriberHash: string;
  tier: number;
  amount: number;
  passId: string;
}

/** AuditToken record — scoped selective disclosure */
export interface AuditToken {
  owner: string;
  creator: string;
  subscriberHash: string;
  tier: number;
  expiresAt: number;
  scopeMask: number;
}

/** SubscriptionTier record — tier definition owned by creator */
export interface SubscriptionTier {
  owner: string;
  tierId: number;
  nameHash: string;
  price: number;
  createdAt: number;
}

/** ContentDeletion record — proof of content removal */
export interface ContentDeletion {
  owner: string;
  contentId: string;
  deletionHeight: number;
  reasonHash: string;
}

/** GiftToken record — redeemable gift subscription */
export interface GiftToken {
  owner: string;
  creator: string;
  tier: number;
  expiresAt: number;
  gifterHash: string;
  giftId: string;
}

// ---------------------------------------------------------------------------
// On-Chain Struct Types (mirror Leo struct definitions)
// ---------------------------------------------------------------------------

export interface TierKey {
  creatorHash: string;
  tierId: number;
}

export interface BlindKey {
  subscriber: string;
  nonce: string;
}

export interface TipCommitData {
  creator: string;
  amount: number;
}

export interface DisputeKey {
  callerHash: string;
  contentId: string;
}

export interface TrialKey {
  callerHash: string;
  creatorHash: string;
}

// ---------------------------------------------------------------------------
// Query Response Types
// ---------------------------------------------------------------------------

/** Creator statistics from on-chain mappings */
export interface CreatorStats {
  /** Number of active subscribers */
  subscriberCount: number;
  /** Total revenue in microcredits */
  totalRevenue: number;
  /** Number of published content items */
  contentCount: number;
  /** Number of custom tiers created */
  tierCount: number;
  /** Whether the creator is registered */
  registered: boolean;
  /** Base tier price in microcredits */
  basePrice: number;
}

/** Tier information from on-chain mappings */
export interface TierInfo {
  /** Tier identifier (1-20) */
  tierId: number;
  /** Price in microcredits */
  price: number;
  /** Whether this tier has been deprecated */
  deprecated: boolean;
}

/** Content metadata from on-chain mappings */
export interface ContentMeta {
  /** Minimum tier required to access */
  minTier: number;
  /** Poseidon2 hash of the content */
  contentHash: string;
  /** Number of disputes filed */
  disputeCount: number;
  /** Whether the content has been deleted */
  deleted: boolean;
  /** Creator hash (Poseidon2 of creator address) */
  creatorHash: string;
}

/** Platform-wide statistics */
export interface PlatformStats {
  /** Total registered creators */
  totalCreators: number;
  /** Total published content items */
  totalContent: number;
  /** Platform revenue in microcredits */
  platformRevenue: number;
}

// ---------------------------------------------------------------------------
// Token Types (v28 stablecoin support)
// ---------------------------------------------------------------------------

/** Supported payment token types */
export type TokenType = 0 | 1 | 2;

/** Token metadata */
export interface TokenMeta {
  symbol: string;
  name: string;
  decimals: number;
  programId: string;
}

// ---------------------------------------------------------------------------
// Transaction Builder Types
// ---------------------------------------------------------------------------

/** Parameters for building a transaction (wallet-agnostic) */
export interface TransactionParams {
  /** Target program ID */
  programId: string;
  /** Transition function name */
  functionName: string;
  /** Leo-formatted input strings */
  inputs: string[];
  /** Suggested fee in microcredits */
  fee: number;
}

/** Parameters for subscribe transaction */
export interface SubscribeParams {
  /** Payment record plaintext (from wallet) */
  paymentRecord: string;
  /** Creator's Aleo address */
  creatorAddress: string;
  /** Subscription tier (1-20) */
  tier: number;
  /** Payment amount in microcredits */
  amount: number;
  /** Unique pass identifier (auto-generated if omitted) */
  passId?: string;
  /** Block height when subscription expires */
  expiresAt: number;
}

/** Parameters for blind subscribe transaction */
export interface SubscribeBlindParams extends SubscribeParams {
  /** Privacy nonce for identity rotation */
  nonce: string;
}

/** Parameters for trial subscribe transaction */
export interface SubscribeTrialParams {
  paymentRecord: string;
  creatorAddress: string;
  tier: number;
  amount: number;
  passId?: string;
  expiresAt: number;
}

/** Parameters for USDCx subscribe transaction */
export interface SubscribeUsdcxParams {
  /** USDCx token record plaintext */
  tokenRecord: string;
  /** Creator's Aleo address */
  creatorAddress: string;
  /** Subscription tier (1-20) */
  tier: number;
  /** Amount in USDCx (u128, 6 decimals) */
  amount: string;
  /** Unique pass identifier */
  passId?: string;
  /** Block height when subscription expires */
  expiresAt: number;
  /** MerkleProof compliance array */
  merkleProofs: string;
}

/** Parameters for USAD subscribe transaction */
export interface SubscribeUsadParams {
  tokenRecord: string;
  creatorAddress: string;
  tier: number;
  amount: string;
  passId?: string;
  expiresAt: number;
  merkleProofs: string;
}

/** Parameters for renew transaction */
export interface RenewParams {
  /** Existing AccessPass record plaintext */
  accessPass: string;
  /** Payment record plaintext */
  paymentRecord: string;
  /** New tier level */
  newTier: number;
  /** Payment amount in microcredits */
  amount: number;
  /** New unique pass identifier */
  newPassId?: string;
  /** New expiry block height */
  newExpiresAt: number;
}

/** Parameters for blind renew transaction */
export interface RenewBlindParams extends RenewParams {
  /** Privacy nonce for identity rotation */
  nonce: string;
}

/** Parameters for tip transaction */
export interface TipParams {
  /** Payment record plaintext */
  paymentRecord: string;
  /** Creator's Aleo address */
  creatorAddress: string;
  /** Tip amount in microcredits */
  amount: number;
}

/** Parameters for USDCx tip transaction */
export interface TipUsdcxParams {
  tokenRecord: string;
  creatorAddress: string;
  amount: string;
  merkleProofs: string;
}

/** Parameters for USAD tip transaction */
export interface TipUsadParams {
  tokenRecord: string;
  creatorAddress: string;
  amount: string;
  merkleProofs: string;
}

/** Parameters for commit-reveal tip (phase 1) */
export interface CommitTipParams {
  /** Creator's Aleo address */
  creatorAddress: string;
  /** Tip amount in microcredits */
  amount: number;
  /** Random salt for commitment */
  salt: string;
}

/** Parameters for commit-reveal tip (phase 2) */
export interface RevealTipParams {
  /** Payment record plaintext */
  paymentRecord: string;
  /** Creator's Aleo address */
  creatorAddress: string;
  /** Tip amount in microcredits (must match commit) */
  amount: number;
  /** Salt used in commitment (must match commit) */
  salt: string;
}

/** Parameters for publish content transaction */
export interface PublishContentParams {
  /** Unique content identifier */
  contentId: string;
  /** Minimum tier required to access (1-20) */
  minTier: number;
  /** Poseidon2 hash of the content */
  contentHash: string;
}

/** Parameters for publish encrypted content transaction */
export interface PublishEncryptedParams extends PublishContentParams {
  /** Encryption commitment field */
  encryptionCommitment: string;
}

/** Parameters for update content transaction */
export interface UpdateContentParams {
  /** Content identifier to update */
  contentId: string;
  /** New minimum tier requirement */
  newMinTier: number;
  /** New content hash */
  newContentHash: string;
}

/** Parameters for delete content transaction */
export interface DeleteContentParams {
  /** Content identifier to delete */
  contentId: string;
  /** Hash of the deletion reason */
  reasonHash: string;
}

/** Parameters for verify access transaction */
export interface VerifyAccessParams {
  /** AccessPass record plaintext */
  accessPass: string;
  /** Creator's Aleo address */
  creatorAddress: string;
}

/** Parameters for verify tier access transaction */
export interface VerifyTierAccessParams extends VerifyAccessParams {
  /** Required minimum tier */
  requiredTier: number;
}

/** Parameters for create audit token transaction */
export interface CreateAuditTokenParams {
  /** AccessPass record plaintext */
  accessPass: string;
  /** Verifier's Aleo address */
  verifierAddress: string;
  /** Scope bitmask (default: 15 = all fields) */
  scopeMask?: number;
}

/** Parameters for register creator transaction */
export interface RegisterCreatorParams {
  /** Base subscription price in microcredits */
  price: number;
}

/** Parameters for create custom tier transaction */
export interface CreateCustomTierParams {
  /** Tier ID (1-20) */
  tierId: number;
  /** Price in microcredits */
  price: number;
  /** Hash of the tier name */
  nameHash: string;
}

/** Parameters for gift subscription transaction */
export interface GiftSubscriptionParams {
  paymentRecord: string;
  creatorAddress: string;
  recipientAddress: string;
  tier: number;
  amount: number;
  giftId?: string;
  expiresAt: number;
}

/** Parameters for redeem gift transaction */
export interface RedeemGiftParams {
  /** GiftToken record plaintext */
  giftToken: string;
}

/** Parameters for transfer pass transaction */
export interface TransferPassParams {
  /** AccessPass record plaintext */
  accessPass: string;
  /** Recipient's Aleo address */
  recipientAddress: string;
}

/** Parameters for dispute content transaction */
export interface DisputeContentParams {
  /** AccessPass record plaintext (proves subscription) */
  accessPass: string;
  /** Content identifier to dispute */
  contentId: string;
}

/** Parameters for revoke access transaction */
export interface RevokeAccessParams {
  /** Pass identifier to revoke */
  passId: string;
}

/** Parameters for update tier price transaction */
export interface UpdateTierPriceParams {
  /** Existing SubscriptionTier record plaintext */
  tierRecord: string;
  /** New price in microcredits */
  newPrice: number;
}

/** Parameters for deprecate tier transaction */
export interface DeprecateTierParams {
  /** SubscriptionTier record plaintext */
  tierRecord: string;
}

/** Parameters for withdraw creator revenue transaction */
export interface WithdrawCreatorRevParams {
  /** Amount to withdraw in microcredits */
  amount: number;
}

/** Parameters for withdraw platform fees transaction */
export interface WithdrawPlatformFeesParams {
  /** Amount to withdraw in microcredits */
  amount: number;
}

/** Parameters for prove subscriber threshold transaction */
export interface ProveThresholdParams {
  /** Minimum subscriber count to prove */
  threshold: number;
}

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

/** Structured SDK error */
export class VeilSubError extends Error {
  /** On-chain error code (e.g., "ERR_004") if available */
  public readonly code: string | null;
  /** HTTP status code if from API call */
  public readonly status: number | null;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'VeilSubError';
    this.code = code ?? null;
    this.status = status ?? null;
  }
}

// ---------------------------------------------------------------------------
// Mapping Names Enum (for type-safe mapping queries)
// ---------------------------------------------------------------------------

/** All 26 on-chain mapping names in veilsub_v28.aleo */
export const MAPPING_NAMES = {
  TIER_PRICES: 'tier_prices',
  SUBSCRIBER_COUNT: 'subscriber_count',
  TOTAL_REVENUE: 'total_revenue',
  PLATFORM_REVENUE: 'platform_revenue',
  CONTENT_COUNT: 'content_count',
  CONTENT_META: 'content_meta',
  CONTENT_HASHES: 'content_hashes',
  CONTENT_CREATOR: 'content_creator',
  CREATOR_TIERS: 'creator_tiers',
  TIER_COUNT: 'tier_count',
  TIER_DEPRECATED: 'tier_deprecated',
  CONTENT_DELETED: 'content_deleted',
  GIFT_REDEEMED: 'gift_redeemed',
  NONCE_USED: 'nonce_used',
  ENCRYPTION_COMMITS: 'encryption_commits',
  ACCESS_REVOKED: 'access_revoked',
  PASS_CREATOR: 'pass_creator',
  CONTENT_DISPUTES: 'content_disputes',
  TIP_COMMITMENTS: 'tip_commitments',
  TIP_REVEALED: 'tip_revealed',
  DISPUTE_COUNT_BY_CALLER: 'dispute_count_by_caller',
  SUBSCRIPTION_BY_TIER: 'subscription_by_tier',
  TRIAL_USED: 'trial_used',
  TOTAL_CREATORS: 'total_creators',
  TOTAL_CONTENT: 'total_content',
  STABLECOIN_REVENUE: 'stablecoin_revenue',
} as const;

export type MappingName = typeof MAPPING_NAMES[keyof typeof MAPPING_NAMES];
