"use strict";
// =============================================================================
// @veilsub/sdk — Content Management
//
// Transaction builders for publishing, updating, deleting, and disputing content.
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPublishContent = buildPublishContent;
exports.buildPublishEncryptedContent = buildPublishEncryptedContent;
exports.buildUpdateContent = buildUpdateContent;
exports.buildDeleteContent = buildDeleteContent;
exports.buildDisputeContent = buildDisputeContent;
exports.buildRevokeAccess = buildRevokeAccess;
const constants_1 = require("./constants");
const utils_1 = require("./utils");
/**
 * Build a publish_content transaction.
 * Publishes content with a minimum tier requirement and integrity hash.
 *
 * @example
 * const tx = buildPublishContent({
 *   contentId: "123456",
 *   minTier: 1,
 *   contentHash: "789012",
 * });
 */
function buildPublishContent(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.PUBLISH_CONTENT,
        inputs: [
            (0, utils_1.toField)(params.contentId),
            (0, utils_1.toU8)(params.minTier),
            (0, utils_1.toField)(params.contentHash),
        ],
        fee: constants_1.FEES.PUBLISH,
    };
}
/**
 * Build a publish_encrypted_content transaction.
 * Publishes encrypted content with an encryption commitment for verification.
 */
function buildPublishEncryptedContent(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.PUBLISH_ENCRYPTED_CONTENT,
        inputs: [
            (0, utils_1.toField)(params.contentId),
            (0, utils_1.toU8)(params.minTier),
            (0, utils_1.toField)(params.contentHash),
            (0, utils_1.toField)(params.encryptionCommitment),
        ],
        fee: constants_1.FEES.PUBLISH_ENCRYPTED,
    };
}
/**
 * Build an update_content transaction.
 * Updates the minimum tier and content hash for existing content.
 */
function buildUpdateContent(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.UPDATE_CONTENT,
        inputs: [
            (0, utils_1.toField)(params.contentId),
            (0, utils_1.toU8)(params.newMinTier),
            (0, utils_1.toField)(params.newContentHash),
        ],
        fee: constants_1.FEES.UPDATE_CONTENT,
    };
}
/**
 * Build a delete_content transaction.
 * Marks content as deleted with a reason hash. Returns a ContentDeletion record.
 */
function buildDeleteContent(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.DELETE_CONTENT,
        inputs: [
            (0, utils_1.toField)(params.contentId),
            (0, utils_1.toField)(params.reasonHash),
        ],
        fee: constants_1.FEES.DELETE_CONTENT,
    };
}
/**
 * Build a dispute_content transaction.
 * Files a dispute against content. Requires an AccessPass to prevent Sybil spam.
 */
function buildDisputeContent(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.DISPUTE_CONTENT,
        inputs: [
            params.accessPass,
            (0, utils_1.toField)(params.contentId),
        ],
        fee: constants_1.FEES.DISPUTE_CONTENT,
    };
}
/**
 * Build a revoke_access transaction.
 * Creator revokes a subscriber's access by pass ID.
 */
function buildRevokeAccess(params, programId = constants_1.DEFAULT_PROGRAM_ID) {
    return {
        programId,
        functionName: constants_1.TRANSITIONS.REVOKE_ACCESS,
        inputs: [(0, utils_1.toField)(params.passId)],
        fee: constants_1.FEES.REVOKE_ACCESS,
    };
}
//# sourceMappingURL=content.js.map