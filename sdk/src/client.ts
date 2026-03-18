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

import {
  DEFAULT_PROGRAM_ID,
  FEES,
  TESTNET_API_URL,
  MAINNET_API_URL,
} from './constants';
import type {
  CommitTipParams,
  ContentMeta,
  CreateAuditTokenParams,
  CreateCustomTierParams,
  CreatorStats,
  DeleteContentParams,
  DeprecateTierParams,
  DisputeContentParams,
  GiftSubscriptionParams,
  MappingName,
  PlatformStats,
  ProveThresholdParams,
  PublishContentParams,
  PublishEncryptedParams,
  RedeemGiftParams,
  RegisterCreatorParams,
  RenewBlindParams,
  RenewParams,
  RevealTipParams,
  RevokeAccessParams,
  SubscribeBlindParams,
  SubscribeParams,
  SubscribeTrialParams,
  SubscribeUsadParams,
  SubscribeUsdcxParams,
  TipParams,
  TipUsdcxParams,
  TipUsadParams,
  TransactionParams,
  TransferPassParams,
  UpdateContentParams,
  UpdateTierPriceParams,
  VeilSubConfig,
  VerifyAccessParams,
  VerifyTierAccessParams,
  WithdrawCreatorRevParams,
  WithdrawPlatformFeesParams,
} from './types';
import { VeilSubError } from './types';
import { parseLeoBool, parseLeoField, parseLeoU64 } from './utils';

