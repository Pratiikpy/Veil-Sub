// =============================================================================
// @veilsub/sdk — Main Entry Point
//
// Privacy-first creator subscriptions on Aleo.
// Wraps all 31 VeilSub v28 contract transitions into a clean TypeScript API.
//
// Usage:
//   import { VeilSubClient } from '@veilsub/sdk';
//   const client = new VeilSubClient();
//
// Or import individual builders:
//   import { buildSubscribe, buildTip } from '@veilsub/sdk';
// =============================================================================

// Main client
export { VeilSubClient } from './client';

// All types
export type {
  // Config
  VeilSubConfig,
  Network,
  // On-chain records
  AccessPass,
  CreatorReceipt,
  AuditToken,
  SubscriptionTier,
  ContentDeletion,
  GiftToken,
  // On-chain structs
  TierKey,
  BlindKey,
  TipCommitData,
  DisputeKey,
  TrialKey,
  // Query responses
  CreatorStats,
  TierInfo,
  ContentMeta,
  PlatformStats,
  // Token
  TokenType,
  TokenMeta,
  // Transaction builder
  TransactionParams,
  // Transaction params
  SubscribeParams,
  SubscribeBlindParams,
  SubscribeTrialParams,
  SubscribeUsdcxParams,
  SubscribeUsadParams,
  RenewParams,
  RenewBlindParams,
  TipParams,
  TipUsdcxParams,
  TipUsadParams,
  CommitTipParams,
  RevealTipParams,
  PublishContentParams,
  PublishEncryptedParams,
  UpdateContentParams,
  DeleteContentParams,
  VerifyAccessParams,
  VerifyTierAccessParams,
  CreateAuditTokenParams,
  RegisterCreatorParams,
  CreateCustomTierParams,
  GiftSubscriptionParams,
  RedeemGiftParams,
  TransferPassParams,
  DisputeContentParams,
  RevokeAccessParams,
  UpdateTierPriceParams,
  DeprecateTierParams,
  WithdrawCreatorRevParams,
  WithdrawPlatformFeesParams,
  ProveThresholdParams,
  // Mapping
  MappingName,
} from './types';

// Error class (value export)
export { VeilSubError, MAPPING_NAMES } from './types';

// Re-export type aliases from constants
export type { FeeKey, TransitionName } from './constants';

// Constants
export {
  DEFAULT_PROGRAM_ID,
  TESTNET_API_URL,
  MAINNET_API_URL,
  PLATFORM_ADDRESS,
  USDCX_PROGRAM_ID,
  USAD_PROGRAM_ID,
  PLATFORM_FEE_DIVISOR,
  MAX_EXPIRY_BLOCKS,
  MAX_TIER,
  MIN_PRICE,
  MAX_CONTENT_PER_CREATOR,
  MAX_SUBS_PER_CREATOR,
  TRIAL_DURATION_BLOCKS,
  TRIAL_PRICE_DIVISOR,
  SUBSCRIPTION_DURATION_BLOCKS,
  MICROCREDITS_PER_CREDIT,
  SECONDS_PER_BLOCK,
  FEES,
  TOKEN_CREDITS,
  TOKEN_USDCX,
  TOKEN_USAD,
  TOKEN_META,
  ALEO_ADDRESS_REGEX,
  SCOPE_CREATOR,
  SCOPE_TIER,
  SCOPE_EXPIRY,
  SCOPE_SUBSCRIBER,
  SCOPE_ALL,
  TRANSITIONS,
} from './constants';

// Transaction builders (standalone — no client needed)
export {
  buildRegisterCreator,
  buildCreateCustomTier,
  buildUpdateTierPrice,
  buildDeprecateTier,
  buildWithdrawCreatorRev,
  buildWithdrawPlatformFees,
} from './creator';

export {
  buildSubscribe,
  buildSubscribeBlind,
  buildSubscribeTrial,
  buildSubscribeUsdcx,
  buildSubscribeUsad,
  buildRenew,
  buildRenewBlind,
  buildGiftSubscription,
  buildRedeemGift,
  buildTransferPass,
} from './subscribe';

export {
  buildPublishContent,
  buildPublishEncryptedContent,
  buildUpdateContent,
  buildDeleteContent,
  buildDisputeContent,
  buildRevokeAccess,
} from './content';

export {
  buildTip,
  buildCommitTip,
  buildRevealTip,
  buildTipUsdcx,
  buildTipUsad,
} from './tipping';

export {
  buildVerifyAccess,
  buildVerifyTierAccess,
  buildCreateAuditToken,
  buildProveThreshold,
} from './verify';

// Utility functions
export {
  stripLeoSuffix,
  parseLeoU64,
  parseLeoField,
  parseLeoBool,
  toU8,
  toU32,
  toU64,
  toField,
  generateFieldId,
  isValidAleoAddress,
  assertValidAddress,
  microToCredits,
  creditsToMicro,
  formatCredits,
  secondsToBlocks,
  blocksToSeconds,
  calculateExpiry,
  parseErrorCode,
  getErrorDescription,
} from './utils';
