'use client'

import { useCallback } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { PROGRAM_ID, FEES, TOKEN_FEES } from '@/lib/config'

export function useVeilSub() {
  const {
    address,
    connected,
    executeTransaction,
    requestRecords,
    transactionStatus,
  } = useWallet()

  // Generic execute helper — uses new @provablehq executeTransaction API
  const execute = useCallback(
    async (
      functionName: string,
      inputs: string[],
      fee: number
    ): Promise<string | null> => {
      if (!address || !executeTransaction) {
        throw new Error('Wallet not connected')
      }

      const result = await executeTransaction({
        program: PROGRAM_ID,
        function: functionName,
        inputs,
        fee,
        privateFee: false,
      })

      return result?.transactionId ?? null
    },
    [address, executeTransaction]
  )

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

  const subscribe = useCallback(
    async (
      creditsRecordCreator: string,
      creditsRecordPlatform: string,
      creatorAddress: string,
      tier: number,
      amountMicrocredits: number,
      passId: string,
      expiresAt: number
    ) => {
      return execute(
        'subscribe',
        [
          creditsRecordCreator,
          creditsRecordPlatform,
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

  const tip = useCallback(
    async (
      creditsRecordCreator: string,
      creditsRecordPlatform: string,
      creatorAddress: string,
      amountMicrocredits: number
    ) => {
      return execute(
        'tip',
        [
          creditsRecordCreator,
          creditsRecordPlatform,
          creatorAddress,
          `${amountMicrocredits}u64`,
        ],
        FEES.TIP
      )
    },
    [execute]
  )

  const verifyAccess = useCallback(
    async (accessPassPlaintext: string, creatorAddress: string) => {
      return execute(
        'verify_access',
        [accessPassPlaintext, creatorAddress],
        FEES.VERIFY
      )
    },
    [execute]
  )

  const renew = useCallback(
    async (
      accessPassPlaintext: string,
      creditsRecordCreator: string,
      creditsRecordPlatform: string,
      newTier: number,
      amountMicrocredits: number,
      newPassId: string,
      newExpiresAt: number
    ) => {
      return execute(
        'renew',
        [
          accessPassPlaintext,
          creditsRecordCreator,
          creditsRecordPlatform,
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

  const publishContent = useCallback(
    async (contentId: string, minTier: number) => {
      return execute(
        'publish_content',
        [
          `${contentId}field`,
          `${minTier}u8`,
        ],
        FEES.PUBLISH
      )
    },
    [execute]
  )

  // =========================================
  // v5 Token Transitions
  // =========================================

  const setTokenPrice = useCallback(
    async (tokenId: string, price: number) => {
      return execute(
        'set_token_price',
        [`${tokenId}field`, `${price}u128`],
        TOKEN_FEES.SET_TOKEN_PRICE
      )
    },
    [execute]
  )

  const subscribeToken = useCallback(
    async (
      tokenRecCreator: string,
      tokenRecPlatform: string,
      creatorAddress: string,
      tier: number,
      amount: number,
      tokenId: string,
      passId: string,
      expiresAt: number
    ) => {
      return execute(
        'subscribe_token',
        [
          tokenRecCreator,
          tokenRecPlatform,
          creatorAddress,
          `${tier}u8`,
          `${amount}u128`,
          `${tokenId}field`,
          `${passId}field`,
          `${expiresAt}u32`,
        ],
        TOKEN_FEES.SUBSCRIBE_TOKEN
      )
    },
    [execute]
  )

  const tipToken = useCallback(
    async (
      tokenRecCreator: string,
      tokenRecPlatform: string,
      creatorAddress: string,
      amount: number,
      tokenId: string
    ) => {
      return execute(
        'tip_token',
        [
          tokenRecCreator,
          tokenRecPlatform,
          creatorAddress,
          `${amount}u128`,
          `${tokenId}field`,
        ],
        TOKEN_FEES.TIP_TOKEN
      )
    },
    [execute]
  )

  // New API: requestRecords(program, includePlaintext?) replaces requestRecordPlaintexts
  const getTokenRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await requestRecords('token_registry.aleo', true)
      const plaintexts = records.map((r: unknown) => {
        if (typeof r === 'string') return r
        if (r && typeof r === 'object' && 'plaintext' in r)
          return (r as { plaintext: string }).plaintext
        return ''
      }).filter(Boolean)

      const parseAmount = (plaintext: string): number => {
        const match = plaintext.match(/amount\s*:\s*(\d+)u128/)
        return match ? parseInt(match[1], 10) : 0
      }

      return plaintexts
        .filter((p) => parseAmount(p) > 0)
        .sort((a, b) => parseAmount(b) - parseAmount(a))
    } catch (err) {
      console.error('[VeilSub] Failed to fetch token records:', err)
      return []
    }
  }, [connected, requestRecords])

  const getCreditsRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await requestRecords('credits.aleo', true)
      const plaintexts = records.map((r: unknown) => {
        if (typeof r === 'string') return r
        if (r && typeof r === 'object' && 'plaintext' in r)
          return (r as { plaintext: string }).plaintext
        return ''
      }).filter(Boolean)

      const parseMicrocredits = (plaintext: string): number => {
        const match = plaintext.match(/microcredits\s*:\s*(\d+)u64/)
        return match ? parseInt(match[1], 10) : 0
      }

      return plaintexts
        .filter((p) => parseMicrocredits(p) > 0)
        .sort((a, b) => parseMicrocredits(b) - parseMicrocredits(a))
    } catch (err) {
      console.error('[VeilSub] Failed to fetch credits records:', err)
      return []
    }
  }, [connected, requestRecords])

  const getAccessPasses = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await requestRecords(PROGRAM_ID, true)
      return records.map((r: unknown) => {
        if (typeof r === 'string') return r
        if (r && typeof r === 'object' && 'plaintext' in r)
          return (r as { plaintext: string }).plaintext
        return ''
      }).filter(Boolean)
    } catch (err) {
      console.error('[VeilSub] Failed to fetch access passes:', err)
      return []
    }
  }, [connected, requestRecords])

  const pollTxStatus = useCallback(
    async (txId: string): Promise<string> => {
      if (!transactionStatus) return 'unknown'
      try {
        const result = await transactionStatus(txId)
        return result?.status ?? 'unknown'
      } catch {
        return 'unknown'
      }
    },
    [transactionStatus]
  )

  return {
    publicKey: address,
    connected,
    registerCreator,
    subscribe,
    tip,
    verifyAccess,
    renew,
    publishContent,
    setTokenPrice,
    subscribeToken,
    tipToken,
    getTokenRecords,
    getCreditsRecords,
    getAccessPasses,
    pollTxStatus,
  }
}
