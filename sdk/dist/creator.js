"use strict";
// =============================================================================
// @veilsub/sdk — Creator Management
//
// Transaction builders for creator registration, tier management,
// and revenue withdrawal. All builders return TransactionParams
// without executing — wallet-agnostic by design.
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRegisterCreator = buildRegisterCreator;
exports.buildCreateCustomTier = buildCreateCustomTier;
exports.buildUpdateTierPrice = buildUpdateTierPrice;
exports.buildDeprecateTier = buildDeprecateTier;
exports.buildWithdrawCreatorRev = buildWithdrawCreatorRev;
exports.buildWithdrawPlatformFees = buildWithdrawPlatformFees;
const constants_1 = require("./constants");
const utils_1 = require("./utils");
/**
 * Build a register_creator transaction.
 * Registers the caller as a creator with the given base subscription price.
 *
 * @example
 * const tx = buildRegisterCreator({ price: 5_000_000 });
 * // tx.inputs = ["5000000u64"]
 */
function buildRegisterCreator(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.REGISTER_CREATOR,
        inputs: [(0, utils_1.toU64)(params.price)],
        fee: constants_1.FEES.REGISTER,
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
function buildCreateCustomTier(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.CREATE_CUSTOM_TIER,
        inputs: [(0, utils_1.toU8)(params.tierId), (0, utils_1.toU64)(params.price), (0, utils_1.toField)(params.nameHash)],
        fee: constants_1.FEES.CREATE_TIER,
    };
}
/**
 * Build an update_tier_price transaction.
 * Updates the price of an existing tier (requires the SubscriptionTier record).
 */
function buildUpdateTierPrice(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.UPDATE_TIER_PRICE,
        inputs: [params.tierRecord, (0, utils_1.toU64)(params.newPrice)],
        fee: constants_1.FEES.UPDATE_TIER,
    };
}
/**
 * Build a deprecate_tier transaction.
 * Marks a tier as deprecated (no new subscriptions, existing ones honored).
 */
function buildDeprecateTier(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.DEPRECATE_TIER,
        inputs: [params.tierRecord],
        fee: constants_1.FEES.DEPRECATE_TIER,
    };
}
/**
 * Build a withdraw_creator_rev transaction.
 * Withdraws accumulated revenue to the creator's wallet.
 */
function buildWithdrawCreatorRev(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.WITHDRAW_CREATOR_REV,
        inputs: [(0, utils_1.toU64)(params.amount)],
        fee: constants_1.FEES.WITHDRAW_CREATOR,
    };
}
/**
 * Build a withdraw_platform_fees transaction.
 * Withdraws accumulated platform fees (platform admin only).
 */
function buildWithdrawPlatformFees(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.WITHDRAW_PLATFORM_FEES,
        inputs: [(0, utils_1.toU64)(params.amount)],
        fee: constants_1.FEES.WITHDRAW_PLATFORM,
    };
}
//# sourceMappingURL=creator.js.map