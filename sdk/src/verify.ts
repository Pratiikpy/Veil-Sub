// =============================================================================
// @veilsub/sdk — Verification & Privacy Proofs
//
// Transaction builders for access verification, audit token creation,
// and privacy-preserving reputation proofs.
// =============================================================================

import { DEFAULT_PROGRAM_ID, FEES, SCOPE_ALL, TRANSITIONS } from './constants';
import type {
  CreateAuditTokenParams,
  ProveThresholdParams,
  TransactionParams,
  VerifyAccessParams,
  VerifyTierAccessParams,
} from './types';
import { toU64, toU8 } from './utils';

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
export function buildVerifyAccess(
  params: VerifyAccessParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.VERIFY_ACCESS,
    inputs: [params.accessPass, params.creatorAddress],
    fee: FEES.VERIFY,
  };
}

/**
 * Build a verify_tier_access transaction.
 * Verifies that an AccessPass meets a minimum tier requirement.
 * Checks both revocation and expiry on-chain.
 */
export function buildVerifyTierAccess(
  params: VerifyTierAccessParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.VERIFY_TIER_ACCESS,
    inputs: [params.accessPass, params.creatorAddress, toU8(params.requiredTier)],
    fee: FEES.VERIFY_TIER,
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
export function buildCreateAuditToken(
  params: CreateAuditTokenParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  const scopeMask = params.scopeMask ?? SCOPE_ALL;
  return {
    programId,
    functionName: TRANSITIONS.CREATE_AUDIT_TOKEN,
    inputs: [params.accessPass, params.verifierAddress, toU64(scopeMask)],
    fee: FEES.AUDIT_TOKEN,
  };
}

/**
 * Build a prove_subscriber_threshold transaction.
 * Privacy-preserving reputation proof: proves the caller (creator) has
 * at least `threshold` subscribers without revealing the exact count.
 */
export function buildProveThreshold(
  params: ProveThresholdParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.PROVE_SUBSCRIBER_THRESHOLD,
    inputs: [toU64(params.threshold)],
    fee: FEES.PROVE_THRESHOLD,
  };
}
