"use strict";
// =============================================================================
// @veilsub/sdk — Subscription Management
//
// Transaction builders for subscribe, renew, blind subscribe, trial subscribe,
// stablecoin subscribe, gift, redeem, and transfer pass.
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSubscribe = buildSubscribe;
exports.buildSubscribeBlind = buildSubscribeBlind;
exports.buildSubscribeTrial = buildSubscribeTrial;
exports.buildSubscribeUsdcx = buildSubscribeUsdcx;
exports.buildSubscribeUsad = buildSubscribeUsad;
exports.buildRenew = buildRenew;
exports.buildRenewBlind = buildRenewBlind;
exports.buildGiftSubscription = buildGiftSubscription;
exports.buildRedeemGift = buildRedeemGift;
exports.buildTransferPass = buildTransferPass;
const constants_1 = require("./constants");
const utils_1 = require("./utils");
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
function buildSubscribe(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    const passId = params.passId ?? (0, utils_1.generateFieldId)();
    return {
        programId,
        functionName: constants_1.TRANSITIONS.SUBSCRIBE,
        inputs: [
            params.paymentRecord,
            params.creatorAddress,
            (0, utils_1.toU8)(params.tier),
            (0, utils_1.toU64)(params.amount),
            (0, utils_1.toField)(passId),
            (0, utils_1.toU32)(params.expiresAt),
        ],
        fee: constants_1.FEES.SUBSCRIBE,
    };
}
/**
 * Build a subscribe_blind transaction.
 * Novel privacy: uses nonce-based identity rotation so the same subscriber
 * appears as a different identity each subscription period.
 */
function buildSubscribeBlind(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    const passId = params.passId ?? (0, utils_1.generateFieldId)();
    return {
        programId,
        functionName: constants_1.TRANSITIONS.SUBSCRIBE_BLIND,
        inputs: [
            params.paymentRecord,
            params.creatorAddress,
            (0, utils_1.toField)(params.nonce),
            (0, utils_1.toU8)(params.tier),
            (0, utils_1.toU64)(params.amount),
            (0, utils_1.toField)(passId),
            (0, utils_1.toU32)(params.expiresAt),
        ],
        fee: constants_1.FEES.SUBSCRIBE_BLIND,
    };
}
/**
 * Build a subscribe_trial transaction.
 * Creates an ephemeral AccessPass at 20% of tier price, ~50 min duration.
 */
function buildSubscribeTrial(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    const passId = params.passId ?? (0, utils_1.generateFieldId)();
    return {
        programId,
        functionName: constants_1.TRANSITIONS.SUBSCRIBE_TRIAL,
        inputs: [
            params.paymentRecord,
            params.creatorAddress,
            (0, utils_1.toU8)(params.tier),
            (0, utils_1.toU64)(params.amount),
            (0, utils_1.toField)(passId),
            (0, utils_1.toU32)(params.expiresAt),
        ],
        fee: constants_1.FEES.SUBSCRIBE_TRIAL,
    };
}
/**
 * Build a subscribe_usdcx transaction.
 * Subscribe using USDCx stablecoin (v28). Requires MerkleProof compliance.
 */
function buildSubscribeUsdcx(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    const passId = params.passId ?? (0, utils_1.generateFieldId)();
    return {
        programId,
        functionName: constants_1.TRANSITIONS.SUBSCRIBE_USDCX,
        inputs: [
            params.tokenRecord,
            params.creatorAddress,
            (0, utils_1.toU8)(params.tier),
            `${params.amount}u128`,
            (0, utils_1.toField)(passId),
            (0, utils_1.toU32)(params.expiresAt),
            params.merkleProofs,
        ],
        fee: constants_1.FEES.SUBSCRIBE_USDCX,
    };
}
/**
 * Build a subscribe_usad transaction.
 * Subscribe using USAD stablecoin (v28). Requires MerkleProof compliance.
 */
function buildSubscribeUsad(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    const passId = params.passId ?? (0, utils_1.generateFieldId)();
    return {
        programId,
        functionName: constants_1.TRANSITIONS.SUBSCRIBE_USAD,
        inputs: [
            params.tokenRecord,
            params.creatorAddress,
            (0, utils_1.toU8)(params.tier),
            `${params.amount}u128`,
            (0, utils_1.toField)(passId),
            (0, utils_1.toU32)(params.expiresAt),
            params.merkleProofs,
        ],
        fee: constants_1.FEES.SUBSCRIBE_USAD,
    };
}
/**
 * Build a renew transaction.
 * Renews an existing subscription with a new tier/expiry.
 */
function buildRenew(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    const newPassId = params.newPassId ?? (0, utils_1.generateFieldId)();
    return {
        programId,
        functionName: constants_1.TRANSITIONS.RENEW,
        inputs: [
            params.accessPass,
            params.paymentRecord,
            (0, utils_1.toU8)(params.newTier),
            (0, utils_1.toU64)(params.amount),
            (0, utils_1.toField)(newPassId),
            (0, utils_1.toU32)(params.newExpiresAt),
        ],
        fee: constants_1.FEES.RENEW,
    };
}
/**
 * Build a renew_blind transaction.
 * Blind renewal with nonce-based identity rotation.
 */
function buildRenewBlind(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    const newPassId = params.newPassId ?? (0, utils_1.generateFieldId)();
    return {
        programId,
        functionName: constants_1.TRANSITIONS.RENEW_BLIND,
        inputs: [
            params.accessPass,
            params.paymentRecord,
            (0, utils_1.toField)(params.nonce),
            (0, utils_1.toU8)(params.newTier),
            (0, utils_1.toU64)(params.amount),
            (0, utils_1.toField)(newPassId),
            (0, utils_1.toU32)(params.newExpiresAt),
        ],
        fee: constants_1.FEES.RENEW_BLIND,
    };
}
/**
 * Build a gift_subscription transaction.
 * Gift a subscription to another Aleo address.
 */
function buildGiftSubscription(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    const giftId = params.giftId ?? (0, utils_1.generateFieldId)();
    return {
        programId,
        functionName: constants_1.TRANSITIONS.GIFT_SUBSCRIPTION,
        inputs: [
            params.paymentRecord,
            params.creatorAddress,
            params.recipientAddress,
            (0, utils_1.toU8)(params.tier),
            (0, utils_1.toU64)(params.amount),
            (0, utils_1.toField)(giftId),
            (0, utils_1.toU32)(params.expiresAt),
        ],
        fee: constants_1.FEES.GIFT_SUBSCRIPTION,
    };
}
/**
 * Build a redeem_gift transaction.
 * Redeems a GiftToken into an AccessPass.
 */
function buildRedeemGift(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.REDEEM_GIFT,
        inputs: [params.giftToken],
        fee: constants_1.FEES.REDEEM_GIFT,
    };
}
/**
 * Build a transfer_pass transaction.
 * Transfers an AccessPass to another Aleo address (unique to VeilSub).
 */
function buildTransferPass(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.TRANSFER_PASS,
        inputs: [params.accessPass, params.recipientAddress],
        fee: constants_1.FEES.TRANSFER_PASS,
    };
}
//# sourceMappingURL=subscribe.js.map