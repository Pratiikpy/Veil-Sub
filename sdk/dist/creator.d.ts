import type { CreateCustomTierParams, DeprecateTierParams, RegisterCreatorParams, TransactionParams, UpdateTierPriceParams, WithdrawCreatorRevParams, WithdrawPlatformFeesParams } from './types';
/**
 * Build a register_creator transaction.
 * Registers the caller as a creator with the given base subscription price.
 *
 * @example
 * const tx = buildRegisterCreator({ price: 5_000_000 });
 * // tx.inputs = ["5000000u64"]
 */
export declare function buildRegisterCreator(params: RegisterCreatorParams, programId?: string): TransactionParams;
/**
 * Build a create_custom_tier transaction.
 * Creates a new subscription tier with custom price and name.
 *
 * @example
 * const tx = buildCreateCustomTier({
 *   tierId: 2,
 *   price: 10_000_000,
 *   nameHash: "12345"
 * });
 */
export declare function buildCreateCustomTier(params: CreateCustomTierParams, programId?: string): TransactionParams;
/**
 * Build an update_tier_price transaction.
 * Updates the price of an existing tier (requires the SubscriptionTier record).
 */
export declare function buildUpdateTierPrice(params: UpdateTierPriceParams, programId?: string): TransactionParams;
/**
 * Build a deprecate_tier transaction.
 * Marks a tier as deprecated (no new subscriptions, existing ones honored).
 */
export declare function buildDeprecateTier(params: DeprecateTierParams, programId?: string): TransactionParams;
/**
 * Build a withdraw_creator_rev transaction.
 * Withdraws accumulated revenue to the creator's wallet.
 */
export declare function buildWithdrawCreatorRev(params: WithdrawCreatorRevParams, programId?: string): TransactionParams;
/**
 * Build a withdraw_platform_fees transaction.
 * Withdraws accumulated platform fees (platform admin only).
 */
export declare function buildWithdrawPlatformFees(params: WithdrawPlatformFeesParams, programId?: string): TransactionParams;
//# sourceMappingURL=creator.d.ts.map