"use strict";
// =============================================================================
// @veilsub/sdk — Type Definitions
//
// All TypeScript types for VeilSub contract interactions.
// Mirrors the on-chain structs, records, and mapping shapes.
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAPPING_NAMES = exports.VeilSubError = void 0;
// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------
/** Structured SDK error */
class VeilSubError extends Error {
    constructor(message, code, status) {
        super(message);
        this.name = 'VeilSubError';
        this.code = code ?? null;
        this.status = status ?? null;
    }
}
exports.VeilSubError = VeilSubError;
// ---------------------------------------------------------------------------
// Mapping Names Enum (for type-safe mapping queries)
// ---------------------------------------------------------------------------
/** All 26 on-chain mapping names in veilsub_v28.aleo */
exports.MAPPING_NAMES = {
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
};
//# sourceMappingURL=types.js.map