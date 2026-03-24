"use strict";
// =============================================================================
// @veilsub/sdk — Constants
//
// Program IDs, fee schedules, network endpoints, and contract limits.
// All values sourced from the deployed veilsub_v28.aleo contract.
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSITIONS = exports.SCOPE_ALL = exports.SCOPE_SUBSCRIBER = exports.SCOPE_EXPIRY = exports.SCOPE_TIER = exports.SCOPE_CREATOR = exports.ALEO_ADDRESS_REGEX = exports.TOKEN_META = exports.TOKEN_USAD = exports.TOKEN_USDCX = exports.TOKEN_CREDITS = exports.FEES = exports.SECONDS_PER_BLOCK = exports.MICROCREDITS_PER_CREDIT = exports.SUBSCRIPTION_DURATION_BLOCKS = exports.TRIAL_PRICE_DIVISOR = exports.TRIAL_DURATION_BLOCKS = exports.MAX_SUBS_PER_CREATOR = exports.MAX_CONTENT_PER_CREATOR = exports.MIN_PRICE = exports.MAX_TIER = exports.MAX_DISPUTES_PER_CALLER = exports.MAX_EXPIRY_BLOCKS = exports.PLATFORM_FEE_DIVISOR = exports.USAD_PROGRAM_ID = exports.USDCX_PROGRAM_ID = exports.PLATFORM_ADDRESS = exports.MAINNET_API_URL = exports.TESTNET_API_URL = exports.DEFAULT_PROGRAM_ID = void 0;
// ---------------------------------------------------------------------------
// Program & Network
// ---------------------------------------------------------------------------
/** Default program ID for VeilSub v28 */
exports.DEFAULT_PROGRAM_ID = 'veilsub_v28.aleo';
/** Aleo testnet API base URL */
exports.TESTNET_API_URL = 'https://api.explorer.provable.com/v1/testnet';
/** Aleo mainnet API base URL (placeholder — not yet deployed) */
exports.MAINNET_API_URL = 'https://api.explorer.provable.com/v1/mainnet';
/** VeilSub platform address (fee recipient) */
exports.PLATFORM_ADDRESS = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk';
// ---------------------------------------------------------------------------
// Stablecoin Program IDs
// ---------------------------------------------------------------------------
exports.USDCX_PROGRAM_ID = 'test_usdcx_stablecoin.aleo';
exports.USAD_PROGRAM_ID = 'test_usad_stablecoin.aleo';
// ---------------------------------------------------------------------------
// Contract Constants (match Leo const values)
// ---------------------------------------------------------------------------
/** 1/20 = 5% platform fee */
exports.PLATFORM_FEE_DIVISOR = 20;
/** Maximum subscription duration in blocks (~140 days) */
exports.MAX_EXPIRY_BLOCKS = 1200000;
/** Maximum disputes per caller per content */
exports.MAX_DISPUTES_PER_CALLER = 1;
/** Maximum tier ID */
exports.MAX_TIER = 20;
/** Minimum tier price in microcredits */
exports.MIN_PRICE = 100;
/** Maximum content items per creator */
exports.MAX_CONTENT_PER_CREATOR = 1000;
/** Maximum subscribers per creator */
exports.MAX_SUBS_PER_CREATOR = 100000;
/** Trial duration in blocks (~50 minutes at 3s/block) */
exports.TRIAL_DURATION_BLOCKS = 1000;
/** Trial price is 1/5 of tier price (20%) */
exports.TRIAL_PRICE_DIVISOR = 5;
/** Standard subscription duration in blocks (~30 days) */
exports.SUBSCRIPTION_DURATION_BLOCKS = 864000;
// ---------------------------------------------------------------------------
// Unit Conversions
// ---------------------------------------------------------------------------
/** 1 ALEO credit = 1,000,000 microcredits */
exports.MICROCREDITS_PER_CREDIT = 1000000;
/** Approximate seconds per Aleo block */
exports.SECONDS_PER_BLOCK = 3;
// ---------------------------------------------------------------------------
// Fee Schedule (microcredits)
// ---------------------------------------------------------------------------
exports.FEES = {
    // Creator management
    REGISTER: 150000,
    CREATE_TIER: 200000,
    UPDATE_TIER: 150000,
    DEPRECATE_TIER: 150000,
    // Subscriptions
    SUBSCRIBE: 300000,
    SUBSCRIBE_BLIND: 350000,
    SUBSCRIBE_TRIAL: 300000,
    RENEW: 300000,
    RENEW_BLIND: 350000,
    // Stablecoin subscriptions (v28)
    SUBSCRIBE_USDCX: 500000,
    SUBSCRIBE_USAD: 500000,
    // Content
    PUBLISH: 150000,
    PUBLISH_ENCRYPTED: 200000,
    UPDATE_CONTENT: 150000,
    DELETE_CONTENT: 150000,
    // Verification
    VERIFY: 100000,
    VERIFY_TIER: 100000,
    AUDIT_TOKEN: 100000,
    // Tipping
    TIP: 250000,
    COMMIT_TIP: 150000,
    REVEAL_TIP: 250000,
    TIP_USDCX: 400000,
    TIP_USAD: 400000,
    // Social
    GIFT_SUBSCRIPTION: 400000,
    REDEEM_GIFT: 200000,
    TRANSFER_PASS: 300000,
    // Disputes & Revocation
    DISPUTE_CONTENT: 150000,
    REVOKE_ACCESS: 150000,
    // Withdrawals
    WITHDRAW_CREATOR: 200000,
    WITHDRAW_PLATFORM: 200000,
    // Privacy proofs
    PROVE_THRESHOLD: 150000,
};
// ---------------------------------------------------------------------------
// Token Types (v28)
// ---------------------------------------------------------------------------
/** Native Aleo credits */
exports.TOKEN_CREDITS = 0;
/** USDCx stablecoin */
exports.TOKEN_USDCX = 1;
/** USAD stablecoin */
exports.TOKEN_USAD = 2;
/** Token metadata indexed by token type */
exports.TOKEN_META = {
    0: { symbol: 'ALEO', name: 'Aleo Credits', decimals: 6, programId: 'credits.aleo' },
    1: { symbol: 'USDCx', name: 'USD Coin (Aleo)', decimals: 6, programId: exports.USDCX_PROGRAM_ID },
    2: { symbol: 'USAD', name: 'USD Aleo Dollar', decimals: 6, programId: exports.USAD_PROGRAM_ID },
};
// ---------------------------------------------------------------------------
// Aleo Address Validation
// ---------------------------------------------------------------------------
/** Regex pattern for valid Aleo addresses */
exports.ALEO_ADDRESS_REGEX = /^aleo1[a-z0-9]{58}$/;
// ---------------------------------------------------------------------------
// Scope Mask Constants (for AuditToken)
// ---------------------------------------------------------------------------
/** Bit 0: include creator field */
exports.SCOPE_CREATOR = 1;
/** Bit 1: include tier field */
exports.SCOPE_TIER = 2;
/** Bit 2: include expires_at field */
exports.SCOPE_EXPIRY = 4;
/** Bit 3: include subscriber_hash field */
exports.SCOPE_SUBSCRIBER = 8;
/** All fields included */
exports.SCOPE_ALL = 15;
// ---------------------------------------------------------------------------
// All 31 Transition Names
// ---------------------------------------------------------------------------
exports.TRANSITIONS = {
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
};
//# sourceMappingURL=constants.js.map