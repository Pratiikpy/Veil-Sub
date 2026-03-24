import type { GiftSubscriptionParams, RedeemGiftParams, RenewBlindParams, RenewParams, SubscribeBlindParams, SubscribeParams, SubscribeTrialParams, SubscribeUsadParams, SubscribeUsdcxParams, TransactionParams, TransferPassParams } from './types';
/**
 * Build a subscribe transaction.
 * Creates an AccessPass + CreatorReceipt via standard subscription.
 *
 * @example
 * const tx = buildSubscribe({
 *   paymentRecord: "{ owner: aleo1..., microcredits: 5000000u64, ... }",
 *   creatorAddress: "aleo1hp9m08...",
 *   tier: 1,
 *   amount: 5_000_000,
 *   expiresAt: 1_500_000,
 * });
 */
export declare function buildSubscribe(params: SubscribeParams, programId?: string): TransactionParams;
/**
 * Build a subscribe_blind transaction.
 * Novel privacy: uses nonce-based identity rotation so the same subscriber
 * appears as a different identity each subscription period.
 */
export declare function buildSubscribeBlind(params: SubscribeBlindParams, programId?: string): TransactionParams;
/**
 * Build a subscribe_trial transaction.
 * Creates an ephemeral AccessPass at 20% of tier price, ~50 min duration.
 */
export declare function buildSubscribeTrial(params: SubscribeTrialParams, programId?: string): TransactionParams;
/**
 * Build a subscribe_usdcx transaction.
 * Subscribe using USDCx stablecoin (v28). Requires MerkleProof compliance.
 */
export declare function buildSubscribeUsdcx(params: SubscribeUsdcxParams, programId?: string): TransactionParams;
/**
 * Build a subscribe_usad transaction.
 * Subscribe using USAD stablecoin (v28). Requires MerkleProof compliance.
 */
export declare function buildSubscribeUsad(params: SubscribeUsadParams, programId?: string): TransactionParams;
/**
 * Build a renew transaction.
 * Renews an existing subscription with a new tier/expiry.
 */
export declare function buildRenew(params: RenewParams, programId?: string): TransactionParams;
/**
 * Build a renew_blind transaction.
 * Blind renewal with nonce-based identity rotation.
 */
export declare function buildRenewBlind(params: RenewBlindParams, programId?: string): TransactionParams;
/**
 * Build a gift_subscription transaction.
 * Gift a subscription to another Aleo address.
 */
export declare function buildGiftSubscription(params: GiftSubscriptionParams, programId?: string): TransactionParams;
/**
 * Build a redeem_gift transaction.
 * Redeems a GiftToken into an AccessPass.
 */
export declare function buildRedeemGift(params: RedeemGiftParams, programId?: string): TransactionParams;
/**
 * Build a transfer_pass transaction.
 * Transfers an AccessPass to another Aleo address (unique to VeilSub).
 */
export declare function buildTransferPass(params: TransferPassParams, programId?: string): TransactionParams;
//# sourceMappingURL=subscribe.d.ts.map