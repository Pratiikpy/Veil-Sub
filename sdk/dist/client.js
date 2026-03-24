"use strict";
// =============================================================================
// @veilsub/sdk — VeilSubClient
//
// Main client class for interacting with the VeilSub protocol.
// Provides read-only on-chain queries (no wallet required) and
// transaction builders (wallet-agnostic).
//
// Usage:
//   const client = new VeilSubClient();
//   const stats = await client.getCreatorStats("5895434...field");
//   const tx = client.buildSubscribeTransaction({ ... });
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.VeilSubClient = void 0;
const constants_1 = require("./constants");
const types_1 = require("./types");
const utils_1 = require("./utils");
// Transaction builders
const creator_1 = require("./creator");
const subscribe_1 = require("./subscribe");
const content_1 = require("./content");
const tipping_1 = require("./tipping");
const verify_1 = require("./verify");
/**
 * VeilSubClient — Main entry point for the @veilsub/sdk.
 *
 * Provides:
 * - **Read-only queries**: Fetch creator stats, content metadata, subscription
 *   status directly from on-chain mappings via the Provable API. No wallet needed.
 * - **Transaction builders**: Generate wallet-agnostic TransactionParams for all
 *   31 VeilSub transitions. Pass the result to any Aleo wallet adapter.
 *
 * @example
 * ```typescript
 * import { VeilSubClient } from '@veilsub/sdk';
 *
 * const client = new VeilSubClient();
 *
 * // Query on-chain data (no wallet)
 * const stats = await client.getCreatorStats("5895434...field");
 * console.log(`${stats.subscriberCount} subscribers`);
 *
 * // Build a transaction (pass to wallet)
 * const tx = client.buildSubscribeTransaction({
 *   paymentRecord: myRecord,
 *   creatorAddress: "aleo1hp9m08...",
 *   tier: 1,
 *   amount: 5_000_000,
 *   expiresAt: 1_500_000,
 * });
 * await wallet.executeTransaction(tx);
 * ```
 */
