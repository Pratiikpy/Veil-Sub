import type { CommitTipParams, RevealTipParams, TipParams, TipUsdcxParams, TipUsadParams, TransactionParams } from './types';
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
export declare function buildTip(params: TipParams, programId?: string): TransactionParams;
/**
 * Build a commit_tip transaction (phase 1 of commit-reveal tipping).
 * Commits to a tip amount using BHP256 hashing. The tip is not transferred
 * until the reveal phase.
 */
export declare function buildCommitTip(params: CommitTipParams, programId?: string): TransactionParams;
/**
 * Build a reveal_tip transaction (phase 2 of commit-reveal tipping).
 * Reveals the committed tip and executes the transfer.
 * Amount and salt must match the previous commit.
 */
export declare function buildRevealTip(params: RevealTipParams, programId?: string): TransactionParams;
/**
 * Build a tip_usdcx transaction.
 * Tip a creator using USDCx stablecoin (v28).
 */
export declare function buildTipUsdcx(params: TipUsdcxParams, programId?: string): TransactionParams;
/**
 * Build a tip_usad transaction.
 * Tip a creator using USAD stablecoin (v28).
 */
export declare function buildTipUsad(params: TipUsadParams, programId?: string): TransactionParams;
//# sourceMappingURL=tipping.d.ts.map