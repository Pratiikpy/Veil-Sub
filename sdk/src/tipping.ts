// =============================================================================
// @veilsub/sdk — Tipping
//
// Transaction builders for direct tips, commit-reveal tipping,
// and stablecoin tips (USDCx, USAD).
// =============================================================================

import { DEFAULT_PROGRAM_ID, FEES, TRANSITIONS } from './constants';
import type {
  CommitTipParams,
  RevealTipParams,
  TipParams,
  TipUsdcxParams,
  TipUsadParams,
  TransactionParams,
} from './types';
import { toField, toU64 } from './utils';

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
export function buildTip(
  params: TipParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.TIP,
    inputs: [
      params.paymentRecord,
      params.creatorAddress,
      toU64(params.amount),
    ],
    fee: FEES.TIP,
  };
}

/**
 * Build a commit_tip transaction (phase 1 of commit-reveal tipping).
 * Commits to a tip amount using BHP256 hashing. The tip is not transferred
 * until the reveal phase.
 */
export function buildCommitTip(
  params: CommitTipParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.COMMIT_TIP,
    inputs: [
      params.creatorAddress,
      toU64(params.amount),
      toField(params.salt),
    ],
    fee: FEES.COMMIT_TIP,
  };
}

/**
 * Build a reveal_tip transaction (phase 2 of commit-reveal tipping).
 * Reveals the committed tip and executes the transfer.
 * Amount and salt must match the previous commit.
 */
export function buildRevealTip(
  params: RevealTipParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.REVEAL_TIP,
    inputs: [
      params.paymentRecord,
      params.creatorAddress,
      toU64(params.amount),
      toField(params.salt),
    ],
    fee: FEES.REVEAL_TIP,
  };
}

/**
 * Build a tip_usdcx transaction.
 * Tip a creator using USDCx stablecoin (v28).
 */
export function buildTipUsdcx(
  params: TipUsdcxParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.TIP_USDCX,
    inputs: [
      params.tokenRecord,
      params.creatorAddress,
      `${params.amount}u128`,
      params.merkleProofs,
    ],
    fee: FEES.TIP_USDCX,
  };
}

/**
 * Build a tip_usad transaction.
 * Tip a creator using USAD stablecoin (v28).
 */
export function buildTipUsad(
  params: TipUsadParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.TIP_USAD,
    inputs: [
      params.tokenRecord,
      params.creatorAddress,
      `${params.amount}u128`,
      params.merkleProofs,
    ],
    fee: FEES.TIP_USAD,
  };
}
