// =============================================================================
// @veilsub/sdk — Subscription Management
//
// Transaction builders for subscribe, renew, blind subscribe, trial subscribe,
// stablecoin subscribe, gift, redeem, and transfer pass.
// =============================================================================

import { DEFAULT_PROGRAM_ID, FEES, TRANSITIONS } from './constants';
import type {
  GiftSubscriptionParams,
  RedeemGiftParams,
  RenewBlindParams,
  RenewParams,
  SubscribeBlindParams,
  SubscribeParams,
  SubscribeTrialParams,
  SubscribeUsadParams,
  SubscribeUsdcxParams,
  TransactionParams,
  TransferPassParams,
} from './types';
import { generateFieldId, toField, toU32, toU64, toU8 } from './utils';

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
export function buildSubscribe(
  params: SubscribeParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  const passId = params.passId ?? generateFieldId();
  return {
    programId,
    functionName: TRANSITIONS.SUBSCRIBE,
    inputs: [
      params.paymentRecord,
      params.creatorAddress,
      toU8(params.tier),
      toU64(params.amount),
      toField(passId),
      toU32(params.expiresAt),
    ],
    fee: FEES.SUBSCRIBE,
  };
}

/**
 * Build a subscribe_blind transaction.
 * Novel privacy: uses nonce-based identity rotation so the same subscriber
 * appears as a different identity each subscription period.
 */
export function buildSubscribeBlind(
  params: SubscribeBlindParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  const passId = params.passId ?? generateFieldId();
  return {
    programId,
    functionName: TRANSITIONS.SUBSCRIBE_BLIND,
    inputs: [
      params.paymentRecord,
      params.creatorAddress,
      toField(params.nonce),
      toU8(params.tier),
      toU64(params.amount),
      toField(passId),
      toU32(params.expiresAt),
    ],
    fee: FEES.SUBSCRIBE_BLIND,
  };
}

/**
 * Build a subscribe_trial transaction.
 * Creates an ephemeral AccessPass at 20% of tier price, ~50 min duration.
 */
export function buildSubscribeTrial(
  params: SubscribeTrialParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  const passId = params.passId ?? generateFieldId();
  return {
    programId,
    functionName: TRANSITIONS.SUBSCRIBE_TRIAL,
    inputs: [
      params.paymentRecord,
      params.creatorAddress,
      toU8(params.tier),
      toU64(params.amount),
      toField(passId),
      toU32(params.expiresAt),
    ],
    fee: FEES.SUBSCRIBE_TRIAL,
  };
}

/**
 * Build a subscribe_usdcx transaction.
 * Subscribe using USDCx stablecoin (v28). Requires MerkleProof compliance.
 */
export function buildSubscribeUsdcx(
  params: SubscribeUsdcxParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  const passId = params.passId ?? generateFieldId();
  return {
    programId,
    functionName: TRANSITIONS.SUBSCRIBE_USDCX,
    inputs: [
      params.tokenRecord,
      params.creatorAddress,
      toU8(params.tier),
      `${params.amount}u128`,
      toField(passId),
      toU32(params.expiresAt),
      params.merkleProofs,
    ],
    fee: FEES.SUBSCRIBE_USDCX,
  };
}

/**
 * Build a subscribe_usad transaction.
 * Subscribe using USAD stablecoin (v28). Requires MerkleProof compliance.
 */
export function buildSubscribeUsad(
  params: SubscribeUsadParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  const passId = params.passId ?? generateFieldId();
  return {
    programId,
    functionName: TRANSITIONS.SUBSCRIBE_USAD,
    inputs: [
      params.tokenRecord,
      params.creatorAddress,
      toU8(params.tier),
      `${params.amount}u128`,
      toField(passId),
      toU32(params.expiresAt),
      params.merkleProofs,
    ],
    fee: FEES.SUBSCRIBE_USAD,
  };
}

/**
 * Build a renew transaction.
 * Renews an existing subscription with a new tier/expiry.
 */
export function buildRenew(
  params: RenewParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  const newPassId = params.newPassId ?? generateFieldId();
  return {
    programId,
    functionName: TRANSITIONS.RENEW,
    inputs: [
      params.accessPass,
      params.paymentRecord,
      toU8(params.newTier),
      toU64(params.amount),
      toField(newPassId),
      toU32(params.newExpiresAt),
    ],
    fee: FEES.RENEW,
  };
}

/**
 * Build a renew_blind transaction.
 * Blind renewal with nonce-based identity rotation.
 */
export function buildRenewBlind(
  params: RenewBlindParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  const newPassId = params.newPassId ?? generateFieldId();
  return {
    programId,
    functionName: TRANSITIONS.RENEW_BLIND,
    inputs: [
      params.accessPass,
      params.paymentRecord,
      toField(params.nonce),
      toU8(params.newTier),
      toU64(params.amount),
      toField(newPassId),
      toU32(params.newExpiresAt),
    ],
    fee: FEES.RENEW_BLIND,
  };
}

/**
 * Build a gift_subscription transaction.
 * Gift a subscription to another Aleo address.
 */
export function buildGiftSubscription(
  params: GiftSubscriptionParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  const giftId = params.giftId ?? generateFieldId();
  return {
    programId,
    functionName: TRANSITIONS.GIFT_SUBSCRIPTION,
    inputs: [
      params.paymentRecord,
      params.creatorAddress,
      params.recipientAddress,
      toU8(params.tier),
      toU64(params.amount),
      toField(giftId),
      toU32(params.expiresAt),
    ],
    fee: FEES.GIFT_SUBSCRIPTION,
  };
}

/**
 * Build a redeem_gift transaction.
 * Redeems a GiftToken into an AccessPass.
 */
export function buildRedeemGift(
  params: RedeemGiftParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.REDEEM_GIFT,
    inputs: [params.giftToken],
    fee: FEES.REDEEM_GIFT,
  };
}

/**
 * Build a transfer_pass transaction.
 * Transfers an AccessPass to another Aleo address (unique to VeilSub).
 */
export function buildTransferPass(
  params: TransferPassParams,
  programId = DEFAULT_PROGRAM_ID,
): TransactionParams {
  return {
    programId,
    functionName: TRANSITIONS.TRANSFER_PASS,
    inputs: [params.accessPass, params.recipientAddress],
    fee: FEES.TRANSFER_PASS,
  };
}
