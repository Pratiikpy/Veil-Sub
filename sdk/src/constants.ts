// =============================================================================
// @veilsub/sdk — Constants
//
// Program IDs, fee schedules, network endpoints, and contract limits.
// All values sourced from the deployed veilsub_v29.aleo contract.
// =============================================================================

import type { TokenMeta, TokenType } from './types';

// ---------------------------------------------------------------------------
// Program & Network
// ---------------------------------------------------------------------------

/** Default program ID for VeilSub v29 */
export const DEFAULT_PROGRAM_ID = 'veilsub_v29.aleo';

/** Aleo testnet API base URL */
export const TESTNET_API_URL = 'https://api.explorer.provable.com/v1/testnet';

/** Aleo mainnet API base URL (placeholder — not yet deployed) */
export const MAINNET_API_URL = 'https://api.explorer.provable.com/v1/mainnet';

/** VeilSub platform address (fee recipient) */
export const PLATFORM_ADDRESS = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk';

// ---------------------------------------------------------------------------
// Stablecoin Program IDs
// ---------------------------------------------------------------------------

export const USDCX_PROGRAM_ID = 'test_usdcx_stablecoin.aleo';
export const USAD_PROGRAM_ID = 'test_usad_stablecoin.aleo';

// ---------------------------------------------------------------------------
// Contract Constants (match Leo const values)
// ---------------------------------------------------------------------------

/** 1/20 = 5% platform fee */
export const PLATFORM_FEE_DIVISOR = 20;

/** Maximum subscription duration in blocks (~140 days) */
export const MAX_EXPIRY_BLOCKS = 1_200_000;

/** Maximum disputes per caller per content */
export const MAX_DISPUTES_PER_CALLER = 1;

/** Maximum tier ID */
export const MAX_TIER = 20;

/** Minimum tier price in microcredits */
export const MIN_PRICE = 100;

/** Maximum content items per creator */
export const MAX_CONTENT_PER_CREATOR = 1000;

/** Maximum subscribers per creator */
export const MAX_SUBS_PER_CREATOR = 100_000;

/** Trial duration in blocks (~50 minutes at 3s/block) */
export const TRIAL_DURATION_BLOCKS = 1_000;

/** Trial price is 1/5 of tier price (20%) */
export const TRIAL_PRICE_DIVISOR = 5;

/** Standard subscription duration in blocks (~30 days) */
export const SUBSCRIPTION_DURATION_BLOCKS = 864_000;

// ---------------------------------------------------------------------------
// Unit Conversions
// ---------------------------------------------------------------------------

/** 1 ALEO credit = 1,000,000 microcredits */
export const MICROCREDITS_PER_CREDIT = 1_000_000;

/** Approximate seconds per Aleo block */
export const SECONDS_PER_BLOCK = 3;

// ---------------------------------------------------------------------------
// Fee Schedule (microcredits)
// ---------------------------------------------------------------------------

export const FEES = {
  // Creator management
  REGISTER: 150_000,
  CREATE_TIER: 200_000,
  UPDATE_TIER: 150_000,
  DEPRECATE_TIER: 150_000,

  // Subscriptions
  SUBSCRIBE: 300_000,
  SUBSCRIBE_BLIND: 350_000,
  SUBSCRIBE_TRIAL: 300_000,
  RENEW: 300_000,
  RENEW_BLIND: 350_000,

  // Stablecoin subscriptions (v28)
  SUBSCRIBE_USDCX: 500_000,
  SUBSCRIBE_USAD: 500_000,

  // Content
  PUBLISH: 150_000,
  PUBLISH_ENCRYPTED: 200_000,
  UPDATE_CONTENT: 150_000,
  DELETE_CONTENT: 150_000,

  // Verification
  VERIFY: 100_000,
  VERIFY_TIER: 100_000,
  AUDIT_TOKEN: 100_000,

  // Tipping
  TIP: 250_000,
  COMMIT_TIP: 150_000,
  REVEAL_TIP: 250_000,
  TIP_USDCX: 400_000,
  TIP_USAD: 400_000,

  // Social
  GIFT_SUBSCRIPTION: 400_000,
  REDEEM_GIFT: 200_000,
  TRANSFER_PASS: 300_000,

  // Disputes & Revocation
  DISPUTE_CONTENT: 150_000,
  REVOKE_ACCESS: 150_000,

  // Withdrawals
  WITHDRAW_CREATOR: 200_000,
  WITHDRAW_PLATFORM: 200_000,

  // Privacy proofs
  PROVE_THRESHOLD: 150_000,
} as const;

