// =============================================================================
// @veilsub/sdk — Content Management
//
// Transaction builders for publishing, updating, deleting, and disputing content.
// =============================================================================

import { DEFAULT_PROGRAM_ID, FEES, TRANSITIONS } from './constants';
import type {
  DeleteContentParams,
  DisputeContentParams,
  PublishContentParams,
  PublishEncryptedParams,
  RevokeAccessParams,
  TransactionParams,
  UpdateContentParams,
} from './types';
import { toField, toU8 } from './utils';

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
export function buildPublishContent(
  params: PublishContentParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.PUBLISH_CONTENT,
    inputs: [
      toField(params.contentId),
      toU8(params.minTier),
      toField(params.contentHash),
    ],
    fee: FEES.PUBLISH,
  };
}

/**
 * Build a publish_encrypted_content transaction.
 * Publishes encrypted content with an encryption commitment for verification.
 */
export function buildPublishEncryptedContent(
  params: PublishEncryptedParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.PUBLISH_ENCRYPTED_CONTENT,
    inputs: [
      toField(params.contentId),
      toU8(params.minTier),
      toField(params.contentHash),
      toField(params.encryptionCommitment),
    ],
    fee: FEES.PUBLISH_ENCRYPTED,
  };
}

/**
 * Build an update_content transaction.
 * Updates the minimum tier and content hash for existing content.
 */
export function buildUpdateContent(
  params: UpdateContentParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.UPDATE_CONTENT,
    inputs: [
      toField(params.contentId),
      toU8(params.newMinTier),
      toField(params.newContentHash),
    ],
    fee: FEES.UPDATE_CONTENT,
  };
}

/**
 * Build a delete_content transaction.
 * Marks content as deleted with a reason hash. Returns a ContentDeletion record.
 */
export function buildDeleteContent(
  params: DeleteContentParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.DELETE_CONTENT,
    inputs: [
      toField(params.contentId),
      toField(params.reasonHash),
    ],
    fee: FEES.DELETE_CONTENT,
  };
}

/**
 * Build a dispute_content transaction.
 * Files a dispute against content. Requires an AccessPass to prevent Sybil spam.
 */
export function buildDisputeContent(
  params: DisputeContentParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.DISPUTE_CONTENT,
    inputs: [
      params.accessPass,
      toField(params.contentId),
    ],
    fee: FEES.DISPUTE_CONTENT,
  };
}

/**
 * Build a revoke_access transaction.
 * Creator revokes a subscriber's access by pass ID.
 */
export function buildRevokeAccess(
  params: RevokeAccessParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.REVOKE_ACCESS,
    inputs: [toField(params.passId)],
    fee: FEES.REVOKE_ACCESS,
  };
}
