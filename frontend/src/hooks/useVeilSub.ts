'use client'

import { useCallback } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { PROGRAM_ID, FEES, ESCROW_WINDOW_BLOCKS } from '@/lib/config'

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

  // v8: Single-record subscribe — returns AccessPass + CreatorReceipt
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

  // v8: Single-record tip — returns CreatorReceipt
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

  // v8: Single-record renew — returns AccessPass + CreatorReceipt
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

  // v8: publish_content now requires a content_hash for on-chain integrity verification
  const publishContent = useCallback(
    async (contentId: string, minTier: number, contentHash?: string) => {
      // If no hash provided, compute a simple hash from the content ID
      const hash = contentHash || contentId
      return execute(
        'publish_content',
        [
          `${contentId}field`,
          `${minTier}u8`,
          `${hash}field`,
        ],
        FEES.PUBLISH
      )
    },
    [execute]
  )

  // v8: create_audit_token — selective disclosure for third-party verification.
  // Creates an AuditToken for a verifier that proves subscription tier + validity
  // WITHOUT revealing the subscriber's address. Zero finalize footprint.
  const createAuditToken = useCallback(
    async (accessPassPlaintext: string, verifierAddress: string) => {
      return execute(
        'create_audit_token',
        [accessPassPlaintext, verifierAddress],
        FEES.AUDIT_TOKEN
      )
    },
    [execute]
  )

  // =========================================
  // v9: Dynamic Tier Management
  // =========================================

  const createCustomTier = useCallback(
    async (tierId: number, price: number, nameHash: string) => {
      return execute(
        'create_custom_tier',
        [`${tierId}u8`, `${price}u64`, `${nameHash}field`],
        FEES.CREATE_TIER
      )
    },
    [execute]
  )

  const updateTierPrice = useCallback(
    async (tierRecordPlaintext: string, newPrice: number) => {
      return execute(
        'update_tier_price',
        [tierRecordPlaintext, `${newPrice}u64`],
        FEES.UPDATE_TIER
      )
    },
    [execute]
  )

  const deprecateTier = useCallback(
    async (tierRecordPlaintext: string) => {
      return execute(
        'deprecate_tier',
        [tierRecordPlaintext],
        FEES.DEPRECATE_TIER
      )
    },
    [execute]
  )

  // v9: Content Lifecycle
  const updateContent = useCallback(
    async (contentId: string, newMinTier: number, newContentHash: string) => {
      return execute(
        'update_content',
        [`${contentId}field`, `${newMinTier}u8`, `${newContentHash}field`],
        FEES.UPDATE_CONTENT
      )
    },
    [execute]
  )

  const deleteContent = useCallback(
    async (contentId: string, reasonHash: string) => {
      return execute(
        'delete_content',
        [`${contentId}field`, `${reasonHash}field`],
        FEES.DELETE_CONTENT
      )
    },
    [execute]
  )

  // =========================================
  // v10: Gifting + Escrow + Fee Withdrawal
  // =========================================

  const giftSubscription = useCallback(
    async (
      paymentRecord: string,
      creatorAddress: string,
      recipientAddress: string,
      tier: number,
      amount: number,
      giftId: string,
      expiresAt: number
    ) => {
      return execute(
        'gift_subscription',
        [
          paymentRecord,
          creatorAddress,
          recipientAddress,
          `${tier}u8`,
          `${amount}u64`,
          `${giftId}field`,
          `${expiresAt}u32`,
        ],
        FEES.GIFT_SUBSCRIPTION
      )
    },
    [execute]
  )

  const redeemGift = useCallback(
    async (giftTokenPlaintext: string) => {
      return execute(
        'redeem_gift',
        [giftTokenPlaintext],
        FEES.REDEEM_GIFT
      )
    },
    [execute]
  )

  const subscribeWithEscrow = useCallback(
    async (
      paymentRecord: string,
      creatorAddress: string,
      tier: number,
      amount: number,
      passId: string,
      expiresAt: number
    ) => {
      return execute(
        'subscribe_with_escrow',
        [
          paymentRecord,
          creatorAddress,
          `${tier}u8`,
          `${amount}u64`,
          `${passId}field`,
          `${expiresAt}u32`,
        ],
        FEES.SUBSCRIBE_ESCROW
      )
    },
    [execute]
  )

  const claimRefund = useCallback(
    async (escrowPlaintext: string, accessPassPlaintext: string) => {
      return execute(
        'claim_refund',
        [escrowPlaintext, accessPassPlaintext],
        FEES.CLAIM_REFUND
      )
    },
    [execute]
  )

  const withdrawPlatformFees = useCallback(
    async (amount: number) => {
      return execute(
        'withdraw_platform_fees',
        [`${amount}u64`],
        FEES.WITHDRAW_PLATFORM
      )
    },
    [execute]
  )

  const withdrawCreatorRevenue = useCallback(
    async (amount: number) => {
      return execute(
        'withdraw_creator_revenue',
        [`${amount}u64`],
        FEES.WITHDRAW_CREATOR
      )
    },
    [execute]
  )

  // =========================================
  // v11: Blind Renewal (Novel Privacy)
  // =========================================

  const subscribeBlind = useCallback(
    async (
      paymentRecord: string,
      creatorAddress: string,
      nonce: string,
      tier: number,
      amount: number,
      passId: string,
      expiresAt: number
    ) => {
      return execute(
        'subscribe_blind',
        [
          paymentRecord,
          creatorAddress,
          `${nonce}field`,
          `${tier}u8`,
          `${amount}u64`,
          `${passId}field`,
          `${expiresAt}u32`,
        ],
        FEES.SUBSCRIBE_BLIND
      )
    },
    [execute]
  )

  const renewBlind = useCallback(
    async (
      accessPassPlaintext: string,
      paymentRecord: string,
      nonce: string,
      newTier: number,
      amount: number,
      newPassId: string,
      newExpiresAt: number
    ) => {
      return execute(
        'renew_blind',
        [
          accessPassPlaintext,
          paymentRecord,
          `${nonce}field`,
          `${newTier}u8`,
          `${amount}u64`,
          `${newPassId}field`,
          `${newExpiresAt}u32`,
        ],
        FEES.RENEW_BLIND
      )
    },
    [execute]
  )

  const verifyTierAccess = useCallback(
    async (accessPassPlaintext: string, creatorAddress: string, requiredTier: number) => {
      return execute(
        'verify_tier_access',
        [accessPassPlaintext, creatorAddress, `${requiredTier}u8`],
        FEES.VERIFY_TIER
      )
    },
    [execute]
  )

  // =========================================
  // v12: Encrypted Content + Disputes
  // =========================================

  const publishEncryptedContent = useCallback(
    async (contentId: string, minTier: number, contentHash: string, encryptionCommitment: string) => {
      return execute(
        'publish_encrypted_content',
        [
          `${contentId}field`,
          `${minTier}u8`,
          `${contentHash}field`,
          `${encryptionCommitment}field`,
        ],
        FEES.PUBLISH_ENCRYPTED
      )
    },
    [execute]
  )

  const revokeAccess = useCallback(
    async (passId: string) => {
      return execute(
        'revoke_access',
        [`${passId}field`],
        FEES.REVOKE_ACCESS
      )
    },
    [execute]
  )

  const disputeContent = useCallback(
    async (contentId: string) => {
      return execute(
        'dispute_content',
        [`${contentId}field`],
        FEES.DISPUTE_CONTENT
      )
    },
    [execute]
  )

  // v17: Referral subscription
  const subscribeReferral = useCallback(
    async (
      paymentToReferrer: string,
      paymentToCreator: string,
      creatorAddress: string,
      referrerAddress: string,
      tier: number,
      referralAmount: number,
      creatorAmount: number,
      passId: string,
      expiresAt: number
    ) => {
      return execute(
        'subscribe_referral',
        [
          paymentToReferrer,
          paymentToCreator,
          creatorAddress,
          referrerAddress,
          `${tier}u8`,
          `${referralAmount}u64`,
          `${creatorAmount}u64`,
          `${passId}field`,
          `${expiresAt}u32`,
        ],
        FEES.SUBSCRIBE_REFERRAL
      )
    },
    [execute]
  )

  // v15: Subscription transfer
  const transferPass = useCallback(
    async (accessPassPlaintext: string, recipientAddress: string) => {
      return execute(
        'transfer_pass',
        [accessPassPlaintext, recipientAddress],
        FEES.TRANSFER_PASS
      )
    },
    [execute]
  )

  // v17: Subscribe with private Pedersen count (no public subscriber_count increment)
  const subscribePrivateCount = useCallback(
    async (
      paymentRecord: string,
      creatorAddress: string,
      tier: number,
      amount: number,
      passId: string,
      expiresAt: number,
      blinding: string,
    ) => {
      return execute('subscribe_private_count', [
        paymentRecord,
        creatorAddress,
        `${tier}u8`,
        `${amount}u64`,
        `${passId}field`,
        `${expiresAt}u32`,
        `${blinding}field`,
      ], FEES.SUBSCRIBE_PRIVATE_COUNT)
    },
    [execute]
  )

  // v17: Zero-footprint proof of subscriber count (Pedersen decommitment)
  const proveSubCount = useCallback(
    async (claimedCount: number, sumBlinding: string, expectedCommit: string) => {
      return execute('prove_sub_count', [
        `${claimedCount}u64`,
        `${sumBlinding}scalar`,
        expectedCommit,
      ], FEES.PROVE_SUB_COUNT)
    },
    [execute]
  )

  // v17: Zero-footprint range proof for revenue
  const proveRevenueRange = useCallback(
    async (actualRevenue: number, salt: string, commitment: string, lowerBound: number, upperBound: number) => {
      return execute('prove_revenue_range', [
        `${actualRevenue}u64`,
        `${salt}field`,
        commitment,
        `${lowerBound}u64`,
        `${upperBound}u64`,
      ], FEES.PROVE_REVENUE_RANGE)
    },
    [execute]
  )

  // =========================================
  // Record Fetchers (v10+)
  // =========================================

  // Fetch SubscriptionTier records (for creator tier management)
  const getTierRecords = useCallback(async (): Promise<string[]> => {
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
        if (text && text.includes('tier_id') && text.includes('name_hash') && text.includes('price')) results.push(text)
      }
      return results
    } catch { return [] }
  }, [connected, requestRecords, decrypt])

  // Fetch GiftToken records (for gift recipients)
  const getGiftTokens = useCallback(async (): Promise<string[]> => {
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
        if (text && text.includes('gifter_hash')) results.push(text)
      }
      return results
    } catch { return [] }
  }, [connected, requestRecords, decrypt])

  // Fetch RefundEscrow records (for refund claims)
  const getEscrowRecords = useCallback(async (): Promise<string[]> => {
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
        if (text && text.includes('escrow_expiry')) results.push(text)
      }
      return results
    } catch { return [] }
  }, [connected, requestRecords, decrypt])

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

  // v8: Fetch CreatorReceipt records (for creator dashboard)
  const getCreatorReceipts = useCallback(async (): Promise<string[]> => {
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
        if (text && text.includes('subscriber_hash')) results.push(text)
      }

      return results
    } catch (err) {
      return []
    }
  }, [connected, requestRecords, decrypt])

  // v8: Fetch AuditToken records (for verifiers)
  const getAuditTokens = useCallback(async (): Promise<string[]> => {
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
        // AuditTokens have subscriber_hash + expires_at but NO pass_id or amount
        if (text && text.includes('subscriber_hash') && !text.includes('amount')) results.push(text)
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
    // Core (v1-v8)
    registerCreator,
    subscribe,
    tip,
    verifyAccess,
    renew,
    publishContent,
    createAuditToken,
    // v9: Dynamic tiers + content lifecycle
    createCustomTier,
    updateTierPrice,
    deprecateTier,
    updateContent,
    deleteContent,
    // v10: Gifting + escrow + fee withdrawal
    giftSubscription,
    redeemGift,
    subscribeWithEscrow,
    claimRefund,
    withdrawPlatformFees,
    withdrawCreatorRevenue,
    // v11: Blind renewal (novel privacy)
    subscribeBlind,
    renewBlind,
    verifyTierAccess,
    // v12: Encrypted content + disputes
    publishEncryptedContent,
    revokeAccess,
    disputeContent,
    // v15: Transfer
    transferPass,
    // v17: Referrals
    subscribeReferral,
    // v17: Pedersen proofs
    subscribePrivateCount,
    proveSubCount,
    proveRevenueRange,
    // Utility
    splitCredits,
    convertPublicToPrivate,
    // Record fetchers
    getTokenRecords,
    getCreditsRecords,
    getAccessPasses,
    getCreatorReceipts,
    getAuditTokens,
    getTierRecords,
    getGiftTokens,
    getEscrowRecords,
    pollTxStatus,
  }
}
