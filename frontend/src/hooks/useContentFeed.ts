'use client'

import { useState, useCallback } from 'react'
import { SEED_CONTENT } from '@/lib/config'
import { computeWalletHash } from '@/lib/utils'
import type { AccessPass, ContentPost } from '@/types'

export function useContentFeed() {
  const [loading, setLoading] = useState(false)

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
      } catch (err) {
        console.error('[useContentFeed] Failed to fetch posts, falling back to seed content:', err)
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
      } catch (err) {
        console.error('[useContentFeed] Unlock failed:', err)
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
      imageUrl?: string
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
      } catch (err) {
        console.error('[useContentFeed] Create post failed:', err)
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
        return res.ok
      } catch (err) {
        console.error('[useContentFeed] Delete post failed:', err)
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
      } catch (err) {
        console.error('[useContentFeed] Edit post failed:', err)
      }
      return null
    },
    []
  )

  return { getPostsForCreator, unlockPost, createPost, editPost, deletePost, loading }
}
