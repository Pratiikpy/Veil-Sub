'use client'

import { use, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import PageTransition from '@/components/PageTransition'
import Skeleton from '@/components/ui/Skeleton'
import { estimateReadingTime, shortenAddress } from '@/lib/utils'
import { FEATURED_CREATORS } from '@/lib/config'
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

function getCreatorLabel(address: string): string {
  const featured = FEATURED_CREATORS.find((c) => c.address === address)
  if (featured) return featured.label
  return shortenAddress(address)
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const creator = searchParams.get('creator')

  const [post, setPost] = useState<(ContentPost & { creatorAddress: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!creator) {
      setNotFound(true)
      setLoading(false)
      return
    }

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
  if (notFound || !post) return <NotFound />

  // If post body is null (gated), show a gated notice instead of the reader
  if (!post.body) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <p className="text-lg font-semibold text-white mb-2">{post.title}</p>
            <p className="text-sm text-white/50 mb-6">
              This content requires a Tier {post.minTier}+ subscription to read.
            </p>
            <button
              onClick={() => router.push(`/creator/${post.creatorAddress}`)}
              className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white hover:bg-white/[0.1] transition-colors"
            >
              View creator page
            </button>
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
        onClose={() => router.back()}
      />
    </PageTransition>
  )
}
