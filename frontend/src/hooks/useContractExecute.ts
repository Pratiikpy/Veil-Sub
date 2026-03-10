'use client'

import { useCallback } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { DEPLOYED_PROGRAM_ID } from '@/lib/config'

// Wallet record type -- wallet adaptors return untyped objects
export interface WalletRecord {
  spent?: boolean
  plaintext?: string
  recordPlaintext?: string
  recordCiphertext?: string
  ciphertext?: string
  data?: Record<string, unknown>
  microcredits?: number | string
  nonce?: string | number
  _nonce?: string | number
  owner?: string
  [key: string]: unknown
}

// Timeout wrapper: prevents requestRecords from hanging forever.
// Shield Wallet can silently hang on INVALID_PARAMS -- this ensures we always get a result.
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

// Extract microcredits from any record format (mirrors NullPay's getMicrocredits)
export const getMicrocredits = (record: WalletRecord): number => {
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

export function useContractExecute() {
  const {
    address,
    connected,
    executeTransaction,
    requestRecords,
    wallet,
    decrypt,
  } = useWallet()

  // Generic execute helper -- uses new @provablehq executeTransaction API
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
        program: program || DEPLOYED_PROGRAM_ID,
        function: functionName,
        inputs,
        fee,
        privateFee: false,
      })
      return result?.transactionId ?? null
    },
    [address, executeTransaction]
  )

  // Process a single record: try all formats, lazy-decrypt if needed
  const processRecord = async (r: WalletRecord): Promise<{ plaintext: string; microcredits: number } | null> => {
    if (r?.spent) return null

    let val = getMicrocredits(r)

    // Shield Wallet returns `recordPlaintext` (not `plaintext`).
    // Normalize without mutating the original record object.
    let normalized = r
    if (!r?.plaintext && r?.recordPlaintext) {
      normalized = { ...r, plaintext: r.recordPlaintext }
      if (val === 0) val = getMicrocredits(normalized)
    }

    // Try to decrypt the record to get plaintext when we have ciphertext but no plaintext
    const cipher = normalized?.recordCiphertext || normalized?.ciphertext
    if (cipher && !normalized?.plaintext && decrypt) {
      try {
        const decrypted = await decrypt(cipher)
        if (decrypted) {
          normalized = { ...normalized, plaintext: decrypted }
          if (val === 0) val = getMicrocredits(normalized)
        }
      } catch (decryptErr) {
        // Decrypt failed -- record may be from another program
      }
    }

    if (val <= 0) return null

    // Extract plaintext string for transaction input
    let plaintext = ''
    if (typeof normalized === 'string') {
      plaintext = normalized
    } else if (normalized?.plaintext) {
      plaintext = normalized.plaintext
    } else if (normalized?.recordPlaintext) {
      plaintext = normalized.recordPlaintext
    } else {
      // Reconstruct from structured data (NullPay pattern)
      const nonce = normalized?.nonce || normalized?._nonce || normalized?.data?._nonce
      const owner = normalized?.owner || normalized?.data?.owner
      if (nonce && owner) {
        const cleanOwner = String(owner).replace(/\.private$/, '')
        const cleanNonce = String(nonce).replace(/\.public$/, '')
        plaintext = `{ owner: ${cleanOwner}.private, microcredits: ${val}u64.private, _nonce: ${cleanNonce}.public }`
      } else if (r?.ciphertext) {
        plaintext = r.ciphertext
      }
    }

    if (!plaintext) {
      // Record has value but no plaintext -- skip
      return null
    }
    return { plaintext, microcredits: val }
  }

  const extractPlaintext = async (r: WalletRecord): Promise<string> => {
    if (r?.spent) return ''
    if (typeof r === 'string') return r
    if (r?.plaintext) return r.plaintext
    if (r?.recordPlaintext) return r.recordPlaintext
    if ((r?.recordCiphertext || r?.ciphertext) && decrypt) {
      try {
        const decrypted = await decrypt((r.recordCiphertext || r.ciphertext) as string)
        if (decrypted) return decrypted
      } catch { /* skip */ }
    }
    return ''
  }

  return {
    address,
    connected,
    execute,
    requestRecords,
    wallet,
    decrypt,
    processRecord,
    extractPlaintext,
  }
}
