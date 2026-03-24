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

  // v29: USDCx stablecoin tip
  // NOTE: Requires USDCx Token records and MerkleProof compliance arrays from test_usdcx_stablecoin.aleo.
  // TODO: Full integration pending Shield Wallet support for stablecoin record selection.
  const tipUsdcx = useCallback(
    async (
      tokenRecord: string,
      creatorAddress: string,
      amountU128: string,
      merkleProofs: string
    ) => {
      return execute(
        'tip_usdcx',
        [
          tokenRecord,
          creatorAddress,
          `${amountU128}u128`,
          merkleProofs,
        ],
        FEES.TIP_USDCX
      )
    },
    [execute]
  )

  // v29: USAD stablecoin tip
  // NOTE: Requires USAD Token records and MerkleProof compliance arrays from test_usad_stablecoin.aleo.
  // TODO: Full integration pending Shield Wallet support for stablecoin record selection.
  const tipUsad = useCallback(
    async (
      tokenRecord: string,
      creatorAddress: string,
      amountU128: string,
      merkleProofs: string
    ) => {
      return execute(
        'tip_usad',
        [
          tokenRecord,
          creatorAddress,
          `${amountU128}u128`,
          merkleProofs,
        ],
        FEES.TIP_USAD
      )
    },
    [execute]
  )

  return {
    tip,
    commitTip,
    revealTip,
    tipUsdcx,
    tipUsad,
    createAuditToken,
    verifyAccess,
    verifyTierAccess,
    proveSubscriberThreshold,
  }
}