// Transaction builders
import {
  buildRegisterCreator,
  buildCreateCustomTier,
  buildUpdateTierPrice,
  buildDeprecateTier,
  buildWithdrawCreatorRev,
  buildWithdrawPlatformFees,
} from './creator';
import {
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
import {
  buildPublishContent,
  buildPublishEncryptedContent,
  buildUpdateContent,
  buildDeleteContent,
  buildDisputeContent,
  buildRevokeAccess,
} from './content';
import {
  buildTip,
  buildCommitTip,
  buildRevealTip,
  buildTipUsdcx,
  buildTipUsad,
} from './tipping';
import {
  buildVerifyAccess,
  buildVerifyTierAccess,
  buildCreateAuditToken,
  buildProveThreshold,
} from './verify';

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
export class VeilSubClient {
  /** VeilSub program ID */
  public readonly programId: string;
  /** Aleo API base URL */
  public readonly networkUrl: string;
  /** Request timeout in ms */
  private readonly timeoutMs: number;
  /** Fetch implementation */
  private readonly fetchFn: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

  constructor(config?: VeilSubConfig) {
    this.programId = config?.programId ?? DEFAULT_PROGRAM_ID;
    this.networkUrl = config?.networkUrl ??
      (config?.network === 'mainnet' ? MAINNET_API_URL : TESTNET_API_URL);
    this.timeoutMs = config?.timeoutMs ?? 15_000;
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
  async queryMapping(mappingName: MappingName | string, key: string): Promise<string | null> {
    const url = `${this.networkUrl}/program/${this.programId}/mapping/${mappingName}/${key}`;
    try {
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new VeilSubError(
          `API error querying ${mappingName}/${key}: ${response.status}`,
          undefined,
          response.status,
        );
      }
      const text = await response.text();
      // Provable API returns "null" string for missing keys
      const trimmed = text.trim().replace(/^"|"$/g, '');
      if (trimmed === 'null' || trimmed === '') return null;
      return trimmed;
    } catch (error) {
      if (error instanceof VeilSubError) throw error;
      throw new VeilSubError(
        `Failed to query mapping ${mappingName}/${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Fetch the current block height from the Aleo network.
   */
  async getBlockHeight(): Promise<number> {
    const url = `${this.networkUrl}/block/height/latest`;
    try {
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        throw new VeilSubError(`API error fetching block height: ${response.status}`, undefined, response.status);
      }
      const text = await response.text();
      const height = parseInt(text.trim(), 10);
      if (!Number.isFinite(height)) {
        throw new VeilSubError(`Invalid block height: ${text}`);
      }
      return height;
    } catch (error) {
      if (error instanceof VeilSubError) throw error;
      throw new VeilSubError(`Failed to fetch block height: ${error instanceof Error ? error.message : String(error)}`);
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
  async isCreatorRegistered(creatorHash: string): Promise<boolean> {
    const value = await this.queryMapping('tier_prices', creatorHash);
    if (value == null) return false;
    const price = parseLeoU64(value);
    return price != null && price > 0;
  }

  /**
   * Get comprehensive creator statistics from on-chain mappings.
   *
   * @param creatorHash - Poseidon2 hash of the creator's address
   */
  async getCreatorStats(creatorHash: string): Promise<CreatorStats> {
    // Parallel queries for all creator-related mappings
    const [basePriceRaw, subCountRaw, revenueRaw, contentCountRaw, tierCountRaw] =
      await Promise.all([
        this.queryMapping('tier_prices', creatorHash),
        this.queryMapping('subscriber_count', creatorHash),
        this.queryMapping('total_revenue', creatorHash),
        this.queryMapping('content_count', creatorHash),
        this.queryMapping('tier_count', creatorHash),
      ]);

    const basePrice = parseLeoU64(basePriceRaw) ?? 0;
    return {
      registered: basePrice > 0,
      basePrice,
      subscriberCount: parseLeoU64(subCountRaw) ?? 0,
      totalRevenue: parseLeoU64(revenueRaw) ?? 0,
      contentCount: parseLeoU64(contentCountRaw) ?? 0,
      tierCount: parseLeoU64(tierCountRaw) ?? 0,
    };
  }

  /**
   * Get the subscriber count for a creator.
   *
   * @param creatorHash - Poseidon2 hash of the creator's address
   */
  async getSubscriberCount(creatorHash: string): Promise<number> {
    const raw = await this.queryMapping('subscriber_count', creatorHash);
    return parseLeoU64(raw) ?? 0;
  }

  // ==========================================================================
  // Content Queries
  // ==========================================================================

  /**
   * Get content metadata from on-chain mappings.
   *
   * @param contentHash - Poseidon2 hash of the content ID
   */
  async getContentMeta(contentHash: string): Promise<ContentMeta | null> {
    const [minTierRaw, hashRaw, disputeRaw, deletedRaw, creatorRaw] =
      await Promise.all([
        this.queryMapping('content_meta', contentHash),
        this.queryMapping('content_hashes', contentHash),
        this.queryMapping('content_disputes', contentHash),
        this.queryMapping('content_deleted', contentHash),
        this.queryMapping('content_creator', contentHash),
      ]);

    // If no content_meta, the content doesn't exist
    if (minTierRaw == null) return null;

    return {
      minTier: parseLeoU64(minTierRaw) ?? 0,
      contentHash: parseLeoField(hashRaw) ?? '',
      disputeCount: parseLeoU64(disputeRaw) ?? 0,
      deleted: parseLeoBool(deletedRaw) ?? false,
      creatorHash: parseLeoField(creatorRaw) ?? '',
    };
  }

  /**
   * Get the dispute count for a piece of content.
   *
   * @param contentHash - Poseidon2 hash of the content ID
   */
  async getContentDisputeCount(contentHash: string): Promise<number> {
    const raw = await this.queryMapping('content_disputes', contentHash);
    return parseLeoU64(raw) ?? 0;
  }

  // ==========================================================================
  // Access & Subscription Queries
  // ==========================================================================

  /**
   * Check if an access pass has been revoked.
   *
   * @param passId - The pass_id field value
   */
  async isAccessRevoked(passId: string): Promise<boolean> {
    const raw = await this.queryMapping('access_revoked', passId);
    return parseLeoBool(raw) ?? false;
  }

  /**
   * Check if a gift has been redeemed.
   *
   * @param giftId - The gift_id field value
   */
  async isGiftRedeemed(giftId: string): Promise<boolean> {
    const raw = await this.queryMapping('gift_redeemed', giftId);
    return parseLeoBool(raw) ?? false;
  }

  /**
   * Check if a trial has been used by a subscriber for a creator.
   *
   * @param trialKeyHash - Poseidon2 hash of TrialKey{caller_hash, creator_hash}
   */
  async isTrialUsed(trialKeyHash: string): Promise<boolean> {
    const raw = await this.queryMapping('trial_used', trialKeyHash);
    return parseLeoBool(raw) ?? false;
  }

  /**
   * Check if a blind nonce has been used.
   *
   * @param nonceHash - Poseidon2 hash of BlindKey{subscriber, nonce}
   */
  async isNonceUsed(nonceHash: string): Promise<boolean> {
    const raw = await this.queryMapping('nonce_used', nonceHash);
    return parseLeoBool(raw) ?? false;
  }

  // ==========================================================================
  // Tipping Queries
  // ==========================================================================

  /**
   * Check if a tip commitment exists.
   *
   * @param tipKeyHash - Poseidon2 hash of the tip key
   */
  async hasTipCommitment(tipKeyHash: string): Promise<boolean> {
    const raw = await this.queryMapping('tip_commitments', tipKeyHash);
    return parseLeoBool(raw) ?? false;
  }

  /**
   * Check if a tip has been revealed.
   *
   * @param tipKeyHash - Poseidon2 hash of the tip key
   */
  async isTipRevealed(tipKeyHash: string): Promise<boolean> {
    const raw = await this.queryMapping('tip_revealed', tipKeyHash);
    return parseLeoBool(raw) ?? false;
  }

  // ==========================================================================
  // Platform Queries
  // ==========================================================================

  /**
   * Get platform-wide statistics.
   */
  async getPlatformStats(): Promise<PlatformStats> {
    const [creatorsRaw, contentRaw, revenueRaw] = await Promise.all([
      this.queryMapping('total_creators', '0u8'),
      this.queryMapping('total_content', '0u8'),
      this.queryMapping('platform_revenue', '0u8'),
    ]);

    return {
      totalCreators: parseLeoU64(creatorsRaw) ?? 0,
      totalContent: parseLeoU64(contentRaw) ?? 0,
      platformRevenue: parseLeoU64(revenueRaw) ?? 0,
    };
  }

  // ==========================================================================
  // Transaction Builders — Creator Management
  // ==========================================================================

  /** Build a register_creator transaction */
  buildRegisterCreatorTransaction(params: RegisterCreatorParams): TransactionParams {
    return buildRegisterCreator(params, this.programId);
  }

  /** Build a create_custom_tier transaction */
  buildCreateCustomTierTransaction(params: CreateCustomTierParams): TransactionParams {
    return buildCreateCustomTier(params, this.programId);
  }

  /** Build an update_tier_price transaction */
  buildUpdateTierPriceTransaction(params: UpdateTierPriceParams): TransactionParams {
    return buildUpdateTierPrice(params, this.programId);
  }

  /** Build a deprecate_tier transaction */
  buildDeprecateTierTransaction(params: DeprecateTierParams): TransactionParams {
    return buildDeprecateTier(params, this.programId);
  }

  /** Build a withdraw_creator_rev transaction */
  buildWithdrawCreatorRevTransaction(params: WithdrawCreatorRevParams): TransactionParams {
    return buildWithdrawCreatorRev(params, this.programId);
  }

  /** Build a withdraw_platform_fees transaction */
  buildWithdrawPlatformFeesTransaction(params: WithdrawPlatformFeesParams): TransactionParams {
    return buildWithdrawPlatformFees(params, this.programId);
  }

  // ==========================================================================
  // Transaction Builders — Subscriptions
  // ==========================================================================

  /** Build a subscribe transaction */
  buildSubscribeTransaction(params: SubscribeParams): TransactionParams {
    return buildSubscribe(params, this.programId);
  }

  /** Build a subscribe_blind transaction */
  buildSubscribeBlindTransaction(params: SubscribeBlindParams): TransactionParams {
    return buildSubscribeBlind(params, this.programId);
  }

  /** Build a subscribe_trial transaction */
  buildSubscribeTrialTransaction(params: SubscribeTrialParams): TransactionParams {
    return buildSubscribeTrial(params, this.programId);
  }

  /** Build a subscribe_usdcx transaction (v28) */
  buildSubscribeUsdcxTransaction(params: SubscribeUsdcxParams): TransactionParams {
    return buildSubscribeUsdcx(params, this.programId);
  }

  /** Build a subscribe_usad transaction (v28) */
  buildSubscribeUsadTransaction(params: SubscribeUsadParams): TransactionParams {
    return buildSubscribeUsad(params, this.programId);
  }

  /** Build a renew transaction */
  buildRenewTransaction(params: RenewParams): TransactionParams {
    return buildRenew(params, this.programId);
  }

  /** Build a renew_blind transaction */
  buildRenewBlindTransaction(params: RenewBlindParams): TransactionParams {
    return buildRenewBlind(params, this.programId);
  }

  /** Build a gift_subscription transaction */
  buildGiftSubscriptionTransaction(params: GiftSubscriptionParams): TransactionParams {
    return buildGiftSubscription(params, this.programId);
  }

  /** Build a redeem_gift transaction */
  buildRedeemGiftTransaction(params: RedeemGiftParams): TransactionParams {
    return buildRedeemGift(params, this.programId);
  }

  /** Build a transfer_pass transaction */
  buildTransferPassTransaction(params: TransferPassParams): TransactionParams {
    return buildTransferPass(params, this.programId);
  }

  // ==========================================================================
  // Transaction Builders — Content
  // ==========================================================================

  /** Build a publish_content transaction */
  buildPublishContentTransaction(params: PublishContentParams): TransactionParams {
    return buildPublishContent(params, this.programId);
  }

  /** Build a publish_encrypted_content transaction */
  buildPublishEncryptedContentTransaction(params: PublishEncryptedParams): TransactionParams {
    return buildPublishEncryptedContent(params, this.programId);
  }

  /** Build an update_content transaction */
  buildUpdateContentTransaction(params: UpdateContentParams): TransactionParams {
    return buildUpdateContent(params, this.programId);
  }

  /** Build a delete_content transaction */
  buildDeleteContentTransaction(params: DeleteContentParams): TransactionParams {
    return buildDeleteContent(params, this.programId);
  }

  /** Build a dispute_content transaction */
  buildDisputeContentTransaction(params: DisputeContentParams): TransactionParams {
    return buildDisputeContent(params, this.programId);
  }

  /** Build a revoke_access transaction */
  buildRevokeAccessTransaction(params: RevokeAccessParams): TransactionParams {
    return buildRevokeAccess(params, this.programId);
  }

  // ==========================================================================
  // Transaction Builders — Tipping
  // ==========================================================================

  /** Build a tip transaction */
  buildTipTransaction(params: TipParams): TransactionParams {
    return buildTip(params, this.programId);
  }

  /** Build a commit_tip transaction */
  buildCommitTipTransaction(params: CommitTipParams): TransactionParams {
    return buildCommitTip(params, this.programId);
  }

  /** Build a reveal_tip transaction */
  buildRevealTipTransaction(params: RevealTipParams): TransactionParams {
    return buildRevealTip(params, this.programId);
  }

  /** Build a tip_usdcx transaction (v28) */
  buildTipUsdcxTransaction(params: TipUsdcxParams): TransactionParams {
    return buildTipUsdcx(params, this.programId);
  }

  /** Build a tip_usad transaction (v28) */
  buildTipUsadTransaction(params: TipUsadParams): TransactionParams {
    return buildTipUsad(params, this.programId);
  }

  // ==========================================================================
  // Transaction Builders — Verification
  // ==========================================================================

  /** Build a verify_access transaction */
  buildVerifyAccessTransaction(params: VerifyAccessParams): TransactionParams {
    return buildVerifyAccess(params, this.programId);
  }

  /** Build a verify_tier_access transaction */
  buildVerifyTierAccessTransaction(params: VerifyTierAccessParams): TransactionParams {
    return buildVerifyTierAccess(params, this.programId);
  }

  /** Build a create_audit_token transaction */
  buildCreateAuditTokenTransaction(params: CreateAuditTokenParams): TransactionParams {
    return buildCreateAuditToken(params, this.programId);
  }

  /** Build a prove_subscriber_threshold transaction */
  buildProveThresholdTransaction(params: ProveThresholdParams): TransactionParams {
    return buildProveThreshold(params, this.programId);
  }

  // ==========================================================================
  // Static Helpers
  // ==========================================================================

  /** Get the suggested fee for a transition */
  static getFee(transition: keyof typeof FEES): number {
    return FEES[transition];
  }

  // ==========================================================================
  // Internal
  // ==========================================================================

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await this.fetchFn(url, { signal: controller.signal });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new VeilSubError(`Request timed out after ${this.timeoutMs}ms: ${url}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