export type FeeKey = keyof typeof FEES;

// ---------------------------------------------------------------------------
// Token Types (v28)
// ---------------------------------------------------------------------------

/** Native Aleo credits */
export const TOKEN_CREDITS: TokenType = 0;

/** USDCx stablecoin */
export const TOKEN_USDCX: TokenType = 1;

/** USAD stablecoin */
export const TOKEN_USAD: TokenType = 2;

/** Token metadata indexed by token type */
export const TOKEN_META: Record<TokenType, TokenMeta> = {
  0: { symbol: 'ALEO', name: 'Aleo Credits', decimals: 6, programId: 'credits.aleo' },
  1: { symbol: 'USDCx', name: 'USD Coin (Aleo)', decimals: 6, programId: USDCX_PROGRAM_ID },
  2: { symbol: 'USAD', name: 'USD Aleo Dollar', decimals: 6, programId: USAD_PROGRAM_ID },
};

// ---------------------------------------------------------------------------
// Aleo Address Validation
// ---------------------------------------------------------------------------

/** Regex pattern for valid Aleo addresses */
export const ALEO_ADDRESS_REGEX = /^aleo1[a-z0-9]{58}$/;

// ---------------------------------------------------------------------------
// Scope Mask Constants (for AuditToken)
// ---------------------------------------------------------------------------

/** Bit 0: include creator field */
export const SCOPE_CREATOR = 1;
/** Bit 1: include tier field */
export const SCOPE_TIER = 2;
/** Bit 2: include expires_at field */
export const SCOPE_EXPIRY = 4;
/** Bit 3: include subscriber_hash field */
export const SCOPE_SUBSCRIBER = 8;
/** All fields included */
export const SCOPE_ALL = 15;

// ---------------------------------------------------------------------------
// All 31 Transition Names
// ---------------------------------------------------------------------------

export const TRANSITIONS = {
  // Creator management (4)
  REGISTER_CREATOR: 'register_creator',
  CREATE_CUSTOM_TIER: 'create_custom_tier',
  UPDATE_TIER_PRICE: 'update_tier_price',
  DEPRECATE_TIER: 'deprecate_tier',

  // Subscriptions (5)
  SUBSCRIBE: 'subscribe',
  SUBSCRIBE_BLIND: 'subscribe_blind',
  SUBSCRIBE_TRIAL: 'subscribe_trial',
  RENEW: 'renew',
  RENEW_BLIND: 'renew_blind',

  // Stablecoin subscriptions (4)
  SUBSCRIBE_USDCX: 'subscribe_usdcx',
  TIP_USDCX: 'tip_usdcx',
  SUBSCRIBE_USAD: 'subscribe_usad',
  TIP_USAD: 'tip_usad',

  // Content (4)
  PUBLISH_CONTENT: 'publish_content',
  PUBLISH_ENCRYPTED_CONTENT: 'publish_encrypted_content',
  UPDATE_CONTENT: 'update_content',
  DELETE_CONTENT: 'delete_content',

  // Verification (3)
  VERIFY_ACCESS: 'verify_access',
  VERIFY_TIER_ACCESS: 'verify_tier_access',
  CREATE_AUDIT_TOKEN: 'create_audit_token',

  // Tipping (3)
  TIP: 'tip',
  COMMIT_TIP: 'commit_tip',
  REVEAL_TIP: 'reveal_tip',

  // Social (3)
  GIFT_SUBSCRIPTION: 'gift_subscription',
  REDEEM_GIFT: 'redeem_gift',
  TRANSFER_PASS: 'transfer_pass',

  // Disputes & Revocation (2)
  DISPUTE_CONTENT: 'dispute_content',
  REVOKE_ACCESS: 'revoke_access',

  // Withdrawals (2)
  WITHDRAW_CREATOR_REV: 'withdraw_creator_rev',
  WITHDRAW_PLATFORM_FEES: 'withdraw_platform_fees',

  // Privacy proofs (1)
  PROVE_SUBSCRIBER_THRESHOLD: 'prove_subscriber_threshold',
} as const;

export type TransitionName = typeof TRANSITIONS[keyof typeof TRANSITIONS];
