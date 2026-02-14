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
        body: s.body,
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
          setLoading(false)
          return [...(posts as ContentPost[]), ...seedPosts]
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
      accessPasses: AccessPass[]
    ): Promise<string | null> => {
      try {
        const res = await fetch('/api/posts/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId,
            creatorAddress,
            walletAddress,
            accessPasses: accessPasses.map((p) => ({
              creator: p.creator,
              tier: p.tier,
              expiresAt: p.expiresAt,
            })),
            timestamp: Date.now(),
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
      contentId: string
    ): Promise<ContentPost | null> => {
      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator: creatorAddress,
            title,
            body,
            minTier,
            contentId,
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

  return { getPostsForCreator, unlockPost, createPost, loading }
}
