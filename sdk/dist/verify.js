"use strict";
// =============================================================================
// @veilsub/sdk — Verification & Privacy Proofs
//
// Transaction builders for access verification, audit token creation,
// and privacy-preserving reputation proofs.
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildVerifyAccess = buildVerifyAccess;
exports.buildVerifyTierAccess = buildVerifyTierAccess;
exports.buildCreateAuditToken = buildCreateAuditToken;
exports.buildProveThreshold = buildProveThreshold;
const constants_1 = require("./constants");
const utils_1 = require("./utils");
/**
 * Build a verify_access transaction.
 * Verifies that an AccessPass is valid for a creator (checks revocation on-chain).
 * Zero-footprint: no subscriber identity is exposed in finalize.
 *
 * @example
 * const tx = buildVerifyAccess({
 *   accessPass: "{ owner: aleo1..., creator: aleo1..., ... }",
 *   creatorAddress: "aleo1hp9m08...",
 * });
 */
function buildVerifyAccess(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.VERIFY_ACCESS,
        inputs: [params.accessPass, params.creatorAddress],
        fee: constants_1.FEES.VERIFY,
    };
}
/**
 * Build a verify_tier_access transaction.
 * Verifies that an AccessPass meets a minimum tier requirement.
 * Checks both revocation and expiry on-chain.
 */
function buildVerifyTierAccess(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.VERIFY_TIER_ACCESS,
        inputs: [params.accessPass, params.creatorAddress, (0, utils_1.toU8)(params.requiredTier)],
        fee: constants_1.FEES.VERIFY_TIER,
    };
}
/**
 * Build a create_audit_token transaction.
 * Creates a scoped AuditToken for selective disclosure to a verifier.
 * Zero finalize footprint — no public trace of who created the token.
 *
 * Scope mask bits:
 * - Bit 0 (1): creator field
 * - Bit 1 (2): tier field
 * - Bit 2 (4): expires_at field
 * - Bit 3 (8): subscriber_hash field
 * - All bits (15): all fields
 */
function buildCreateAuditToken(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    const scopeMask = params.scopeMask ?? constants_1.SCOPE_ALL;
    return {
        programId,
        functionName: constants_1.TRANSITIONS.CREATE_AUDIT_TOKEN,
        inputs: [params.accessPass, params.verifierAddress, (0, utils_1.toU64)(scopeMask)],
        fee: constants_1.FEES.AUDIT_TOKEN,
    };
}
/**
 * Build a prove_subscriber_threshold transaction.
 * Privacy-preserving reputation proof: proves the caller (creator) has
 * at least `threshold` subscribers without revealing the exact count.
 */
function buildProveThreshold(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.PROVE_SUBSCRIBER_THRESHOLD,
        inputs: [(0, utils_1.toU64)(params.threshold)],
        fee: constants_1.FEES.PROVE_THRESHOLD,
    };
}
//# sourceMappingURL=verify.js.map