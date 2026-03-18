// =============================================================================
// @veilsub/sdk — Creator Management
//
// Transaction builders for creator registration, tier management,
// and revenue withdrawal. All builders return TransactionParams
// without executing — wallet-agnostic by design.
// =============================================================================

import { DEFAULT_PROGRAM_ID, FEES, TRANSITIONS } from './constants';
import type {
  CreateCustomTierParams,
  DeprecateTierParams,
  RegisterCreatorParams,
  TransactionParams,
  UpdateTierPriceParams,
  WithdrawCreatorRevParams,
  WithdrawPlatformFeesParams,
} from './types';
import { toField, toU64, toU8 } from './utils';

/**
 * Build a register_creator transaction.
 * Registers the caller as a creator with the given base subscription price.
 *
 * @example
 * const tx = buildRegisterCreator({ price: 5_000_000 });
 * // tx.inputs = ["5000000u64"]
 */
export function buildRegisterCreator(
  params: RegisterCreatorParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.REGISTER_CREATOR,
    inputs: [toU64(params.price)],
    fee: FEES.REGISTER,
  };
}

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
export function buildCreateCustomTier(
  params: CreateCustomTierParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.CREATE_CUSTOM_TIER,
    inputs: [toU8(params.tierId), toU64(params.price), toField(params.nameHash)],
    fee: FEES.CREATE_TIER,
  };
}

/**
 * Build an update_tier_price transaction.
 * Updates the price of an existing tier (requires the SubscriptionTier record).
 */
export function buildUpdateTierPrice(
  params: UpdateTierPriceParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.UPDATE_TIER_PRICE,
    inputs: [params.tierRecord, toU64(params.newPrice)],
    fee: FEES.UPDATE_TIER,
  };
}

/**
 * Build a deprecate_tier transaction.
 * Marks a tier as deprecated (no new subscriptions, existing ones honored).
 */
export function buildDeprecateTier(
  params: DeprecateTierParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.DEPRECATE_TIER,
    inputs: [params.tierRecord],
    fee: FEES.DEPRECATE_TIER,
  };
}

/**
 * Build a withdraw_creator_rev transaction.
 * Withdraws accumulated revenue to the creator's wallet.
 */
export function buildWithdrawCreatorRev(
  params: WithdrawCreatorRevParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.WITHDRAW_CREATOR_REV,
    inputs: [toU64(params.amount)],
    fee: FEES.WITHDRAW_CREATOR,
  };
}

/**
 * Build a withdraw_platform_fees transaction.
 * Withdraws accumulated platform fees (platform admin only).
 */
export function buildWithdrawPlatformFees(
  params: WithdrawPlatformFeesParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.WITHDRAW_PLATFORM_FEES,
    inputs: [toU64(params.amount)],
    fee: FEES.WITHDRAW_PLATFORM,
  };
}
