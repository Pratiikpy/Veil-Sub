'use client'

import { useCallback } from 'react'
import { useContractExecute } from './useContractExecute'
import { FEES } from '@/lib/config'

export function useSubscription() {
  const { execute } = useContractExecute()

  // v8: Single-record subscribe -- returns AccessPass + CreatorReceipt
  const subscribe = useCallback(
    async (
      paymentRecord: string,
      creatorAddress: string,
      tier: number,
      amountMicrocredits: number,
      passId: string,
      expiresAt: number
    ) => {
      return execute(
        'subscribe',
        [
          paymentRecord,
          creatorAddress,
          `${tier}u8`,
          `${amountMicrocredits}u64`,
          `${passId}field`,
          `${expiresAt}u32`,
        ],
        FEES.SUBSCRIBE
      )
    },
    [execute]
  )

  // v11: Blind subscribe (novel privacy -- nonce-based identity rotation)
  const subscribeBlind = useCallback(
    async (
      paymentRecord: string,
      creatorAddress: string,
      nonce: string,
      tier: number,
      amount: number,
      passId: string,
      expiresAt: number
    ) => {
      return execute(
        'subscribe_blind',
        [
          paymentRecord,
          creatorAddress,
          `${nonce}field`,
          `${tier}u8`,
          `${amount}u64`,
          `${passId}field`,
          `${expiresAt}u32`,
        ],
        FEES.SUBSCRIBE_BLIND
      )
    },
    [execute]
  )

  // Trial subscribe -- ephemeral short-lived access pass at reduced price
  const subscribeTrial = useCallback(
    async (
      paymentRecord: string,
      creatorAddress: string,
      tier: number,
      amountMicrocredits: number,
      passId: string,
      expiresAt: number
    ) => {
      return execute(
        'subscribe_trial',
        [
          paymentRecord,
          creatorAddress,
          `${tier}u8`,
          `${amountMicrocredits}u64`,
          `${passId}field`,
          `${expiresAt}u32`,
        ],
        FEES.SUBSCRIBE_TRIAL
      )
    },
    [execute]
  )

  // v8: Single-record renew -- returns AccessPass + CreatorReceipt
  const renew = useCallback(
    async (
      accessPassPlaintext: string,
      paymentRecord: string,
      newTier: number,
      amountMicrocredits: number,
      newPassId: string,
      newExpiresAt: number
    ) => {
      return execute(
        'renew',
        [
          accessPassPlaintext,
          paymentRecord,
          `${newTier}u8`,
          `${amountMicrocredits}u64`,
          `${newPassId}field`,
          `${newExpiresAt}u32`,
        ],
        FEES.RENEW
      )
    },
    [execute]
  )

  // v11: Blind renewal (novel privacy)
  const renewBlind = useCallback(
    async (
      accessPassPlaintext: string,
      paymentRecord: string,
      nonce: string,
      newTier: number,
      amount: number,
      newPassId: string,
      newExpiresAt: number
    ) => {
      return execute(
        'renew_blind',
        [
          accessPassPlaintext,
          paymentRecord,
          `${nonce}field`,
          `${newTier}u8`,
          `${amount}u64`,
          `${newPassId}field`,
          `${newExpiresAt}u32`,
        ],
        FEES.RENEW_BLIND
      )
    },
    [execute]
  )

  // v10: Gift a subscription to another address
  const giftSubscription = useCallback(
    async (
      paymentRecord: string,
      creatorAddress: string,
      recipientAddress: string,
      tier: number,
      amount: number,
      giftId: string,
      expiresAt: number
    ) => {
      return execute(
        'gift_subscription',
        [
          paymentRecord,
          creatorAddress,
          recipientAddress,
          `${tier}u8`,
          `${amount}u64`,
          `${giftId}field`,
          `${expiresAt}u32`,
        ],
        FEES.GIFT_SUBSCRIPTION
      )
    },
    [execute]
  )

  // v10: Redeem a gift token into an AccessPass
  const redeemGift = useCallback(
    async (giftTokenPlaintext: string) => {
      return execute(
        'redeem_gift',
        [giftTokenPlaintext],
        FEES.REDEEM_GIFT
      )
    },
    [execute]
  )

  // v15: Transfer an AccessPass to another user
  const transferPass = useCallback(
    async (accessPassPlaintext: string, recipientAddress: string) => {
      return execute(
        'transfer_pass',
        [accessPassPlaintext, recipientAddress],
        FEES.TRANSFER_PASS
      )
    },
    [execute]
  )

  // v29: USDCx stablecoin subscription
  // NOTE: Requires USDCx Token records and MerkleProof compliance arrays from test_usdcx_stablecoin.aleo.
  // TODO: Full integration pending Shield Wallet support for stablecoin record selection.
  const subscribeUsdcx = useCallback(
    async (
      tokenRecord: string,
      creatorAddress: string,
      tier: number,
      amountU128: string,
      passId: string,
      expiresAt: number,
      merkleProofs: string
    ) => {
      return execute(
        'subscribe_usdcx',
        [
          tokenRecord,
          creatorAddress,
          `${tier}u8`,
          `${amountU128}u128`,
          `${passId}field`,
          `${expiresAt}u32`,
          merkleProofs,
        ],
        FEES.SUBSCRIBE_USDCX
      )
    },
    [execute]
  )

  // v29: USAD stablecoin subscription
  // NOTE: Requires USAD Token records and MerkleProof compliance arrays from test_usad_stablecoin.aleo.
  // TODO: Full integration pending Shield Wallet support for stablecoin record selection.
  const subscribeUsad = useCallback(
    async (
      tokenRecord: string,
      creatorAddress: string,
      tier: number,
      amountU128: string,
      passId: string,
      expiresAt: number,
      merkleProofs: string
    ) => {
      return execute(
        'subscribe_usad',
        [
          tokenRecord,
          creatorAddress,
          `${tier}u8`,
          `${amountU128}u128`,
          `${passId}field`,
          `${expiresAt}u32`,
          merkleProofs,
        ],
        FEES.SUBSCRIBE_USAD
      )
    },
    [execute]
  )

  return {
    subscribe,
    subscribeBlind,
    subscribeTrial,
    subscribeUsdcx,
    subscribeUsad,
    renew,
    renewBlind,
    giftSubscription,
    redeemGift,
    transferPass,
  }
}
