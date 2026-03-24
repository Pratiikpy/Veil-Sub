import { FEES } from './constants';
import type { CommitTipParams, ContentMeta, CreateAuditTokenParams, CreateCustomTierParams, CreatorStats, DeleteContentParams, DeprecateTierParams, DisputeContentParams, GiftSubscriptionParams, MappingName, PlatformStats, ProveThresholdParams, PublishContentParams, PublishEncryptedParams, RedeemGiftParams, RegisterCreatorParams, RenewBlindParams, RenewParams, RevealTipParams, RevokeAccessParams, SubscribeBlindParams, SubscribeParams, SubscribeTrialParams, SubscribeUsadParams, SubscribeUsdcxParams, TipParams, TipUsdcxParams, TipUsadParams, TransactionParams, TransferPassParams, UpdateContentParams, UpdateTierPriceParams, VeilSubConfig, VerifyAccessParams, VerifyTierAccessParams, WithdrawCreatorRevParams, WithdrawPlatformFeesParams } from './types';
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
export declare class VeilSubClient {
    /** VeilSub program ID */
    readonly programId: string;
    /** Aleo API base URL */
    readonly networkUrl: string;
    /** Request timeout in ms */
    private readonly timeoutMs;
    /** Fetch implementation */
    private readonly fetchFn;
    constructor(config?: VeilSubConfig);
    /**
     * Query a single mapping value from the on-chain program.
     * Returns the raw Leo-formatted string, or null if the key is not found.
     *
     * @example
     * const price = await client.queryMapping("tier_prices", "5895434...field");
     * // "5000000u64" or null
     */
    queryMapping(mappingName: MappingName | string, key: string): Promise<string | null>;
    /**
     * Fetch the current block height from the Aleo network.
     */
    getBlockHeight(): Promise<number>;
    /**
     * Check if a creator is registered on-chain.
     *
     * @param creatorHash - Poseidon2 hash of the creator's address (field value)
     */
    isCreatorRegistered(creatorHash: string): Promise<boolean>;
    /**
     * Get comprehensive creator statistics from on-chain mappings.
     *
     * @param creatorHash - Poseidon2 hash of the creator's address
     */
    getCreatorStats(creatorHash: string): Promise<CreatorStats>;
    /**
     * Get the subscriber count for a creator.
     *
     * @param creatorHash - Poseidon2 hash of the creator's address
     */
    getSubscriberCount(creatorHash: string): Promise<number>;
    /**
     * Get content metadata from on-chain mappings.
     *
     * @param contentHash - Poseidon2 hash of the content ID
     */
    getContentMeta(contentHash: string): Promise<ContentMeta | null>;
    /**
     * Get the dispute count for a piece of content.
     *
     * @param contentHash - Poseidon2 hash of the content ID
     */
    getContentDisputeCount(contentHash: string): Promise<number>;
    /**
     * Check if an access pass has been revoked.
     *
     * @param passId - The pass_id field value
     */
    isAccessRevoked(passId: string): Promise<boolean>;
    /**
     * Check if a gift has been redeemed.
     *
     * @param giftId - The gift_id field value
     */
    isGiftRedeemed(giftId: string): Promise<boolean>;
    /**
     * Check if a trial has been used by a subscriber for a creator.
     *
     * @param trialKeyHash - Poseidon2 hash of TrialKey{caller_hash, creator_hash}
     */
    isTrialUsed(trialKeyHash: string): Promise<boolean>;
    /**
     * Check if a blind nonce has been used.
     *
     * @param nonceHash - Poseidon2 hash of BlindKey{subscriber, nonce}
     */
    isNonceUsed(nonceHash: string): Promise<boolean>;
    /**
     * Check if a tip commitment exists.
     *
     * @param tipKeyHash - Poseidon2 hash of the tip key
     */
    hasTipCommitment(tipKeyHash: string): Promise<boolean>;
    /**
     * Check if a tip has been revealed.
     *
     * @param tipKeyHash - Poseidon2 hash of the tip key
     */
    isTipRevealed(tipKeyHash: string): Promise<boolean>;
    /**
     * Get platform-wide statistics.
     */
    getPlatformStats(): Promise<PlatformStats>;
    /** Build a register_creator transaction */
    buildRegisterCreatorTransaction(params: RegisterCreatorParams): TransactionParams;
    /** Build a create_custom_tier transaction */
    buildCreateCustomTierTransaction(params: CreateCustomTierParams): TransactionParams;
    /** Build an update_tier_price transaction */
    buildUpdateTierPriceTransaction(params: UpdateTierPriceParams): TransactionParams;
    /** Build a deprecate_tier transaction */
    buildDeprecateTierTransaction(params: DeprecateTierParams): TransactionParams;
    /** Build a withdraw_creator_rev transaction */
    buildWithdrawCreatorRevTransaction(params: WithdrawCreatorRevParams): TransactionParams;
    /** Build a withdraw_platform_fees transaction */
    buildWithdrawPlatformFeesTransaction(params: WithdrawPlatformFeesParams): TransactionParams;
    /** Build a subscribe transaction */
    buildSubscribeTransaction(params: SubscribeParams): TransactionParams;
    /** Build a subscribe_blind transaction */
    buildSubscribeBlindTransaction(params: SubscribeBlindParams): TransactionParams;
    /** Build a subscribe_trial transaction */
    buildSubscribeTrialTransaction(params: SubscribeTrialParams): TransactionParams;
    /** Build a subscribe_usdcx transaction (v28) */
    buildSubscribeUsdcxTransaction(params: SubscribeUsdcxParams): TransactionParams;
    /** Build a subscribe_usad transaction (v28) */
    buildSubscribeUsadTransaction(params: SubscribeUsadParams): TransactionParams;
    /** Build a renew transaction */
    buildRenewTransaction(params: RenewParams): TransactionParams;
    /** Build a renew_blind transaction */
    buildRenewBlindTransaction(params: RenewBlindParams): TransactionParams;
    /** Build a gift_subscription transaction */
    buildGiftSubscriptionTransaction(params: GiftSubscriptionParams): TransactionParams;
    /** Build a redeem_gift transaction */
    buildRedeemGiftTransaction(params: RedeemGiftParams): TransactionParams;
    /** Build a transfer_pass transaction */
    buildTransferPassTransaction(params: TransferPassParams): TransactionParams;
    /** Build a publish_content transaction */
    buildPublishContentTransaction(params: PublishContentParams): TransactionParams;
    /** Build a publish_encrypted_content transaction */
    buildPublishEncryptedContentTransaction(params: PublishEncryptedParams): TransactionParams;
    /** Build an update_content transaction */
    buildUpdateContentTransaction(params: UpdateContentParams): TransactionParams;
    /** Build a delete_content transaction */
    buildDeleteContentTransaction(params: DeleteContentParams): TransactionParams;
    /** Build a dispute_content transaction */
    buildDisputeContentTransaction(params: DisputeContentParams): TransactionParams;
    /** Build a revoke_access transaction */
    buildRevokeAccessTransaction(params: RevokeAccessParams): TransactionParams;
    /** Build a tip transaction */
    buildTipTransaction(params: TipParams): TransactionParams;
    /** Build a commit_tip transaction */
    buildCommitTipTransaction(params: CommitTipParams): TransactionParams;
    /** Build a reveal_tip transaction */
    buildRevealTipTransaction(params: RevealTipParams): TransactionParams;
    /** Build a tip_usdcx transaction (v28) */
    buildTipUsdcxTransaction(params: TipUsdcxParams): TransactionParams;
    /** Build a tip_usad transaction (v28) */
    buildTipUsadTransaction(params: TipUsadParams): TransactionParams;
    /** Build a verify_access transaction */
    buildVerifyAccessTransaction(params: VerifyAccessParams): TransactionParams;
    /** Build a verify_tier_access transaction */
    buildVerifyTierAccessTransaction(params: VerifyTierAccessParams): TransactionParams;
    /** Build a create_audit_token transaction */
    buildCreateAuditTokenTransaction(params: CreateAuditTokenParams): TransactionParams;
    /** Build a prove_subscriber_threshold transaction */
    buildProveThresholdTransaction(params: ProveThresholdParams): TransactionParams;
    /** Get the suggested fee for a transition */
    static getFee(transition: keyof typeof FEES): number;
    private fetchWithTimeout;
}
//# sourceMappingURL=client.d.ts.map