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

      console.log(`[VeilSub] execute ${program || PROGRAM_ID}/${functionName}`, { inputs, fee })

      const result = await executeTransaction({
        program: program || PROGRAM_ID,
        function: functionName,
        inputs,
        fee,
        privateFee: false,
      })

      console.log(`[VeilSub] execute result:`, result)
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
      // Path 1: structured data field (Shield Wallet format)
      if (record?.data?.microcredits) {
        const raw = String(record.data.microcredits).replace(/_/g, '').replace('.private', '').replace('u64', '')
        const val = parseInt(raw, 10)
        if (val > 0) return val
      }
      // Path 2: plaintext string (contains "microcredits: Xu64")
      const text = typeof record === 'string' ? record : record?.plaintext
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
    if (r?.spent) {
      console.log('[VeilSub] Skipping spent record')
      return null
    }

    // Log the raw record shape so we can debug format issues
    console.log('[VeilSub] processRecord raw:', {
      type: typeof r,
      hasData: !!r?.data,
      dataKeys: r?.data ? Object.keys(r.data) : [],
      hasPlaintext: !!r?.plaintext,
      hasCiphertext: !!r?.recordCiphertext,
      hasNonce: !!(r?.nonce || r?._nonce || r?.data?._nonce),
      spent: r?.spent,
    })

    let val = getMicrocredits(r)
    console.log('[VeilSub] getMicrocredits initial:', val)

    // If value is 0, try to decrypt the record to get plaintext
    if (val === 0 && r?.recordCiphertext && !r?.plaintext && decrypt) {
      try {
        console.log('[VeilSub] Attempting decrypt...')
        const decrypted = await decrypt(r.recordCiphertext)
        if (decrypted) {
          console.log('[VeilSub] Decrypt succeeded, plaintext length:', decrypted.length)
          r.plaintext = decrypted
          val = getMicrocredits(r)
          console.log('[VeilSub] getMicrocredits after decrypt:', val)
        }
      } catch (decryptErr) {
        console.error('[VeilSub] Decrypt FAILED:', decryptErr)
      }
    }

    // If still no value, try to extract from any nested structure
    if (val === 0) {
      // Last resort: check if we have plaintext but regex didn't match
      const text = typeof r === 'string' ? r : r?.plaintext
      if (text) {
        console.warn('[VeilSub] Has plaintext but getMicrocredits returned 0. Plaintext preview:', text.slice(0, 200))
      }
    }

    if (val <= 0) return null

    // Extract plaintext string for transaction input
    let plaintext = ''
    if (typeof r === 'string') {
      plaintext = r
    } else if (r?.plaintext) {
      plaintext = r.plaintext
    } else {
      // Reconstruct plaintext from structured data
      const nonce = r?.nonce || r?._nonce || r?.data?._nonce
      const owner = r?.owner
      if (nonce && owner) {
        plaintext = `{ owner: ${owner}.private, microcredits: ${val}u64.private, _nonce: ${nonce}.public }`
      } else if (r?.ciphertext) {
        plaintext = r.ciphertext
      }
    }

    if (!plaintext) {
      console.warn('[VeilSub] Record has value', val, 'but could not extract plaintext')
      return null
    }
    return { plaintext, microcredits: val }
  }

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

  const getTokenRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      console.log('[VeilSub] Fetching token_registry.aleo records...')
      const records = await withTimeout(
        requestRecords('token_registry.aleo', false),
        15000,
        'requestRecords(token_registry.aleo)'
      )
      console.log('[VeilSub] Token records received:', (records as any[]).length)
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

  // Fetch credits records with plaintext included (includePlaintext: true)
  // Shield Wallet needs `true` to return .plaintext on record objects.
  // With `false`, records come back without plaintext and getMicrocredits can't parse them.
  const getCreditsRecords = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) {
      console.warn('[VeilSub] getCreditsRecords: not connected or requestRecords unavailable')
      return []
    }
    try {
      console.log('[VeilSub] Fetching credits.aleo records (includePlaintext: true)...')
      const records = await withTimeout(
        requestRecords('credits.aleo', true),
        15000,
        'requestRecords(credits.aleo)'
      )
      const recordsArr = records as any[]
      console.log('[VeilSub] Credits records received:', recordsArr.length)

      // Log first record shape for debugging
      if (recordsArr.length > 0) {
        const r0 = recordsArr[0]
        console.log('[VeilSub] First record shape:', {
          type: typeof r0,
          keys: typeof r0 === 'object' ? Object.keys(r0) : 'N/A',
          hasPlaintext: !!r0?.plaintext,
          hasData: !!r0?.data,
          spent: r0?.spent,
        })
      }

      const results: { plaintext: string; microcredits: number }[] = []

      for (const r of recordsArr) {
        const processed = await processRecord(r)
        if (processed) results.push(processed)
      }

      // If includePlaintext: true didn't help, try with false + decrypt as fallback
      if (results.length === 0 && recordsArr.length > 0) {
        console.warn('[VeilSub] includePlaintext: true returned records but none processed. Trying with false + decrypt...')
        try {
          const fallbackRecords = await withTimeout(
            requestRecords('credits.aleo', false),
            15000,
            'requestRecords(credits.aleo, false)'
          )
          for (const r of fallbackRecords as any[]) {
            const processed = await processRecord(r)
            if (processed) results.push(processed)
          }
        } catch (fallbackErr) {
          console.error('[VeilSub] Fallback fetch also failed:', fallbackErr)
        }
      }

      console.log('[VeilSub] Processed credits records:', results.length, results.map(r => r.microcredits))
      return results
        .sort((a, b) => b.microcredits - a.microcredits)
        .map((r) => r.plaintext)
    } catch (err) {
      console.error('[VeilSub] Failed to fetch credits records:', err)
      throw err
    }
  }, [connected, requestRecords, decrypt])

  const getAccessPasses = useCallback(async (): Promise<string[]> => {
    if (!connected || !requestRecords) return []
    try {
      console.log('[VeilSub] Fetching access passes...')
      const records = await withTimeout(
        requestRecords(PROGRAM_ID, false),
        15000,
        `requestRecords(${PROGRAM_ID})`
      )
      console.log('[VeilSub] Access passes received:', (records as any[]).length)
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
