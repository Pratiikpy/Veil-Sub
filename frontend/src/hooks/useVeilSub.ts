'use client'

import { useCallback } from 'react'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import {
  Transaction,
  WalletAdapterNetwork,
} from '@demox-labs/aleo-wallet-adapter-base'
import { PROGRAM_ID, FEES, TOKEN_FEES } from '@/lib/config'

export function useVeilSub() {
  const {
    publicKey,
    connected,
    requestTransaction,
    requestRecordPlaintexts,
    requestRecords,
    transactionStatus,
  } = useWallet()

  // Generic execute helper
  const execute = useCallback(
    async (
      functionName: string,
      inputs: string[],
      fee: number
    ): Promise<string | null> => {
      if (!publicKey || !requestTransaction) {
        throw new Error('Wallet not connected')
      }

      const tx = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.Testnet,
        PROGRAM_ID,
        functionName,
        inputs,
        fee,
        false // public fee
      )

      return await requestTransaction(tx)
    },
    [publicKey, requestTransaction]
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

  const getTokenRecords = useCallback(async (): Promise<string[]> => {
    if (!connected) return []
    try {
      let records: unknown[] = []
      if (requestRecordPlaintexts) {
        try {
          records = await requestRecordPlaintexts('token_registry.aleo')
        } catch (err) {
          console.warn('[VeilSub] requestRecordPlaintexts failed for token records, trying fallback:', err)
        }
      }
      if (records.length === 0 && requestRecords) {
        try {
          records = await requestRecords('token_registry.aleo')
        } catch (err) {
          console.error('[VeilSub] requestRecords failed for token records:', err)
          return []
        }
      }
      const plaintexts = records.map((r: unknown) => {
        if (typeof r === 'string') return r
        if (r && typeof r === 'object' && 'plaintext' in r)
          return (r as { plaintext: string }).plaintext
        return ''
      }).filter(Boolean)

      // Parse amount from each record and sort by balance descending
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
  }, [connected, requestRecordPlaintexts, requestRecords])

  const getCreditsRecords = useCallback(async (): Promise<string[]> => {
    if (!connected) return []
    try {
      let records: unknown[] = []
      if (requestRecordPlaintexts) {
        try {
          records = await requestRecordPlaintexts('credits.aleo')
        } catch (err) {
          console.warn('[VeilSub] requestRecordPlaintexts failed, trying fallback:', err)
        }
      }
      if (records.length === 0 && requestRecords) {
        try {
          records = await requestRecords('credits.aleo')
        } catch (err) {
          console.error('[VeilSub] requestRecords failed:', err)
          return []
        }
      }
      const plaintexts = records.map((r: unknown) => {
        if (typeof r === 'string') return r
        if (r && typeof r === 'object' && 'plaintext' in r)
          return (r as { plaintext: string }).plaintext
        return ''
      }).filter(Boolean)

      // Parse microcredits from each record and sort by balance descending
      // Record format: { ..., microcredits: 5000000u64.private, ... }
      const parseMicrocredits = (plaintext: string): number => {
        const match = plaintext.match(/microcredits\s*:\s*(\d+)u64/)
        return match ? parseInt(match[1], 10) : 0
      }

      return plaintexts
        .filter((p) => parseMicrocredits(p) > 0) // Filter out spent/empty records
        .sort((a, b) => parseMicrocredits(b) - parseMicrocredits(a)) // Largest first
    } catch (err) {
      console.error('[VeilSub] Failed to fetch credits records:', err)
      return []
    }
  }, [connected, requestRecordPlaintexts, requestRecords])

  const getAccessPasses = useCallback(async (): Promise<string[]> => {
    if (!connected) return []
    try {
      let records: unknown[] = []
      if (requestRecordPlaintexts) {
        try {
          records = await requestRecordPlaintexts(PROGRAM_ID)
        } catch (err) {
          console.warn('[VeilSub] requestRecordPlaintexts failed for access passes, trying fallback:', err)
        }
      }
      if (records.length === 0 && requestRecords) {
        try {
          records = await requestRecords(PROGRAM_ID)
        } catch (err) {
          console.error('[VeilSub] requestRecords failed for access passes:', err)
          return []
        }
      }
      return records.map((r: unknown) => {
        if (typeof r === 'string') return r
        if (r && typeof r === 'object' && 'plaintext' in r)
          return (r as { plaintext: string }).plaintext
        console.warn('[VeilSub] Skipping unrecognized record format:', r)
        return ''
      }).filter(Boolean)
    } catch (err) {
      console.error('[VeilSub] Failed to fetch access passes:', err)
      return []
    }
  }, [connected, requestRecordPlaintexts, requestRecords])

  const pollTxStatus = useCallback(
    async (txId: string): Promise<string> => {
      if (!transactionStatus) return 'unknown'
      try {
        return await transactionStatus(txId)
      } catch {
        return 'unknown'
      }
    },
    [transactionStatus]
  )

  return {
    publicKey,
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
