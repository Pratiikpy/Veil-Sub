'use client'

import { useState, useCallback } from 'react'
import { SEED_CONTENT } from '@/lib/config'
import type { AccessPass, ContentPost } from '@/types'

export function useContentFeed() {
  const [loading, setLoading] = useState(false)

  const getPostsForCreator = useCallback(
    async (creatorAddress: string): Promise<ContentPost[]> => {
      const seedPosts: ContentPost[] = SEED_CONTENT.map((s) => ({
        id: s.id,
        title: s.title,
        body: s.minTier > 0 ? null : s.body,
        minTier: s.minTier,
        createdAt: s.createdAt,
        contentId: s.contentId,
        gated: s.minTier > 0,
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
      } catch {
        // Fallback to seed content only
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
    ): Promise<string | null> => {
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

        // Hash wallet address client-side to avoid sending plaintext to server.
        // This preserves rate-limiting capability without leaking subscriber identity.
        const addrBytes = new TextEncoder().encode(walletAddress)
        const hashBuf = await crypto.subtle.digest('SHA-256', addrBytes)
        const walletHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

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
          const { body } = await res.json()
          return body as string
        }
      } catch {
        // Unlock failed
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
      signFn: ((msg: Uint8Array) => Promise<Uint8Array>) | null = null
    ): Promise<ContentPost | null> => {
      try {
        const timestamp = Date.now()
        const addrBytes = new TextEncoder().encode(creatorAddress)
        const hashBuf = await crypto.subtle.digest('SHA-256', addrBytes)
        const walletHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

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
            minTier,
            contentId,
            walletHash,
            timestamp,
            signature,
          }),
        })
        if (res.ok) {
          const { post } = await res.json()
          return post as ContentPost
        }
      } catch {
        // Fail silently — caller handles null
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
        const addrBytes = new TextEncoder().encode(creatorAddress)
        const hashBuf = await crypto.subtle.digest('SHA-256', addrBytes)
        const walletHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

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
      } catch {
        return false
      }
    },
    []
  )

  return { getPostsForCreator, unlockPost, createPost, deletePost, loading }
}
