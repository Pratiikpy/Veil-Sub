'use client'

import { useState, useCallback } from 'react'
import { computeWalletHash } from '@/lib/utils'
import {
  encryptContent as e2eEncrypt,
  isE2EEncrypted,
  decryptContent as e2eDecrypt,
} from '@/lib/e2eEncryption'
import type { AccessPass, ContentPost, PostStatus } from '@/types'

export interface ContentFeedError {
  operation: 'fetch' | 'unlock' | 'create' | 'edit' | 'delete'
  message: string
  code?: number
}

export function useContentFeed() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ContentFeedError | null>(null)

  const getPostsForCreator = useCallback(
    async (creatorAddress: string, status?: PostStatus): Promise<ContentPost[]> => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ creator: creatorAddress })
        if (status) params.set('status', status)
        const res = await fetch(`/api/posts?${params.toString()}`)
        if (res.ok) {
          const { posts } = await res.json()
          const apiPosts = posts as ContentPost[]
          setLoading(false)
          return apiPosts
        }
        setError({ operation: 'fetch', message: 'Failed to load posts', code: res.status })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error fetching posts'
        setError({ operation: 'fetch', message: msg })
      }
      setLoading(false)
      return []
    },
    []
  )

  const unlockPost = useCallback(
    async (
      postId: string,
      creatorAddress: string,
      walletAddress: string,
      accessPasses: AccessPass[],
      signFn: ((msg: Uint8Array) => Promise<Uint8Array>) | null = null
    ): Promise<{ body: string; imageUrl?: string; videoUrl?: string } | null> => {
      try {
        const timestamp = Date.now()
        let signature: string | undefined

        if (signFn) {
          try {
            const message = `veilsub:unlock:${postId}:${timestamp}`
            const msgBytes = new TextEncoder().encode(message)
            const sigBytes = await signFn(msgBytes)
            let binary = ''
            for (let i = 0; i < sigBytes.length; i++) {
              binary += String.fromCharCode(sigBytes[i])
            }
            signature = btoa(binary)
          } catch {
            // Wallet rejected or unavailable — continue without signature
          }
        }

        // Compute server-salted hash to avoid sending plaintext to server.
        // Uses NEXT_PUBLIC_WALLET_AUTH_SALT so the server can verify without
        // exposing the subscriber's raw address.
        const walletHash = await computeWalletHash(walletAddress)

        const res = await fetch('/api/posts/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId,
            creatorAddress,
            walletHash,
            accessPasses: accessPasses.map((p) => ({
              creator: p.creator,
              tier: p.tier,
              expiresAt: p.expiresAt,
            })),
            timestamp,
            ...(signature ? { signature } : {}),
          }),
        })
        if (res.ok) {
          const data = await res.json()
          let body = data.body as string

          // Client-side E2E decryption: if the body is E2E-encrypted, the server
          // returned it as-is (it cannot decrypt). We derive the tier key from
          // the AccessPass fields and decrypt in-browser.
          if (isE2EEncrypted(body)) {
            // Find the matching pass to determine the tier used for encryption
            const matchingPass = accessPasses.find(
              (p) => p.creator === creatorAddress
            )
            if (matchingPass) {
              // Try all reasonable tiers: subscriber's tier first, then every tier
              // from 1 to 5 (content may have been encrypted at any tier level).
              // This handles tier upgrades, downgrades, and custom tier IDs.
              const tiersToTry = [
                matchingPass.tier,
                ...Array.from({ length: 5 }, (_, i) => i + 1).filter(t => t !== matchingPass.tier),
              ]
              let decrypted = false
              for (const t of tiersToTry) {
                try {
                  body = await e2eDecrypt(body, creatorAddress, t)
                  decrypted = true
                  break
                } catch {
                  // Try next tier
                }
              }
              if (!decrypted) {
                body = '[Unable to decrypt content — tier key mismatch]'
              }
            }
          }

          return { body, imageUrl: data.imageUrl as string | undefined, videoUrl: data.videoUrl as string | undefined }
        }
        setError({ operation: 'unlock', message: 'Access verification failed', code: res.status })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error unlocking content'
        setError({ operation: 'unlock', message: msg })
      }
      return null
    },
    []
  )

  const createPost = useCallback(
    async (
      creatorAddress: string,
      title: string,
      body: string,
      minTier: number,
      contentId: string,
      signFn: ((msg: Uint8Array) => Promise<Uint8Array>) | null = null,
      imageUrl?: string,
      hashedContentId?: string,
      preview?: string,
      videoUrl?: string,
      status?: PostStatus,
      tags?: string[],
      scheduledAt?: string,
      ppvPrice?: number,
      postType?: 'post' | 'note'
    ): Promise<ContentPost | null> => {
      try {
        const timestamp = Date.now()
        const walletHash = await computeWalletHash(creatorAddress)

        let signature: string | undefined
        if (signFn) {
          try {
            const message = `veilsub:post:${creatorAddress}:${timestamp}`
            const msgBytes = new TextEncoder().encode(message)
            const sigBytes = await signFn(msgBytes)
            let binary = ''
            for (let i = 0; i < sigBytes.length; i++) {
              binary += String.fromCharCode(sigBytes[i])
            }
            signature = btoa(binary)
          } catch {
            // Wallet rejected signing
          }
        }

        // E2E encrypt body and preview client-side for tier-gated posts (minTier >= 1).
        // Free-tier posts (minTier 0) are never encrypted since everyone can read them.
        // The server receives only ciphertext it cannot decrypt.
        let encryptedBody = body
        let encryptedPreview = preview || body.slice(0, 200)
        if (minTier >= 1 && status !== 'draft') {
          try {
            encryptedBody = await e2eEncrypt(body, creatorAddress, minTier)
            encryptedPreview = await e2eEncrypt(
              preview || body.slice(0, 200),
              creatorAddress,
              minTier
            )
          } catch {
            // E2E encryption failed — fall back to sending plaintext
            // (server-side encryption will still protect at rest)
          }
        }

        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator: creatorAddress,
            title,
            body: encryptedBody,
            preview: encryptedPreview,
            minTier,
            contentId,
            e2e: minTier >= 1 && status !== 'draft' && isE2EEncrypted(encryptedBody),
            ...(hashedContentId ? { hashedContentId } : {}),
            ...(imageUrl ? { imageUrl } : {}),
            ...(videoUrl ? { videoUrl } : {}),
            ...(status ? { status } : {}),
            ...(tags && tags.length > 0 ? { tags } : {}),
            ...(scheduledAt ? { scheduledAt } : {}),
            ...(ppvPrice ? { ppvPrice } : {}),
            ...(postType === 'note' ? { postType: 'note' } : {}),
            walletHash,
            timestamp,
            signature,
          }),
        })
        if (res.ok) {
          const { post } = await res.json()
          return post as ContentPost
        }
        setError({ operation: 'create', message: 'Failed to publish post', code: res.status })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error creating post'
        setError({ operation: 'create', message: msg })
      }
      return null
    },
    []
  )

  const deletePost = useCallback(
    async (
      creatorAddress: string,
      postId: string,
      signFn: ((msg: Uint8Array) => Promise<Uint8Array>) | null = null
    ): Promise<boolean> => {
      try {
        const timestamp = Date.now()
        const walletHash = await computeWalletHash(creatorAddress)

        let signature: string | undefined
        if (signFn) {
          try {
            const message = `veilsub:delete:${postId}:${timestamp}`
            const msgBytes = new TextEncoder().encode(message)
            const sigBytes = await signFn(msgBytes)
            let binary = ''
            for (let i = 0; i < sigBytes.length; i++) {
              binary += String.fromCharCode(sigBytes[i])
            }
            signature = btoa(binary)
          } catch {
            // Wallet rejected signing
          }
        }

        const res = await fetch('/api/posts', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator: creatorAddress,
            postId,
            walletHash,
            timestamp,
            signature,
          }),
        })
        if (!res.ok) {
          setError({ operation: 'delete', message: 'Failed to delete post', code: res.status })
        }
        return res.ok
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error deleting post'
        setError({ operation: 'delete', message: msg })
        return false
      }
    },
    []
  )

  const editPost = useCallback(
    async (
      creatorAddress: string,
      postId: string,
      updates: {
        title?: string
        body?: string
        preview?: string
        minTier?: number
        status?: PostStatus
        tags?: string[]
        scheduledAt?: string
      },
      signFn: ((msg: Uint8Array) => Promise<Uint8Array>) | null = null
    ): Promise<ContentPost | null> => {
      try {
        const timestamp = Date.now()
        const walletHash = await computeWalletHash(creatorAddress)

        let signature: string | undefined
        if (signFn) {
          try {
            const message = `veilsub:edit:${postId}:${timestamp}`
            const msgBytes = new TextEncoder().encode(message)
            const sigBytes = await signFn(msgBytes)
            let binary = ''
            for (let i = 0; i < sigBytes.length; i++) {
              binary += String.fromCharCode(sigBytes[i])
            }
            signature = btoa(binary)
          } catch {
            // Wallet rejected signing
          }
        }

        // E2E encrypt body and preview for tier-gated edits (non-draft, minTier >= 1)
        const effectiveTier = updates.minTier ?? 1
        const effectiveStatus = updates.status ?? 'published'
        const encUpdates = { ...updates }
        if (effectiveTier >= 1 && effectiveStatus !== 'draft') {
          try {
            if (encUpdates.body) {
              encUpdates.body = await e2eEncrypt(encUpdates.body, creatorAddress, effectiveTier)
            }
            if (encUpdates.preview) {
              encUpdates.preview = await e2eEncrypt(encUpdates.preview, creatorAddress, effectiveTier)
            }
          } catch {
            // Fall back to plaintext — server-side encryption will protect at rest
          }
        }

        const res = await fetch('/api/posts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator: creatorAddress,
            postId,
            ...encUpdates,
            walletHash,
            timestamp,
            signature,
          }),
        })
        if (res.ok) {
          const { post } = await res.json()
          return post as ContentPost
        }
        setError({ operation: 'edit', message: 'Failed to update post', code: res.status })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error editing post'
        setError({ operation: 'edit', message: msg })
      }
      return null
    },
    []
  )

  const clearError = useCallback(() => setError(null), [])

  return { getPostsForCreator, unlockPost, createPost, editPost, deletePost, loading, error, clearError }
}
