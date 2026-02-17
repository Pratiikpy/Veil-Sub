'use client'

import { useCallback } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { PROGRAM_ID, FEES, TOKEN_FEES } from '@/lib/config'

// Timeout wrapper: prevents requestRecords from hanging forever.
// Shield Wallet can silently hang on INVALID_PARAMS — this ensures we always get a result.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

export function useVeilSub() {
  const {
    address,
    connected,
    executeTransaction,
    requestRecords,
    wallet,
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

  // v7: Single-record subscribe — no split needed
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

  // v7: Single-record tip — no split needed
  const tip = useCallback(
    async (
      paymentRecord: string,
      creatorAddress: string,
      amountMicrocredits: number
    ) => {
      return execute(
        'tip',
        [
          paymentRecord,
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

  // v7: Single-record renew — no split needed
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

  // Extract microcredits from any record format (mirrors NullPay's getMicrocredits)
  const getMicrocredits = (record: any): number => {
    try {
      // Path 1: structured data field (Leo Wallet format with includePlaintext: false)
      if (record?.data?.microcredits) {
        const raw = String(record.data.microcredits).replace(/_/g, '').replace('.private', '').replace('u64', '')
        const val = parseInt(raw, 10)
        if (val > 0) return val
      }
      // Path 2: plaintext or recordPlaintext string (contains "microcredits: Xu64")
      // Shield Wallet uses `recordPlaintext`, standard format uses `plaintext`
      const text = typeof record === 'string' ? record : (record?.plaintext || record?.recordPlaintext)
      if (text) {
        const match = text.match(/microcredits\s*:\s*([\d_]+)u64/)
        if (match?.[1]) return parseInt(match[1].replace(/_/g, ''), 10)
      }
      // Path 3: if record itself is the data object (nested call)
      if (record?.microcredits) {
        const raw = String(record.microcredits).replace(/_/g, '').replace('.private', '').replace('u64', '')
        const val = parseInt(raw, 10)
        if (val > 0) return val
      }
      return 0
    } catch { return 0 }
  }

  // Process a single record: try all formats, lazy-decrypt if needed
  const processRecord = async (r: any): Promise<{ plaintext: string; microcredits: number } | null> => {
    if (r?.spent) return null

    let val = getMicrocredits(r)

    // Shield Wallet returns `recordPlaintext` (not `plaintext`).
    // Normalize: copy recordPlaintext → plaintext if missing.
    if (!r?.plaintext && r?.recordPlaintext) {
      r.plaintext = r.recordPlaintext
      if (val === 0) val = getMicrocredits(r)
    }

    // Try to decrypt the record to get plaintext when we have ciphertext but no plaintext
    const cipher = r?.recordCiphertext || r?.ciphertext
    if (cipher && !r?.plaintext && decrypt) {
      try {
        const decrypted = await decrypt(cipher)
        if (decrypted) {
          r.plaintext = decrypted
          if (val === 0) val = getMicrocredits(r)
        }
      } catch (decryptErr) {
        // Decrypt failed — record may be from another program
      }
    }

    if (val <= 0) return null

    // Extract plaintext string for transaction input
    let plaintext = ''
    if (typeof r === 'string') {
      plaintext = r
    } else if (r?.plaintext) {
      plaintext = r.plaintext
    } else if (r?.recordPlaintext) {
      plaintext = r.recordPlaintext
    } else {
      // Reconstruct from structured data (NullPay pattern)
      const nonce = r?.nonce || r?._nonce || r?.data?._nonce
      const owner = r?.owner || r?.data?.owner
      if (nonce && owner) {
        const cleanOwner = String(owner).replace(/\.private$/, '')
        const cleanNonce = String(nonce).replace(/\.public$/, '')
        plaintext = `{ owner: ${cleanOwner}.private, microcredits: ${val}u64.private, _nonce: ${cleanNonce}.public }`
      } else if (r?.ciphertext) {
        plaintext = r.ciphertext
      }
    }

    if (!plaintext) {
      // Record has value but no plaintext — skip
      return null
    }
    return { plaintext, microcredits: val }
  }

  const extractPlaintext = async (r: any): Promise<string> => {
    if (r?.spent) return ''
    if (typeof r === 'string') return r
    if (r?.plaintext) return r.plaintext
    if (r?.recordPlaintext) return r.recordPlaintext
    if ((r?.recordCiphertext || r?.ciphertext) && decrypt) {
      try {
        const decrypted = await decrypt(r.recordCiphertext || r.ciphertext)
        if (decrypted) return decrypted
      } catch { /* skip */ }
    }
    return ''
  }

  const getTokenRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await withTimeout(
        requestRecords('token_registry.aleo', false),
        15000,
        'requestRecords(token_registry.aleo)'
      )
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
      return []
    }
  }, [connected, requestRecords, decrypt])

  // Fetch credits records — tries includePlaintext: true first (Shield Wallet),
  // falls back to false + decrypt (Leo Wallet throws NOT_GRANTED on true).
  const getCreditsRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) {
      return []
    }

    const results: { plaintext: string; microcredits: number }[] = []
    let usedFalseMode = false

    // Strategy 1: includePlaintext: true (works with Shield Wallet)
    let recordsArr: any[] = []
    try {
      const records = await withTimeout(
        requestRecords('credits.aleo', true),
        15000,
        'requestRecords(credits.aleo, true)'
      )
      recordsArr = records as any[]
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
        recordsArr = records as any[]
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
    // Leo Wallet doesn't support requestRecordPlaintexts — transactions
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
  }, [connected, requestRecords, decrypt])

  const getAccessPasses = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      const records = await withTimeout(
        requestRecords(PROGRAM_ID, false),
        15000,
        `requestRecords(${PROGRAM_ID})`
      )
      const results: string[] = []

      for (const r of records as any[]) {
        if ((r as any)?.spent) continue
        const text = await extractPlaintext(r)
        if (text) results.push(text)
      }

      return results
    } catch (err) {
      return []
    }
  }, [connected, requestRecords, decrypt])

  // Poll transaction status using wallet.adapter (NullPay pattern)
  const pollTxStatus = useCallback(
    async (txId: string): Promise<string> => {
      try {
        // NullPay pattern: wallet.adapter.transactionStatus()
        if (wallet?.adapter?.transactionStatus) {
          const result = await wallet.adapter.transactionStatus(txId)
          const status = typeof result === 'string'
            ? result
            : (result as any)?.status ?? 'unknown'
          return status
        }
        return 'unknown'
      } catch {
        return 'unknown'
      }
    },
    [wallet]
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
