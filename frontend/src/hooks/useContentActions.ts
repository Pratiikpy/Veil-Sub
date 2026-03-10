'use client'

import { useCallback } from 'react'
import { useContractExecute } from './useContractExecute'
import { FEES } from '@/lib/config'

export function useContentActions() {
  const { execute } = useContractExecute()

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

  // v12: Encrypted content with commitment
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

  // v9: Content Lifecycle -- update
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

  // v9: Content Lifecycle -- delete
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

  // v12: Dispute content (subscriber reports issue)
  const disputeContent = useCallback(
    async (accessPassPlaintext: string, contentId: string) => {
      return execute(
        'dispute_content',
        [accessPassPlaintext, `${contentId}field`],
        FEES.DISPUTE_CONTENT
      )
    },
    [execute]
  )

  // v12: Revoke an access pass
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

  return {
    publishContent,
    publishEncryptedContent,
    updateContent,
    deleteContent,
    disputeContent,
    revokeAccess,
  }
}
