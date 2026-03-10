'use client'

import { useCallback } from 'react'
import { useContractExecute } from './useContractExecute'
import { FEES } from '@/lib/config'

export function useTipping() {
  const { execute } = useContractExecute()

  // v8: Single-record tip -- returns CreatorReceipt
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

  // v14: Commit to a tip amount (phase 1 of commit-reveal tipping)
  const commitTip = useCallback(
    async (creatorAddress: string, amount: number, salt: string) => {
      return execute('commit_tip', [
        creatorAddress,
        `${amount}u64`,
        `${salt}field`,
      ], FEES.COMMIT_TIP)
    },
    [execute]
  )

  // v14: Reveal committed tip and execute transfer (phase 2)
  const revealTip = useCallback(
    async (paymentRecord: string, creatorAddress: string, amount: number, salt: string) => {
      return execute('reveal_tip', [
        paymentRecord,
        creatorAddress,
        `${amount}u64`,
        `${salt}field`,
      ], FEES.REVEAL_TIP)
    },
    [execute]
  )

  // v27: create_audit_token -- scoped selective disclosure for third-party verification.
  // Creates an AuditToken with scope_mask controlling which fields the verifier can see.
  // Bit 0 (1): creator, Bit 1 (2): tier, Bit 2 (4): expiry, Bit 3 (8): subscriber_hash
  // Zero finalize footprint — no public trace of who created the token.
  const createAuditToken = useCallback(
    async (accessPassPlaintext: string, verifierAddress: string, scopeMask: number = 15) => {
      return execute(
        'create_audit_token',
        [accessPassPlaintext, verifierAddress, `${scopeMask}u64`],
        FEES.AUDIT_TOKEN
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

  // v25: Privacy-preserving reputation proof — proves creator has >= threshold subscribers
  const proveSubscriberThreshold = useCallback(
    async (threshold: number) => {
      return execute(
        'prove_subscriber_threshold',
        [`${threshold}u64`],
        FEES.PROVE_THRESHOLD
      )
    },
    [execute]
  )

  return {
    tip,
    commitTip,
    revealTip,
    createAuditToken,
    verifyAccess,
    verifyTierAccess,
    proveSubscriberThreshold,
  }
}
