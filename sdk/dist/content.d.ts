import type { DeleteContentParams, DisputeContentParams, PublishContentParams, PublishEncryptedParams, RevokeAccessParams, TransactionParams, UpdateContentParams } from './types';
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
export declare function buildPublishContent(params: PublishContentParams, programId?: string): TransactionParams;
/**
 * Build a publish_encrypted_content transaction.
 * Publishes encrypted content with an encryption commitment for verification.
 */
export declare function buildPublishEncryptedContent(params: PublishEncryptedParams, programId?: string): TransactionParams;
/**
 * Build an update_content transaction.
 * Updates the minimum tier and content hash for existing content.
 */
export declare function buildUpdateContent(params: UpdateContentParams, programId?: string): TransactionParams;
/**
 * Build a delete_content transaction.
 * Marks content as deleted with a reason hash. Returns a ContentDeletion record.
 */
export declare function buildDeleteContent(params: DeleteContentParams, programId?: string): TransactionParams;
/**
 * Build a dispute_content transaction.
 * Files a dispute against content. Requires an AccessPass to prevent Sybil spam.
 */
export declare function buildDisputeContent(params: DisputeContentParams, programId?: string): TransactionParams;
/**
 * Build a revoke_access transaction.
 * Creator revokes a subscriber's access by pass ID.
 */
export declare function buildRevokeAccess(params: RevokeAccessParams, programId?: string): TransactionParams;
//# sourceMappingURL=content.d.ts.map