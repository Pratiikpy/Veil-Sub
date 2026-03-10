'use client'

import { useCallback } from 'react'
import { useContractExecute } from './useContractExecute'
import { FEES } from '@/lib/config'

export function useCreatorActions() {
  const { execute } = useContractExecute()

  const registerCreator = useCallback(
    async (priceInMicrocredits: number) => {
      return execute(
        'register_creator',
        [`${priceInMicrocredits}u64`],
        FEES.REGISTER
      )
    },
    [execute]
  )

  // v9: Dynamic Tier Management

  const createCustomTier = useCallback(
    async (tierId: number, price: number, nameHash: string) => {
      return execute(
        'create_custom_tier',
        [`${tierId}u8`, `${price}u64`, `${nameHash}field`],
        FEES.CREATE_TIER
      )
    },
    [execute]
  )

  const updateTierPrice = useCallback(
    async (tierRecordPlaintext: string, newPrice: number) => {
      return execute(
        'update_tier_price',
        [tierRecordPlaintext, `${newPrice}u64`],
        FEES.UPDATE_TIER
      )
    },
    [execute]
  )

  const deprecateTier = useCallback(
    async (tierRecordPlaintext: string) => {
      return execute(
        'deprecate_tier',
        [tierRecordPlaintext],
        FEES.DEPRECATE_TIER
      )
    },
    [execute]
  )

  const withdrawCreatorRevenue = useCallback(
    async (amount: number) => {
      return execute(
        'withdraw_creator_rev',
        [`${amount}u64`],
        FEES.WITHDRAW_CREATOR
      )
    },
    [execute]
  )

  const withdrawPlatformFees = useCallback(
    async (amount: number) => {
      return execute(
        'withdraw_platform_fees',
        [`${amount}u64`],
        FEES.WITHDRAW_PLATFORM
      )
    },
    [execute]
  )

  return {
    registerCreator,
    createCustomTier,
    updateTierPrice,
    deprecateTier,
    withdrawCreatorRevenue,
    withdrawPlatformFees,
  }
}
