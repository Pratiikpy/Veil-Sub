'use client'

import { useCallback } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { toast } from 'sonner'
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
      const raw = String(record.data.microcredits).replace(/_/g, '').replace('.private', '').replace(/u\d+$/, '')
      const val = parseInt(raw, 10)
      if (Number.isFinite(val) && val > 0) return val
    }
    // Path 2: plaintext or recordPlaintext string (contains "microcredits: Xu64")
    // Shield Wallet uses `recordPlaintext`, standard format uses `plaintext`
    const text = typeof record === 'string' ? record : (record?.plaintext || record?.recordPlaintext)
    if (text) {
      const match = text.match(/microcredits\s*:\s*([\d_]+)u64/)
      if (match?.[1]) {
        const val = parseInt(match[1].replace(/_/g, ''), 10)
        if (Number.isFinite(val)) return val
      }
    }
    // Path 3: if record itself is the data object (nested call)
    if (record?.microcredits) {
      const raw = String(record.microcredits).replace(/_/g, '').replace('.private', '').replace(/u\d+$/, '')
      const val = parseInt(raw, 10)
      if (Number.isFinite(val) && val > 0) return val
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

  // ZK proof timeout: 3 minutes max before we surface an error to the user.
  // Prevents indefinite hangs during proof generation.
  const ZK_PROOF_TIMEOUT_MS = 3 * 60 * 1000

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

      // Network validation: the app targets testnet.
      // The @provablehq wallet adapter does not expose a `network` property,
      // so we cannot programmatically verify the wallet's active network here.
      // If a future adapter version exposes `wallet.network` or similar,
      // add a check like:
      //   if (wallet?.network && wallet.network !== 'testnet') {
      //     toast.error('Wrong network: please switch your wallet to Aleo Testnet.')
      //     return null
      //   }
      // For now, we do a best-effort check via the wallet adapter object.
      const walletAdapter = wallet?.adapter as Record<string, unknown> | undefined
      if (walletAdapter?.network && walletAdapter.network !== 'testnet') {
        toast.error('Wrong network detected. Please switch your wallet to Aleo Testnet.')
        return null
      }

      // Wrap executeTransaction with timeout to prevent indefinite ZK proof hangs
      try {
        const result = await withTimeout(
          executeTransaction({
            program: program || DEPLOYED_PROGRAM_ID,
            function: functionName,
            inputs,
            fee,
            privateFee: process.env.NEXT_PUBLIC_PRIVATE_FEE === 'true' || false,
          }),
          ZK_PROOF_TIMEOUT_MS,
          `ZK proof for ${functionName}`
        )

        // Check if the wallet returned a rejection status.
        // Shield Wallet may return a transactionId even for rejected transactions.
        const txId = result?.transactionId ?? null
        const status = (result as Record<string, unknown>)?.status
        if (status && typeof status === 'string') {
          const statusLower = status.toLowerCase()
          if (statusLower === 'rejected' || statusLower === 'failed' || statusLower === 'error') {
            throw new Error(`Transaction was rejected by the wallet (status: ${status}). The on-chain execution may have failed. Check AleoScan for details.`)
          }
        }
        return txId
      } catch (execErr) {
        // Enhance error message for companion programs
        const progId = program || DEPLOYED_PROGRAM_ID
        const errMsg = execErr instanceof Error ? execErr.message : String(execErr)
        if (progId !== DEPLOYED_PROGRAM_ID && (errMsg.includes('Failed to execute') || errMsg.includes('not found') || errMsg.includes('proving key'))) {
          throw new Error(
            `Wallet could not execute on ${progId}. This feature requires Shield Wallet (leo.app) which supports delegated proving. Leo Wallet and other wallets may not support companion program execution.`
          )
        }
        throw execErr
      }
    },
    [address, executeTransaction, wallet]
  )

  // Process a single record: try all formats, lazy-decrypt if needed
  const processRecord = useCallback(
    async (r: WalletRecord): Promise<{ plaintext: string; microcredits: number } | null> => {
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
    },
    [decrypt]
  )

  const extractPlaintext = useCallback(
    async (r: WalletRecord): Promise<string> => {
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
    },
    [decrypt]
  )

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
