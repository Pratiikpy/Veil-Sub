import { useState, useCallback } from 'react'
import { dedupeRecords } from '@/lib/recordSync'
import { parseMicrocredits, formatCredits } from '@/lib/utils'

interface BalanceCheckResult {
  records: string[]
  error: string | null
  loading: boolean
  insufficientBalance: boolean
  largestRecord: number
  refetch: () => Promise<BalanceCheckResult['records']>
}

/**
 * Shared hook for balance validation across SubscribeModal, RenewModal, and TipModal.
 *
 * Encapsulates the common pattern:
 * 1. Call getCreditsRecords()
 * 2. Retry after 2s on failure
 * 3. Retry if empty
 * 4. dedupeRecords()
 * 5. Check records.length < 1
 * 6. Check totalAvailable < required
 * 7. Check largestRecord < required
 */
export function useBalanceCheck(
  getCreditsRecords: () => Promise<string[]>,
) {
  const [loading, setLoading] = useState(false)

  /**
   * Fetch, dedupe, and validate credit records against a required amount.
   *
   * Returns { records, error, insufficientBalance, largestRecord } where:
   * - records: deduped credit records sorted by value (largest first from wallet)
   * - error: human-readable error string if validation fails, null otherwise
   * - insufficientBalance: true if the user lacks funds (triggers BalanceConverter UI)
   * - largestRecord: microcredit value of the largest single record
   */
  const checkBalance = useCallback(async (
    requiredAmount: number,
  ): Promise<{
    records: string[]
    error: string | null
    insufficientBalance: boolean
    largestRecord: number
  }> => {
    setLoading(true)

    try {
      // Step 1: Fetch records with retry on failure
      let rawRecords: string[]
      try {
        rawRecords = await getCreditsRecords()
      } catch {
        // Retry once after brief sync delay
        await new Promise(r => setTimeout(r, 2000))
        try {
          rawRecords = await getCreditsRecords()
        } catch (retryErr) {
          setLoading(false)
          const msg = retryErr instanceof Error ? retryErr.message : ''
          const detail = msg.includes('timed out') ? 'Your network may be slow — try again.'
            : msg.includes('Leo Wallet') || msg.includes('record plaintext') ? msg
            : 'Please ensure your wallet is connected and synced.'
          return {
            records: [],
            error: `Could not load wallet records. ${detail}`,
            insufficientBalance: false,
            largestRecord: 0,
          }
        }
      }

      // Step 2: Retry if empty (wallet may still be syncing)
      if (rawRecords.length === 0) {
        await new Promise(r => setTimeout(r, 2000))
        try {
          rawRecords = await getCreditsRecords()
        } catch (retryErr) {
          // Distinguish network failure from genuinely empty wallet
          const isNetworkError = retryErr instanceof Error &&
            (retryErr.message.includes('timed out') || retryErr.message.includes('network') || retryErr.message.includes('fetch'))
          if (isNetworkError) {
            setLoading(false)
            return {
              records: [],
              error: 'Network error fetching wallet records. Please check your connection and try again.',
              insufficientBalance: false,
              largestRecord: 0,
            }
          }
          rawRecords = []
        }
      }

      // Step 3: Deduplicate by nonce
      const records = dedupeRecords(rawRecords)

      // Step 4: Check if any spendable records exist
      if (records.length < 1) {
        setLoading(false)
        return {
          records: [],
          error: 'No spendable balance found. Use the converter below to move public credits to private, or get testnet credits from the faucet.',
          insufficientBalance: true,
          largestRecord: 0,
        }
      }

      // Step 5: Check total available vs required
      const totalAvailable = records.reduce((sum, r) => sum + parseMicrocredits(r), 0)
      // Safe access — records.length >= 1 guaranteed by check above
      const largest = records.length > 0 ? parseMicrocredits(records[0]) : 0

      if (totalAvailable < requiredAmount) {
        setLoading(false)
        return {
          records,
          error: `Insufficient private balance. You have ${formatCredits(totalAvailable)} ALEO but need ${formatCredits(requiredAmount)} ALEO.`,
          insufficientBalance: true,
          largestRecord: largest,
        }
      }

      // Step 6: Check largest single record vs required (Aleo needs single-record payment)
      if (largest < requiredAmount) {
        setLoading(false)
        return {
          records,
          error: `Your largest single payment is ${formatCredits(largest)} ALEO, but this costs ${formatCredits(requiredAmount)} ALEO. Use the converter below to consolidate your balance.`,
          insufficientBalance: true,
          largestRecord: largest,
        }
      }

      // All checks passed
      setLoading(false)
      return {
        records,
        error: null,
        insufficientBalance: false,
        largestRecord: largest,
      }
    } catch (err) {
      setLoading(false)
      const msg = err instanceof Error ? err.message : ''
      const detail = msg.includes('timed out') ? 'Your network may be slow — try again.'
        : msg.includes('Leo Wallet') || msg.includes('record plaintext') ? msg
        : 'Please ensure your wallet is connected and synced.'
      return {
        records: [],
        error: `Could not load wallet records. ${detail}`,
        insufficientBalance: false,
        largestRecord: 0,
      }
    }
  }, [getCreditsRecords])

  return { checkBalance, loading }
}
