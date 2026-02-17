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
    decrypt,
  } = useWallet()

  // Generic execute helper — uses new @provablehq executeTransaction API
  const execute = useCallback(
    async (
      functionName: string,
      inputs: string[],
      fee: number,
      program?: string
    ): Promise<string | null> => {
      if (!address || !executeTransaction) {
        throw new Error('Wallet not connected')
      }

      const result = await executeTransaction({
        program: program || PROGRAM_ID,
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

  // Split a single credits record into two via credits.aleo/split.
  // Used when user has only 1 record but needs 2 for subscribe/tip/renew.
  const splitCredits = useCallback(
    async (record: string, splitAmount: number): Promise<string | null> => {
      return execute(
        'split',
        [record, `${splitAmount}u64`],
        500_000, // 0.5 credits base fee for split tx
        'credits.aleo'
      )
    },
    [execute]
  )

  // Extract microcredits from any record format (mirrors NullPay's getMicrocredits)
  const getMicrocredits = (record: any): number => {
    try {
      // Format 1: object with data.microcredits (e.g. { data: { microcredits: "1000000u64" } })
      if (record?.data?.microcredits) {
        return parseInt(String(record.data.microcredits).replace(/_/g, '').replace('u64', ''), 10)
      }
      // Format 2: plaintext string with microcredits field
      const text = typeof record === 'string' ? record : record?.plaintext
      if (text) {
        const match = text.match(/microcredits\s*:\s*([\d_]+)u64/)
        if (match?.[1]) return parseInt(match[1].replace(/_/g, ''), 10)
      }
      return 0
    } catch { return 0 }
  }

  // Process a single record: try all formats, lazy-decrypt if needed (mirrors NullPay's processRecord)
  const processRecord = async (r: any): Promise<{ plaintext: string; microcredits: number } | null> => {
    // Skip spent records
    if (r?.spent) return null

    // Try getting value from known formats first
    let val = getMicrocredits(r)

    // Lazy decryption: if value is 0 and there's a ciphertext, try decrypting
    if (val === 0 && r?.recordCiphertext && !r?.plaintext && decrypt) {
      try {
        const decrypted = await decrypt(r.recordCiphertext)
        if (decrypted) {
          r.plaintext = decrypted
          val = getMicrocredits(r)
        }
      } catch { /* decryption failed, continue */ }
    }

    if (val <= 0) return null

    // Get or build the plaintext string for transaction input
    let plaintext = ''

    if (typeof r === 'string') {
      plaintext = r
    } else if (r?.plaintext) {
      plaintext = r.plaintext
    } else {
      // Reconstruct plaintext from component fields (NullPay pattern)
      const nonce = r?.nonce || r?._nonce || r?.data?._nonce
      const owner = r?.owner
      if (nonce && owner) {
        plaintext = `{ owner: ${owner}.private, microcredits: ${val}u64.private, _nonce: ${nonce}.public }`
      } else if (r?.ciphertext) {
        plaintext = r.ciphertext
      }
    }

    if (!plaintext) return null
    return { plaintext, microcredits: val }
  }

  // Extract plaintext from a record, with lazy decryption for non-credits records
  const extractPlaintext = async (r: any): Promise<string> => {
    if (r?.spent) return ''
    if (typeof r === 'string') return r
    if (r?.plaintext) return r.plaintext
    if (r?.recordCiphertext && decrypt) {
      try {
        const decrypted = await decrypt(r.recordCiphertext)
        if (decrypted) return decrypted
      } catch { /* skip */ }
    }
    return ''
  }

  // Fetch all records (including spent), then filter for valid ones with positive balance
  const getTokenRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await requestRecords('token_registry.aleo', false)
      const results: { plaintext: string; amount: number }[] = []

      for (const r of records as any[]) {
        if ((r as any)?.spent) continue
        const text = await extractPlaintext(r)
        if (!text) continue
        const match = text.match(/amount\s*:\s*([\d_]+)u128/)
        const amount = match?.[1] ? parseInt(match[1].replace(/_/g, ''), 10) : 0
        if (amount > 0) results.push({ plaintext: text, amount })
      }

      return results.sort((a, b) => b.amount - a.amount).map((r) => r.plaintext)
    } catch (err) {
      console.error('[VeilSub] Failed to fetch token records:', err)
      return []
    }
  }, [connected, requestRecords, decrypt])

  const getCreditsRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await requestRecords('credits.aleo', false)
      const results: { plaintext: string; microcredits: number }[] = []

      for (const r of records as any[]) {
        const processed = await processRecord(r)
        if (processed) results.push(processed)
      }

      // Sort by balance descending, return plaintext strings
      return results
        .sort((a, b) => b.microcredits - a.microcredits)
        .map((r) => r.plaintext)
    } catch (err) {
      console.error('[VeilSub] Failed to fetch credits records:', err)
      return []
    }
  }, [connected, requestRecords, decrypt])

  const getAccessPasses = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await requestRecords(PROGRAM_ID, false)
      const results: string[] = []

      for (const r of records as any[]) {
        if ((r as any)?.spent) continue
        const text = await extractPlaintext(r)
        if (text) results.push(text)
      }

      return results
    } catch (err) {
      console.error('[VeilSub] Failed to fetch access passes:', err)
      return []
    }
  }, [connected, requestRecords, decrypt])

  const pollTxStatus = useCallback(
    async (txId: string): Promise<string> => {
      if (!transactionStatus) return 'unknown'
      try {
        const result = await transactionStatus(txId)
        return typeof result === 'string' ? result : result?.status ?? 'unknown'
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
    splitCredits,
    getTokenRecords,
    getCreditsRecords,
    getAccessPasses,
    pollTxStatus,
  }
}
