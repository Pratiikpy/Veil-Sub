'use client'

import { useCallback } from 'react'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import {
  Transaction,
  WalletAdapterNetwork,
} from '@demox-labs/aleo-wallet-adapter-base'
import { PROGRAM_ID, FEES } from '@/lib/config'

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
      creditsRecordPlaintext: string,
      creatorAddress: string,
      tier: number,
      amountMicrocredits: number,
      passId: string,
      expiresAt: number
    ) => {
      return execute(
        'subscribe',
        [
          creditsRecordPlaintext,
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
      creditsRecordPlaintext: string,
      creatorAddress: string,
      amountMicrocredits: number
    ) => {
      return execute(
        'tip',
        [
          creditsRecordPlaintext,
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
      creditsRecordPlaintext: string,
      newTier: number,
      amountMicrocredits: number,
      newPassId: string,
      newExpiresAt: number
    ) => {
      return execute(
        'renew',
        [
          accessPassPlaintext,
          creditsRecordPlaintext,
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

  const getCreditsRecords = useCallback(async (): Promise<string[]> => {
    if (!connected) return []
    try {
      let records: unknown[] = []
      if (requestRecordPlaintexts) {
        try {
          records = await requestRecordPlaintexts('credits.aleo')
        } catch {
          /* fallback */
        }
      }
      if (records.length === 0 && requestRecords) {
        try {
          records = await requestRecords('credits.aleo')
        } catch {
          return []
        }
      }
      return records.map((r: unknown) => {
        if (typeof r === 'string') return r
        if (r && typeof r === 'object' && 'plaintext' in r)
          return (r as { plaintext: string }).plaintext
        return JSON.stringify(r)
      })
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
        } catch {
          /* fallback */
        }
      }
      if (records.length === 0 && requestRecords) {
        try {
          records = await requestRecords(PROGRAM_ID)
        } catch {
          return []
        }
      }
      return records.map((r: unknown) => {
        if (typeof r === 'string') return r
        if (r && typeof r === 'object' && 'plaintext' in r)
          return (r as { plaintext: string }).plaintext
        return JSON.stringify(r)
      })
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
    getCreditsRecords,
    getAccessPasses,
    pollTxStatus,
  }
}
