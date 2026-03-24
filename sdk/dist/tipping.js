"use strict";
// =============================================================================
// @veilsub/sdk — Tipping
//
// Transaction builders for direct tips, commit-reveal tipping,
// and stablecoin tips (USDCx, USAD).
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTip = buildTip;
exports.buildCommitTip = buildCommitTip;
exports.buildRevealTip = buildRevealTip;
exports.buildTipUsdcx = buildTipUsdcx;
exports.buildTipUsad = buildTipUsad;
const constants_1 = require("./constants");
const utils_1 = require("./utils");
/**
 * Build a tip transaction.
 * Direct tip to a creator using Aleo credits.
 *
 * @example
 * const tx = buildTip({
 *   paymentRecord: "{ owner: aleo1..., microcredits: 1000000u64, ... }",
 *   creatorAddress: "aleo1hp9m08...",
 *   amount: 1_000_000,
 * });
 */
function buildTip(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.TIP,
        inputs: [
            params.paymentRecord,
            params.creatorAddress,
            (0, utils_1.toU64)(params.amount),
        ],
        fee: constants_1.FEES.TIP,
    };
}
/**
 * Build a commit_tip transaction (phase 1 of commit-reveal tipping).
 * Commits to a tip amount using BHP256 hashing. The tip is not transferred
 * until the reveal phase.
 */
function buildCommitTip(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.COMMIT_TIP,
        inputs: [
            params.creatorAddress,
            (0, utils_1.toU64)(params.amount),
            (0, utils_1.toField)(params.salt),
        ],
        fee: constants_1.FEES.COMMIT_TIP,
    };
}
/**
 * Build a reveal_tip transaction (phase 2 of commit-reveal tipping).
 * Reveals the committed tip and executes the transfer.
 * Amount and salt must match the previous commit.
 */
function buildRevealTip(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.REVEAL_TIP,
        inputs: [
            params.paymentRecord,
            params.creatorAddress,
            (0, utils_1.toU64)(params.amount),
            (0, utils_1.toField)(params.salt),
        ],
        fee: constants_1.FEES.REVEAL_TIP,
    };
}
/**
 * Build a tip_usdcx transaction.
 * Tip a creator using USDCx stablecoin (v28).
 */
function buildTipUsdcx(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.TIP_USDCX,
        inputs: [
            params.tokenRecord,
            params.creatorAddress,
            `${params.amount}u128`,
            params.merkleProofs,
        ],
        fee: constants_1.FEES.TIP_USDCX,
    };
}
/**
 * Build a tip_usad transaction.
 * Tip a creator using USAD stablecoin (v28).
 */
function buildTipUsad(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.TIP_USAD,
        inputs: [
            params.tokenRecord,
            params.creatorAddress,
            `${params.amount}u128`,
            params.merkleProofs,
        ],
        fee: constants_1.FEES.TIP_USAD,
    };
}
//# sourceMappingURL=tipping.js.map