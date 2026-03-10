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

  return {
    subscribe,
    subscribeBlind,
    subscribeTrial,
    renew,
    renewBlind,
    giftSubscription,
    redeemGift,
    transferPass,
  }
}