class VeilSubClient {
    constructor(config) {
        this.programId = config?.programId ?? constants_1.DEFAULT_PROGRAM_ID;
        this.networkUrl = config?.networkUrl ??
            (config?.network === 'mainnet' ? constants_1.MAINNET_API_URL : constants_1.TESTNET_API_URL);
        this.timeoutMs = config?.timeoutMs ?? 15000;
        this.fetchFn = config?.fetchFn ?? fetch.bind(globalThis);
    }
    // ==========================================================================
    // Low-Level API Access
    // ==========================================================================
    /**
     * Query a single mapping value from the on-chain program.
     * Returns the raw Leo-formatted string, or null if the key is not found.
     *
     * @example
     * const price = await client.queryMapping("tier_prices", "5895434...field");
     * // "5000000u64" or null
     */
    async queryMapping(mappingName, key) {
        const url = `${this.networkUrl}/program/${this.programId}/mapping/${mappingName}/${key}`;
        try {
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) {
                if (response.status === 404)
                    return null;
                throw new types_1.VeilSubError(`API error querying ${mappingName}/${key}: ${response.status}`, undefined, response.status);
            }
            const text = await response.text();
            // Provable API returns "null" string for missing keys
            const trimmed = text.trim().replace(/^"|"$/g, '');
            if (trimmed === 'null' || trimmed === '')
                return null;
            return trimmed;
        }
        catch (error) {
            if (error instanceof types_1.VeilSubError)
                throw error;
            throw new types_1.VeilSubError(`Failed to query mapping ${mappingName}/${key}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Fetch the current block height from the Aleo network.
     */
    async getBlockHeight() {
        const url = `${this.networkUrl}/block/height/latest`;
        try {
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) {
                throw new types_1.VeilSubError(`API error fetching block height: ${response.status}`, undefined, response.status);
            }
            const text = await response.text();
            const height = parseInt(text.trim(), 10);
            if (!Number.isFinite(height)) {
                throw new types_1.VeilSubError(`Invalid block height: ${text}`);
            }
            return height;
        }
        catch (error) {
            if (error instanceof types_1.VeilSubError)
                throw error;
            throw new types_1.VeilSubError(`Failed to fetch block height: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // ==========================================================================
    // Creator Queries
    // ==========================================================================
    /**
     * Check if a creator is registered on-chain.
     *
     * @param creatorHash - Poseidon2 hash of the creator's address (field value)
     */
    async isCreatorRegistered(creatorHash) {
        const value = await this.queryMapping('tier_prices', creatorHash);
        if (value == null)
            return false;
        const price = (0, utils_1.parseLeoU64)(value);
        return price != null && price > 0;
    }
    /**
     * Get comprehensive creator statistics from on-chain mappings.
     *
     * @param creatorHash - Poseidon2 hash of the creator's address
     */
    async getCreatorStats(creatorHash) {
        // Parallel queries for all creator-related mappings
        const [basePriceRaw, subCountRaw, revenueRaw, contentCountRaw, tierCountRaw] = await Promise.all([
            this.queryMapping('tier_prices', creatorHash),
            this.queryMapping('subscriber_count', creatorHash),
            this.queryMapping('total_revenue', creatorHash),
            this.queryMapping('content_count', creatorHash),
            this.queryMapping('tier_count', creatorHash),
        ]);
        const basePrice = (0, utils_1.parseLeoU64)(basePriceRaw) ?? 0;
        return {
            registered: basePrice > 0,
            basePrice,
            subscriberCount: (0, utils_1.parseLeoU64)(subCountRaw) ?? 0,
            totalRevenue: (0, utils_1.parseLeoU64)(revenueRaw) ?? 0,
            contentCount: (0, utils_1.parseLeoU64)(contentCountRaw) ?? 0,
            tierCount: (0, utils_1.parseLeoU64)(tierCountRaw) ?? 0,
        };
    }
    /**
     * Get the subscriber count for a creator.
     *
     * @param creatorHash - Poseidon2 hash of the creator's address
     */
    async getSubscriberCount(creatorHash) {
        const raw = await this.queryMapping('subscriber_count', creatorHash);
        return (0, utils_1.parseLeoU64)(raw) ?? 0;
    }
    // ==========================================================================
    // Content Queries
    // ==========================================================================
    /**
     * Get content metadata from on-chain mappings.
     *
     * @param contentHash - Poseidon2 hash of the content ID
     */
    async getContentMeta(contentHash) {
        const [minTierRaw, hashRaw, disputeRaw, deletedRaw, creatorRaw] = await Promise.all([
            this.queryMapping('content_meta', contentHash),
            this.queryMapping('content_hashes', contentHash),
            this.queryMapping('content_disputes', contentHash),
            this.queryMapping('content_deleted', contentHash),
            this.queryMapping('content_creator', contentHash),
        ]);
        // If no content_meta, the content doesn't exist
        if (minTierRaw == null)
            return null;
        return {
            minTier: (0, utils_1.parseLeoU64)(minTierRaw) ?? 0,
            contentHash: (0, utils_1.parseLeoField)(hashRaw) ?? '',
            disputeCount: (0, utils_1.parseLeoU64)(disputeRaw) ?? 0,
            deleted: (0, utils_1.parseLeoBool)(deletedRaw) ?? false,
            creatorHash: (0, utils_1.parseLeoField)(creatorRaw) ?? '',
        };
    }
    /**
     * Get the dispute count for a piece of content.
     *
     * @param contentHash - Poseidon2 hash of the content ID
     */
    async getContentDisputeCount(contentHash) {
        const raw = await this.queryMapping('content_disputes', contentHash);
        return (0, utils_1.parseLeoU64)(raw) ?? 0;
    }
    // ==========================================================================
    // Access & Subscription Queries
    // ==========================================================================
    /**
     * Check if an access pass has been revoked.
     *
     * @param passId - The pass_id field value
     */
    async isAccessRevoked(passId) {
        const raw = await this.queryMapping('access_revoked', passId);
        return (0, utils_1.parseLeoBool)(raw) ?? false;
    }
    /**
     * Check if a gift has been redeemed.
     *
     * @param giftId - The gift_id field value
     */
    async isGiftRedeemed(giftId) {
        const raw = await this.queryMapping('gift_redeemed', giftId);
        return (0, utils_1.parseLeoBool)(raw) ?? false;
    }
    /**
     * Check if a trial has been used by a subscriber for a creator.
     *
     * @param trialKeyHash - Poseidon2 hash of TrialKey{caller_hash, creator_hash}
     */
    async isTrialUsed(trialKeyHash) {
        const raw = await this.queryMapping('trial_used', trialKeyHash);
        return (0, utils_1.parseLeoBool)(raw) ?? false;
    }
    /**
     * Check if a blind nonce has been used.
     *
     * @param nonceHash - Poseidon2 hash of BlindKey{subscriber, nonce}
     */
    async isNonceUsed(nonceHash) {
        const raw = await this.queryMapping('nonce_used', nonceHash);
        return (0, utils_1.parseLeoBool)(raw) ?? false;
    }
    // ==========================================================================
    // Tipping Queries
    // ==========================================================================
    /**
     * Check if a tip commitment exists.
     *
     * @param tipKeyHash - Poseidon2 hash of the tip key
     */
    async hasTipCommitment(tipKeyHash) {
        const raw = await this.queryMapping('tip_commitments', tipKeyHash);
        return (0, utils_1.parseLeoBool)(raw) ?? false;
    }
    /**
     * Check if a tip has been revealed.
     *
     * @param tipKeyHash - Poseidon2 hash of the tip key
     */
    async isTipRevealed(tipKeyHash) {
        const raw = await this.queryMapping('tip_revealed', tipKeyHash);
        return (0, utils_1.parseLeoBool)(raw) ?? false;
    }
    // ==========================================================================
    // Platform Queries
    // ==========================================================================
    /**
     * Get platform-wide statistics.
     */
    async getPlatformStats() {
        const [creatorsRaw, contentRaw, revenueRaw] = await Promise.all([
            this.queryMapping('total_creators', '0u8'),
            this.queryMapping('total_content', '0u8'),
            this.queryMapping('platform_revenue', '0u8'),
        ]);
        return {
            totalCreators: (0, utils_1.parseLeoU64)(creatorsRaw) ?? 0,
            totalContent: (0, utils_1.parseLeoU64)(contentRaw) ?? 0,
            platformRevenue: (0, utils_1.parseLeoU64)(revenueRaw) ?? 0,
        };
    }
    // ==========================================================================
    // Transaction Builders — Creator Management
    // ==========================================================================
    /** Build a register_creator transaction */
    buildRegisterCreatorTransaction(params) {
        return (0, creator_1.buildRegisterCreator)(params, this.programId);
    }
    /** Build a create_custom_tier transaction */
    buildCreateCustomTierTransaction(params) {
        return (0, creator_1.buildCreateCustomTier)(params, this.programId);
    }
    /** Build an update_tier_price transaction */
    buildUpdateTierPriceTransaction(params) {
        return (0, creator_1.buildUpdateTierPrice)(params, this.programId);
    }
    /** Build a deprecate_tier transaction */
    buildDeprecateTierTransaction(params) {
        return (0, creator_1.buildDeprecateTier)(params, this.programId);
    }
    /** Build a withdraw_creator_rev transaction */
    buildWithdrawCreatorRevTransaction(params) {
        return (0, creator_1.buildWithdrawCreatorRev)(params, this.programId);
    }
    /** Build a withdraw_platform_fees transaction */
    buildWithdrawPlatformFeesTransaction(params) {
        return (0, creator_1.buildWithdrawPlatformFees)(params, this.programId);
    }
    // ==========================================================================
    // Transaction Builders — Subscriptions
    // ==========================================================================
    /** Build a subscribe transaction */
    buildSubscribeTransaction(params) {
        return (0, subscribe_1.buildSubscribe)(params, this.programId);
    }
    /** Build a subscribe_blind transaction */
    buildSubscribeBlindTransaction(params) {
        return (0, subscribe_1.buildSubscribeBlind)(params, this.programId);
    }
    /** Build a subscribe_trial transaction */
    buildSubscribeTrialTransaction(params) {
        return (0, subscribe_1.buildSubscribeTrial)(params, this.programId);
    }
    /** Build a subscribe_usdcx transaction (v28) */
    buildSubscribeUsdcxTransaction(params) {
        return (0, subscribe_1.buildSubscribeUsdcx)(params, this.programId);
    }
    /** Build a subscribe_usad transaction (v28) */
    buildSubscribeUsadTransaction(params) {
        return (0, subscribe_1.buildSubscribeUsad)(params, this.programId);
    }
    /** Build a renew transaction */
    buildRenewTransaction(params) {
        return (0, subscribe_1.buildRenew)(params, this.programId);
    }
    /** Build a renew_blind transaction */
    buildRenewBlindTransaction(params) {
        return (0, subscribe_1.buildRenewBlind)(params, this.programId);
    }
    /** Build a gift_subscription transaction */
    buildGiftSubscriptionTransaction(params) {
        return (0, subscribe_1.buildGiftSubscription)(params, this.programId);
    }
    /** Build a redeem_gift transaction */
    buildRedeemGiftTransaction(params) {
        return (0, subscribe_1.buildRedeemGift)(params, this.programId);
    }
    /** Build a transfer_pass transaction */
    buildTransferPassTransaction(params) {
        return (0, subscribe_1.buildTransferPass)(params, this.programId);
    }
    // ==========================================================================
    // Transaction Builders — Content
    // ==========================================================================
    /** Build a publish_content transaction */
    buildPublishContentTransaction(params) {
        return (0, content_1.buildPublishContent)(params, this.programId);
    }
    /** Build a publish_encrypted_content transaction */
    buildPublishEncryptedContentTransaction(params) {
        return (0, content_1.buildPublishEncryptedContent)(params, this.programId);
    }
    /** Build an update_content transaction */
    buildUpdateContentTransaction(params) {
        return (0, content_1.buildUpdateContent)(params, this.programId);
    }
    /** Build a delete_content transaction */
    buildDeleteContentTransaction(params) {
        return (0, content_1.buildDeleteContent)(params, this.programId);
    }
    /** Build a dispute_content transaction */
    buildDisputeContentTransaction(params) {
        return (0, content_1.buildDisputeContent)(params, this.programId);
    }
    /** Build a revoke_access transaction */
    buildRevokeAccessTransaction(params) {
        return (0, content_1.buildRevokeAccess)(params, this.programId);
    }
    // ==========================================================================
    // Transaction Builders — Tipping
    // ==========================================================================
    /** Build a tip transaction */
    buildTipTransaction(params) {
        return (0, tipping_1.buildTip)(params, this.programId);
    }
    /** Build a commit_tip transaction */
    buildCommitTipTransaction(params) {
        return (0, tipping_1.buildCommitTip)(params, this.programId);
    }
    /** Build a reveal_tip transaction */
    buildRevealTipTransaction(params) {
        return (0, tipping_1.buildRevealTip)(params, this.programId);
    }
    /** Build a tip_usdcx transaction (v28) */
    buildTipUsdcxTransaction(params) {
        return (0, tipping_1.buildTipUsdcx)(params, this.programId);
    }
    /** Build a tip_usad transaction (v28) */
    buildTipUsadTransaction(params) {
        return (0, tipping_1.buildTipUsad)(params, this.programId);
    }
    // ==========================================================================
    // Transaction Builders — Verification
    // ==========================================================================
    /** Build a verify_access transaction */
    buildVerifyAccessTransaction(params) {
        return (0, verify_1.buildVerifyAccess)(params, this.programId);
    }
    /** Build a verify_tier_access transaction */
    buildVerifyTierAccessTransaction(params) {
        return (0, verify_1.buildVerifyTierAccess)(params, this.programId);
    }
    /** Build a create_audit_token transaction */
    buildCreateAuditTokenTransaction(params) {
        return (0, verify_1.buildCreateAuditToken)(params, this.programId);
    }
    /** Build a prove_subscriber_threshold transaction */
    buildProveThresholdTransaction(params) {
        return (0, verify_1.buildProveThreshold)(params, this.programId);
    }
    // ==========================================================================
    // Static Helpers
    // ==========================================================================
    /** Get the suggested fee for a transition */
    static getFee(transition) {
        return constants_1.FEES[transition];
    }
    // ==========================================================================
    // Internal
    // ==========================================================================
    async fetchWithTimeout(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            return await this.fetchFn(url, { signal: controller.signal });
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new types_1.VeilSubError(`Request timed out after ${this.timeoutMs}ms: ${url}`);
            }
            throw error;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
exports.VeilSubClient = VeilSubClient;
//# sourceMappingURL=client.js.map