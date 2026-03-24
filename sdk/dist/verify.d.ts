import type { CreateAuditTokenParams, ProveThresholdParams, TransactionParams, VerifyAccessParams, VerifyTierAccessParams } from './types';
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
export declare function buildVerifyAccess(params: VerifyAccessParams, programId?: string): TransactionParams;
/**
 * Build a verify_tier_access transaction.
 * Verifies that an AccessPass meets a minimum tier requirement.
 * Checks both revocation and expiry on-chain.
 */
export declare function buildVerifyTierAccess(params: VerifyTierAccessParams, programId?: string): TransactionParams;
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
export declare function buildCreateAuditToken(params: CreateAuditTokenParams, programId?: string): TransactionParams;
/**
 * Build a prove_subscriber_threshold transaction.
 * Privacy-preserving reputation proof: proves the caller (creator) has
 * at least `threshold` subscribers without revealing the exact count.
 */
export declare function buildProveThreshold(params: ProveThresholdParams, programId?: string): TransactionParams;
//# sourceMappingURL=verify.d.ts.map