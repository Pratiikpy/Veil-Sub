'use client'

import { useCallback } from 'react'
import { useContractExecute, WalletRecord, withTimeout, getMicrocredits } from './useContractExecute'
import { DEPLOYED_PROGRAM_ID, FEES } from '@/lib/config'

export function useWalletRecords() {
  const {
    address,
    connected,
    execute,
    requestRecords,
    wallet,
    processRecord,
    extractPlaintext,
  } = useContractExecute()

  // Fetch SubscriptionTier records (for creator tier management)
  const getTierRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await withTimeout(
        requestRecords(DEPLOYED_PROGRAM_ID, false),
        15000,
        `requestRecords(${DEPLOYED_PROGRAM_ID})`
      )
      const results: string[] = []
      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        if (text && text.includes('tier_id') && text.includes('name_hash') && text.includes('price')) results.push(text)
      }
      return results
    } catch (err) { console.error('[useWalletRecords] getTierRecords failed:', err); return [] }
  }, [connected, requestRecords, extractPlaintext])

  // Fetch GiftToken records (for gift recipients)
  const getGiftTokens = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await withTimeout(
        requestRecords(DEPLOYED_PROGRAM_ID, false),
        15000,
        `requestRecords(${DEPLOYED_PROGRAM_ID})`
      )
      const results: string[] = []
      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        if (text && text.includes('gifter_hash')) results.push(text)
      }
      return results
    } catch (err) { console.error('[useWalletRecords] getGiftTokens failed:', err); return [] }
  }, [connected, requestRecords, extractPlaintext])

  // Split a single credits record into two via credits.aleo/split.
  const splitCredits = useCallback(
    async (record: string, splitAmount: number): Promise<string | null> => {
      return execute(
        'split',
        [record, `${splitAmount}u64`],
        FEES.SPLIT,
        'credits.aleo'
      )
    },
    [execute]
  )

  // Convert public credits to a private record via credits.aleo/transfer_public_to_private.
  // This creates a new private record owned by the caller with the specified amount.
  const convertPublicToPrivate = useCallback(
    async (amountMicrocredits: number): Promise<string | null> => {
      if (!address) throw new Error('Wallet not connected')
      return execute(
        'transfer_public_to_private',
        [address, `${amountMicrocredits}u64`],
        FEES.CONVERT,
        'credits.aleo'
      )
    },
    [execute, address]
  )

  const getTokenRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await withTimeout(
        requestRecords('token_registry.aleo', false),
        15000,
        'requestRecords(token_registry.aleo)'
      )
      const results: { plaintext: string; amount: number }[] = []

      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        if (!text) continue
        const match = text.match(/amount\s*:\s*([\d_]+)u128/)
        const amount = match?.[1] ? parseInt(match[1].replace(/_/g, ''), 10) : 0
        if (amount > 0) results.push({ plaintext: text, amount })
      }

      return results.sort((a, b) => b.amount - a.amount).map((r) => r.plaintext)
    } catch (err) {
      console.error('[useWalletRecords] getTokenRecords failed:', err)
      return []
    }
  }, [connected, requestRecords, extractPlaintext])

  // Fetch credits records -- tries includePlaintext: true first (Shield Wallet),
  // falls back to false + decrypt (Leo Wallet throws NOT_GRANTED on true).
  const getCreditsRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) {
      return []
    }

    const results: { plaintext: string; microcredits: number }[] = []
    let usedFalseMode = false

    // Strategy 1: includePlaintext: true (works with Shield Wallet)
    let recordsArr: WalletRecord[] = []
    try {
      const records = await withTimeout(
        requestRecords('credits.aleo', true),
        15000,
        'requestRecords(credits.aleo, true)'
      )
      recordsArr = records as WalletRecord[]
    } catch {
      // Leo Wallet throws NOT_GRANTED when includePlaintext is true
    }

    // Strategy 2: fallback to includePlaintext: false (Leo Wallet path)
    if (recordsArr.length === 0) {
      usedFalseMode = true
      try {
        const records = await withTimeout(
          requestRecords('credits.aleo', false),
          15000,
          'requestRecords(credits.aleo, false)'
        )
        recordsArr = records as WalletRecord[]
      } catch (falseErr) {
        throw falseErr
      }
    }

    for (const r of recordsArr) {
      const processed = await processRecord(r)
      if (processed) results.push(processed)
    }

    // Detect Leo Wallet stripped records: wallet returned records with
    // microcredits value but no plaintext/nonce/ciphertext.
    // Leo Wallet doesn't support requestRecordPlaintexts -- transactions
    // require Shield Wallet.
    if (results.length === 0 && recordsArr.length > 0 && usedFalseMode) {
      const r0 = recordsArr[0]
      const hasValue = getMicrocredits(r0) > 0
      const hasPlaintext = !!(r0?.plaintext)
      const hasNonce = !!(r0?.nonce || r0?._nonce || r0?.data?._nonce)
      const hasCipher = !!(r0?.recordCiphertext || r0?.ciphertext)
      if (hasValue && !hasPlaintext && !hasNonce && !hasCipher) {
        throw new Error(
          'Leo Wallet does not support record plaintext access. ' +
          'Please disconnect and reconnect with Shield Wallet (leo.app) to subscribe, tip, or renew.'
        )
      }
    }

    return results
      .sort((a, b) => b.microcredits - a.microcredits)
      .map((r) => r.plaintext)
  }, [connected, requestRecords, processRecord])

  const getAccessPasses = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await withTimeout(
        requestRecords(DEPLOYED_PROGRAM_ID, false),
        15000,
        `requestRecords(${DEPLOYED_PROGRAM_ID})`
      )
      const results: string[] = []

      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        if (text && text.includes('pass_id') && text.includes('expires_at')) results.push(text)
      }

      return results
    } catch (err) {
      console.error('[useWalletRecords] getAccessPasses failed:', err)
      return []
    }
  }, [connected, requestRecords, extractPlaintext])

  // v8: Fetch CreatorReceipt records (for creator dashboard)
  const getCreatorReceipts = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await withTimeout(
        requestRecords(DEPLOYED_PROGRAM_ID, false),
        15000,
        `requestRecords(${DEPLOYED_PROGRAM_ID})`
      )
      const results: string[] = []

      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        if (text && text.includes('subscriber_hash')) results.push(text)
      }

      return results
    } catch (err) {
      console.error('[useWalletRecords] getCreatorReceipts failed:', err)
      return []
    }
  }, [connected, requestRecords, extractPlaintext])

  // v8: Fetch AuditToken records (for verifiers)
  const getAuditTokens = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await withTimeout(
        requestRecords(DEPLOYED_PROGRAM_ID, false),
        15000,
        `requestRecords(${DEPLOYED_PROGRAM_ID})`
      )
      const results: string[] = []

      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        // AuditTokens have subscriber_hash + expires_at but NO pass_id or amount
        if (text && text.includes('subscriber_hash') && !text.includes('amount')) results.push(text)
      }

      return results
    } catch (err) {
      console.error('[useWalletRecords] getAuditTokens failed:', err)
      return []
    }
  }, [connected, requestRecords, extractPlaintext])

  // Poll transaction status using wallet.adapter (NullPay pattern)
  const pollTxStatus = useCallback(
    async (txId: string): Promise<string> => {
      try {
        // NullPay pattern: wallet.adapter.transactionStatus()
        if (wallet?.adapter?.transactionStatus) {
          const result = await wallet.adapter.transactionStatus(txId)
          const status = typeof result === 'string'
            ? result
            : (result as { status?: string } | null)?.status ?? 'unknown'
          return status
        }
        return 'unknown'
      } catch (err) {
        console.error('[useWalletRecords] pollTxStatus failed:', err)
        return 'unknown'
      }
    },
    [wallet]
  )

  return {
    getCreditsRecords,
    getTierRecords,
    getGiftTokens,
    getTokenRecords,
    splitCredits,
    convertPublicToPrivate,
    getAccessPasses,
    getCreatorReceipts,
    getAuditTokens,
    pollTxStatus,
  }
}
