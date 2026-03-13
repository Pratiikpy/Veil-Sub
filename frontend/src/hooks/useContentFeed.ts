'use client'

import { useState, useCallback } from 'react'
import { SEED_CONTENT } from '@/lib/config'
import { computeWalletHash } from '@/lib/utils'
import type { AccessPass, ContentPost } from '@/types'

export interface ContentFeedError {
  operation: 'fetch' | 'unlock' | 'create' | 'edit' | 'delete'
  message: string
  code?: number
}

export function useContentFeed() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ContentFeedError | null>(null)

  const getPostsForCreator = useCallback(
    async (creatorAddress: string): Promise<ContentPost[]> => {
      const seedPosts: ContentPost[] = SEED_CONTENT.map((s) => ({
        id: s.id,
        title: s.title,
        body: s.minTier > 0 ? null : s.body,
        preview: s.preview,
        minTier: s.minTier,
        createdAt: s.createdAt,
        contentId: s.contentId,
        gated: s.minTier > 0,
        imageUrl: s.imageUrl && s.minTier === 0 ? s.imageUrl : null,
        hasImage: !!s.imageUrl,
      }))

      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/posts?creator=${encodeURIComponent(creatorAddress)}`
        )
        if (res.ok) {
          const { posts } = await res.json()
          const apiPosts = posts as ContentPost[]
          setLoading(false)
          return apiPosts.length > 0 ? apiPosts : seedPosts
        }
        setError({ operation: 'fetch', message: 'Failed to load posts', code: res.status })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error fetching posts'
        setError({ operation: 'fetch', message: msg })
      }
      setLoading(false)
      return seedPosts
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
    ): Promise<{ body: string; imageUrl?: string } | null> => {
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
          return { body: data.body as string, imageUrl: data.imageUrl as string | undefined }
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
      hashedContentId?: string
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

        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator: creatorAddress,
            title,
            body,
            preview: body.slice(0, 200),
            minTier,
            contentId,
            ...(hashedContentId ? { hashedContentId } : {}),
            ...(imageUrl ? { imageUrl } : {}),
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
      updates: { title?: string; body?: string; preview?: string; minTier?: number },
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

        const res = await fetch('/api/posts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator: creatorAddress,
            postId,
            ...updates,
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
