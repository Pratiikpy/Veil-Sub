'use client'

import { use, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import PageTransition from '@/components/PageTransition'
import Skeleton from '@/components/ui/Skeleton'
import AddressAvatar from '@/components/ui/AddressAvatar'
import { estimateReadingTime, shortenAddress, computeWalletHash } from '@/lib/utils'
import { FEATURED_CREATORS } from '@/lib/config'
import { getCachedCreator } from '@/lib/creatorCache'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import type { ContentPost } from '@/types'

const ArticleReader = dynamic(() => import('@/components/ArticleReader'), { ssr: false })

function PostSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-[680px] mx-auto px-5 py-12 sm:py-16">
        <div className="mb-8">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-3 mb-6">
          <Skeleton variant="circular" className="w-5 h-5" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-3/4 mb-3" />
        <Skeleton className="h-8 w-1/2 mb-8" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl font-bold text-white/20 mb-4">404</p>
        <p className="text-sm text-white/50 mb-6">Post not found or no longer available.</p>
        <button
          onClick={() => router.push('/feed')}
          className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white hover:bg-white/[0.1] transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to feed
        </button>
      </div>
    </div>
  )
}

function MissingCreatorContext() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <p className="text-4xl font-bold text-white/20 mb-4">?</p>
        <p className="text-sm text-white/50 mb-2">Missing creator context</p>
        <p className="text-xs text-white/60 mb-6">
          This post link is incomplete. Please visit the creator&apos;s page to find this content.
        </p>
        <Link
          href="/explore"
          className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white hover:bg-white/[0.1] transition-colors inline-flex items-center gap-2"
        >
          Browse Creators
        </Link>
      </div>
    </div>
  )
}

function getCreatorLabel(address: string): string {
  const cached = getCachedCreator(address)
  if (cached?.display_name) return cached.display_name
  const featured = FEATURED_CREATORS.find((c) => c.address === address)
  if (featured) return featured.label
  return shortenAddress(address)
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const creator = searchParams.get('creator')

  const { address: publicKey, signMessage, connected } = useWallet()
  const [post, setPost] = useState<(ContentPost & { creatorAddress: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [missingCreator, setMissingCreator] = useState(false)
  const [readerOpen, setReaderOpen] = useState(true)
  const [unlocking, setUnlocking] = useState(false)

  // Auto-unlock gated content if the user has a wallet connected
  useEffect(() => {
    if (!post || post.body || !connected || !publicKey || !post.creatorAddress) return
    if (post.minTier === 0) return // Free content should have body — if null, it's a fetch issue
    let cancelled = false
    setUnlocking(true)

    const tryUnlock = async () => {
      try {
        const walletHash = await computeWalletHash(publicKey)
        const timestamp = Date.now()
        const signFn = signMessage
          ? async (msg: Uint8Array) => { const r = await signMessage(msg); if (!r) throw new Error('cancelled'); return r }
          : null
        const signatureB64 = signFn
          ? btoa(String.fromCharCode(...(await signFn(new TextEncoder().encode(`veilsub-unlock:${post.id}:${timestamp}`)))))
          : undefined

        const res = await fetch('/api/posts/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: post.id,
            creator: post.creatorAddress,
            walletHash,
            walletAddress: publicKey,
            timestamp,
            signature: signatureB64,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.body) {
            setPost(prev => prev ? { ...prev, body: data.body } : prev)
          }
        }
      } catch {
        // Unlock failed silently — user still sees the gated notice
      } finally {
        if (!cancelled) setUnlocking(false)
      }
    }
    tryUnlock()
    return () => { cancelled = true }
  }, [post?.id, post?.body, post?.creatorAddress, post?.minTier, connected, publicKey, signMessage])

  useEffect(() => {
    if (creator) {
      // Direct lookup with known creator
      let cancelled = false

      fetch(`/api/posts?creator=${encodeURIComponent(creator)}`)
        .then((r) => {
          if (!r.ok) throw new Error('Failed to fetch')
          return r.json()
        })
        .then((data) => {
          if (cancelled) return
          const match = (data.posts as ContentPost[] | undefined)?.find(
            (p) => p.id === id || p.contentId === id
          )
          if (match) {
            setPost({ ...match, creatorAddress: creator })
          } else {
            setNotFound(true)
          }
        })
        .catch(() => {
          if (!cancelled) setNotFound(true)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })

      return () => {
        cancelled = true
      }
    }

    // No creator param — scan FEATURED_CREATORS to try to find the post
    let cancelled = false
    const addresses = FEATURED_CREATORS.map((c) => c.address)

    Promise.all(
      addresses.map((addr) =>
        fetch(`/api/posts?creator=${encodeURIComponent(addr)}`)
          .then((r) => (r.ok ? r.json() : { posts: [] }))
          .then((data) => {
            const match = (data.posts as ContentPost[] | undefined)?.find(
              (p) => p.id === id || p.contentId === id
            )
            return match ? { ...match, creatorAddress: addr } : null
          })
          .catch(() => null)
      )
    )
      .then((results) => {
        if (cancelled) return
        const found = results.find((r) => r !== null)
        if (found) {
          setPost(found as ContentPost & { creatorAddress: string })
        } else {
          setMissingCreator(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, creator])

  const readingTime = useMemo(() => {
    if (post?.body) return estimateReadingTime(post.body)
    return '1 min read'
  }, [post?.body])

  const publishedAt = useMemo(() => {
    if (!post?.createdAt) return ''
    return new Date(post.createdAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }, [post?.createdAt])

  if (loading) return <PostSkeleton />
  if (missingCreator) return <MissingCreatorContext />
  if (notFound || !post) return <NotFound />

  // If post body is null (gated), try to unlock or show gated notice
  if (!post.body) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <p className="text-lg font-semibold text-white mb-2">{post.title}</p>
            {unlocking ? (
              <div className="flex items-center justify-center gap-2 text-sm text-white/50 mb-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying your subscription...
              </div>
            ) : (
              <p className="text-sm text-white/50 mb-6">
                {connected
                  ? 'Your subscription could not be verified for this content. You may need a higher tier or your access pass may have expired.'
                  : `This content requires a Tier ${post.minTier}+ subscription to read.`}
              </p>
            )}
            <button
              onClick={() => router.push(`/creator/${post.creatorAddress}`)}
              className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white hover:bg-white/[0.1] transition-colors"
            >
              {connected ? 'View creator page' : 'Subscribe to read'}
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (!readerOpen) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-black">
          <div className="max-w-[680px] mx-auto px-5 py-12 sm:py-16">
            <div className="flex items-center gap-3 mb-6">
              <AddressAvatar address={post.creatorAddress} size={20} />
              <span className="text-sm text-white/60">{getCreatorLabel(post.creatorAddress)}</span>
              <span className="text-xs text-white/60">{publishedAt}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">{post.title}</h1>
            <p className="text-sm text-white/50 mb-8">{readingTime}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setReaderOpen(true)}
                className="px-4 py-2 rounded-lg bg-violet-600 text-sm text-white hover:bg-violet-500 transition-colors"
              >
                Read again
              </button>
              <button
                onClick={() => router.push(`/creator/${post.creatorAddress}`)}
                className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white hover:bg-white/[0.1] transition-colors"
              >
                View creator
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <ArticleReader
        title={post.title}
        body={post.body}
        creator={{
          name: getCreatorLabel(post.creatorAddress),
          address: post.creatorAddress,
        }}
        publishedAt={publishedAt}
        readingTime={readingTime}
        onClose={() => setReaderOpen(false)}
      />
    </PageTransition>
  )
}
