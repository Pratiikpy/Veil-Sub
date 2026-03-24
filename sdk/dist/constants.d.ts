import type { TokenMeta, TokenType } from './types';
/** Default program ID for VeilSub v28 */
export declare const DEFAULT_PROGRAM_ID = "veilsub_v28.aleo";
/** Aleo testnet API base URL */
export declare const TESTNET_API_URL = "https://api.explorer.provable.com/v1/testnet";
/** Aleo mainnet API base URL (placeholder — not yet deployed) */
export declare const MAINNET_API_URL = "https://api.explorer.provable.com/v1/mainnet";
/** VeilSub platform address (fee recipient) */
export declare const PLATFORM_ADDRESS = "aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk";
export declare const USDCX_PROGRAM_ID = "test_usdcx_stablecoin.aleo";
export declare const USAD_PROGRAM_ID = "test_usad_stablecoin.aleo";
/** 1/20 = 5% platform fee */
export declare const PLATFORM_FEE_DIVISOR = 20;
/** Maximum subscription duration in blocks (~140 days) */
export declare const MAX_EXPIRY_BLOCKS = 1200000;
/** Maximum disputes per caller per content */
export declare const MAX_DISPUTES_PER_CALLER = 1;
/** Maximum tier ID */
export declare const MAX_TIER = 20;
/** Minimum tier price in microcredits */
export declare const MIN_PRICE = 100;
/** Maximum content items per creator */
export declare const MAX_CONTENT_PER_CREATOR = 1000;
/** Maximum subscribers per creator */
export declare const MAX_SUBS_PER_CREATOR = 100000;
/** Trial duration in blocks (~50 minutes at 3s/block) */
export declare const TRIAL_DURATION_BLOCKS = 1000;
/** Trial price is 1/5 of tier price (20%) */
export declare const TRIAL_PRICE_DIVISOR = 5;
/** Standard subscription duration in blocks (~30 days) */
export declare const SUBSCRIPTION_DURATION_BLOCKS = 864000;
/** 1 ALEO credit = 1,000,000 microcredits */
export declare const MICROCREDITS_PER_CREDIT = 1000000;
/** Approximate seconds per Aleo block */
export declare const SECONDS_PER_BLOCK = 3;
export declare const FEES: {
    readonly REGISTER: 150000;
    readonly CREATE_TIER: 200000;
    readonly UPDATE_TIER: 150000;
    readonly DEPRECATE_TIER: 150000;
    readonly SUBSCRIBE: 300000;
    readonly SUBSCRIBE_BLIND: 350000;
    readonly SUBSCRIBE_TRIAL: 300000;
    readonly RENEW: 300000;
    readonly RENEW_BLIND: 350000;
    readonly SUBSCRIBE_USDCX: 500000;
    readonly SUBSCRIBE_USAD: 500000;
    readonly PUBLISH: 150000;
    readonly PUBLISH_ENCRYPTED: 200000;
    readonly UPDATE_CONTENT: 150000;
    readonly DELETE_CONTENT: 150000;
    readonly VERIFY: 100000;
    readonly VERIFY_TIER: 100000;
    readonly AUDIT_TOKEN: 100000;
    readonly TIP: 250000;
    readonly COMMIT_TIP: 150000;
    readonly REVEAL_TIP: 250000;
    readonly TIP_USDCX: 400000;
    readonly TIP_USAD: 400000;
    readonly GIFT_SUBSCRIPTION: 400000;
    readonly REDEEM_GIFT: 200000;
    readonly TRANSFER_PASS: 300000;
    readonly DISPUTE_CONTENT: 150000;
    readonly REVOKE_ACCESS: 150000;
    readonly WITHDRAW_CREATOR: 200000;
    readonly WITHDRAW_PLATFORM: 200000;
    readonly PROVE_THRESHOLD: 150000;
};
export type FeeKey = keyof typeof FEES;
/** Native Aleo credits */
export declare const TOKEN_CREDITS: TokenType;
/** USDCx stablecoin */
export declare const TOKEN_USDCX: TokenType;
/** USAD stablecoin */
export declare const TOKEN_USAD: TokenType;
/** Token metadata indexed by token type */
export declare const TOKEN_META: Record<TokenType, TokenMeta>;
/** Regex pattern for valid Aleo addresses */
export declare const ALEO_ADDRESS_REGEX: RegExp;
/** Bit 0: include creator field */
export declare const SCOPE_CREATOR = 1;
/** Bit 1: include tier field */
export declare const SCOPE_TIER = 2;
/** Bit 2: include expires_at field */
export declare const SCOPE_EXPIRY = 4;
/** Bit 3: include subscriber_hash field */
export declare const SCOPE_SUBSCRIBER = 8;
/** All fields included */
export declare const SCOPE_ALL = 15;
export declare const TRANSITIONS: {
    readonly REGISTER_CREATOR: "register_creator";
    readonly CREATE_CUSTOM_TIER: "create_custom_tier";
    readonly UPDATE_TIER_PRICE: "update_tier_price";
    readonly DEPRECATE_TIER: "deprecate_tier";
    readonly SUBSCRIBE: "subscribe";
    readonly SUBSCRIBE_BLIND: "subscribe_blind";
    readonly SUBSCRIBE_TRIAL: "subscribe_trial";
    readonly RENEW: "renew";
    readonly RENEW_BLIND: "renew_blind";
    readonly SUBSCRIBE_USDCX: "subscribe_usdcx";
    readonly TIP_USDCX: "tip_usdcx";
    readonly SUBSCRIBE_USAD: "subscribe_usad";
    readonly TIP_USAD: "tip_usad";
    readonly PUBLISH_CONTENT: "publish_content";
    readonly PUBLISH_ENCRYPTED_CONTENT: "publish_encrypted_content";
    readonly UPDATE_CONTENT: "update_content";
    readonly DELETE_CONTENT: "delete_content";
    readonly VERIFY_ACCESS: "verify_access";
    readonly VERIFY_TIER_ACCESS: "verify_tier_access";
    readonly CREATE_AUDIT_TOKEN: "create_audit_token";
    readonly TIP: "tip";
    readonly COMMIT_TIP: "commit_tip";
    readonly REVEAL_TIP: "reveal_tip";
    readonly GIFT_SUBSCRIPTION: "gift_subscription";
    readonly REDEEM_GIFT: "redeem_gift";
    readonly TRANSFER_PASS: "transfer_pass";
    readonly DISPUTE_CONTENT: "dispute_content";
    readonly REVOKE_ACCESS: "revoke_access";
    readonly WITHDRAW_CREATOR_REV: "withdraw_creator_rev";
    readonly WITHDRAW_PLATFORM_FEES: "withdraw_platform_fees";
    readonly PROVE_SUBSCRIBER_THRESHOLD: "prove_subscriber_threshold";
};
export type TransitionName = typeof TRANSITIONS[keyof typeof TRANSITIONS];
//# sourceMappingURL=constants.d.ts.map