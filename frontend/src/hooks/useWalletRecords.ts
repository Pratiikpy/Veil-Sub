'use client'

import { useCallback } from 'react'
import { useContractExecute, WalletRecord, withTimeout, getMicrocredits } from './useContractExecute'
import { DEPLOYED_PROGRAM_ID, LEGACY_PROGRAM_IDS, FEES } from '@/lib/config'

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
      if (!Array.isArray(records)) return []
      const results: string[] = []
      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        if (text && text.includes('tier_id') && text.includes('name_hash') && text.includes('price')) results.push(text)
      }
      return results
    } catch (err) {
      // Re-throw network/timeout errors so callers can show meaningful feedback
      if (err instanceof Error &&
          (err.message.includes('timed out') || err.message.includes('TimedOut') || err.message.includes('network'))) {
        throw err
      }
      return []
    }
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
      if (!Array.isArray(records)) return []
      const results: string[] = []
      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        if (text && text.includes('gifter_hash')) results.push(text)
      }
      return results
    } catch (err) {
      if (err instanceof Error &&
          (err.message.includes('timed out') || err.message.includes('TimedOut') || err.message.includes('network'))) {
        throw err
      }
      return []
    }
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
      if (!Array.isArray(records)) return []
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
      if (err instanceof Error &&
          (err.message.includes('timed out') || err.message.includes('TimedOut') || err.message.includes('network'))) {
        throw err
      }
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
      if (Array.isArray(records)) recordsArr = records as WalletRecord[]
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
        if (Array.isArray(records)) recordsArr = records as WalletRecord[]
      } catch (falseErr) {
        // Only rethrow for network/timeout errors; for permission or wallet errors
        // return empty so BalanceConverter is shown instead of a dead-end error.
        if (falseErr instanceof Error &&
            (falseErr.message.includes('timed out') || falseErr.message.includes('TimedOut') || falseErr.message.includes('network'))) {
          throw falseErr
        }
        recordsArr = []
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

    // Helper to extract AccessPass records from a single program
    async function extractPasses(programId: string): Promise<string[]> {
      try {
        const records = await withTimeout(
          requestRecords(programId, false),
          15000,
          `requestRecords(${programId})`
        )
        if (!Array.isArray(records)) return []
        const results: string[] = []
        for (const r of records as WalletRecord[]) {
          if (r?.spent) continue
          const text = await extractPlaintext(r)
          if (text && text.includes('pass_id') && text.includes('expires_at')) results.push(text)
        }
        return results
      } catch (err) {
        if (err instanceof Error &&
            (err.message.includes('timed out') || err.message.includes('TimedOut') || err.message.includes('network'))) {
          throw err
        }
        return []
      }
    }

    // Query current version first
    const currentPasses = await extractPasses(DEPLOYED_PROGRAM_ID)

    // Also query legacy versions for old AccessPass records (best-effort, don't block on failure)
    const legacyResults = await Promise.allSettled(
      LEGACY_PROGRAM_IDS.map(pid => extractPasses(pid))
    )
    const legacyPasses = legacyResults
      .filter((r): r is PromiseFulfilledResult<string[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)

    return [...currentPasses, ...legacyPasses]
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
      if (!Array.isArray(records)) return []
      const results: string[] = []

      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        if (text && text.includes('subscriber_hash')) results.push(text)
      }

      return results
    } catch (err) {
      if (err instanceof Error &&
          (err.message.includes('timed out') || err.message.includes('TimedOut') || err.message.includes('network'))) {
        throw err
      }
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
      if (!Array.isArray(records)) return []
      const results: string[] = []

      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        // AuditTokens have subscriber_hash + expires_at but NO pass_id or amount
        if (text && text.includes('subscriber_hash') && !text.includes('amount')) results.push(text)
      }

      return results
    } catch (err) {
      if (err instanceof Error &&
          (err.message.includes('timed out') || err.message.includes('TimedOut') || err.message.includes('network'))) {
        throw err
      }
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
      } catch {
        return 'unknown'
      }
    },
    [wallet]
  )

  // Fetch USDCx stablecoin Token records from test_usdcx_stablecoin.aleo
  const getUsdcxRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await withTimeout(
        requestRecords('test_usdcx_stablecoin.aleo', false),
        15000,
        'requestRecords(test_usdcx_stablecoin.aleo)'
      )
      if (!Array.isArray(records)) return []
      const results: { plaintext: string; amount: bigint }[] = []
      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        if (!text) continue
        const match = text.match(/amount\s*:\s*([\d_]+)u128/)
        const amount = match?.[1] ? BigInt(match[1].replace(/_/g, '')) : BigInt(0)
        if (amount > BigInt(0)) results.push({ plaintext: text, amount })
      }
      return results.sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0)).map((r) => r.plaintext)
    } catch (err) {
      if (err instanceof Error &&
          (err.message.includes('timed out') || err.message.includes('TimedOut') || err.message.includes('network'))) {
        throw err
      }
      return []
    }
  }, [connected, requestRecords, extractPlaintext])

  // Fetch USAD stablecoin Token records from test_usad_stablecoin.aleo
  const getUsadRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await withTimeout(
        requestRecords('test_usad_stablecoin.aleo', false),
        15000,
        'requestRecords(test_usad_stablecoin.aleo)'
      )
      if (!Array.isArray(records)) return []
      const results: { plaintext: string; amount: bigint }[] = []
      for (const r of records as WalletRecord[]) {
        if (r?.spent) continue
        const text = await extractPlaintext(r)
        if (!text) continue
        const match = text.match(/amount\s*:\s*([\d_]+)u128/)
        const amount = match?.[1] ? BigInt(match[1].replace(/_/g, '')) : BigInt(0)
        if (amount > BigInt(0)) results.push({ plaintext: text, amount })
      }
      return results.sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0)).map((r) => r.plaintext)
    } catch (err) {
      if (err instanceof Error &&
          (err.message.includes('timed out') || err.message.includes('TimedOut') || err.message.includes('network'))) {
        throw err
      }
      return []
    }
  }, [connected, requestRecords, extractPlaintext])

  return {
    getCreditsRecords,
    getUsdcxRecords,
    getUsadRecords,
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
