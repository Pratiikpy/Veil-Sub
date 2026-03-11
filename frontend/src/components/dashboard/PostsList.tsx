'use client'

import { useState, useEffect, useCallback } from 'react'
import { m } from 'framer-motion'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { FileText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useContentFeed } from '@/hooks/useContentFeed'

interface PostsListProps {
  address: string
}

export default function PostsList({ address }: PostsListProps) {
  const { signMessage } = useWallet()
  const { getPostsForCreator, deletePost } = useContentFeed()
  const [posts, setPosts] = useState<{ id: string; title: string; minTier: number; createdAt?: string; contentId?: string }[]>([])
  const [postsLoaded, setPostsLoaded] = useState(false)

  const tierLabels: Record<number, { name: string; color: string }> = {
    1: { name: 'Supporter', color: 'text-green-300 bg-green-500/10 border-green-500/20' },
    2: { name: 'Premium', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
    3: { name: 'VIP', color: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
  }

  const fetchPosts = useCallback(async () => {
    try {
      const result = await getPostsForCreator(address)
      setPosts(result.filter((p) => p.contentId !== 'seed'))
    } catch {
      // Content feed has its own fallback
    }
    setPostsLoaded(true)
  }, [address, getPostsForCreator])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Delete this post? This action cannot be undone.')) return
    const wrappedSign = signMessage
      ? async (msg: Uint8Array) => {
          const result = await signMessage(msg)
          if (!result) throw new Error('Signing cancelled')
          return result
        }
      : null
    const ok = await deletePost(address, postId, wrappedSign)
    if (ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      toast.success('Post deleted')
    } else {
      toast.error('Failed to delete post')
    }
  }

  if (!postsLoaded) return null

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24 }}
      className="p-6 rounded-xl bg-surface-1 border border-border"
    >
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-violet-400" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Your Posts</h2>
        <span className="text-xs text-white/60 ml-auto">{posts.length} posts</span>
      </div>
      {posts.length === 0 ? (
        <p className="text-sm text-white/60">No gated content yet. Create your first post above to start earning from subscribers.</p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const tier = tierLabels[post.minTier] || tierLabels[1]
            return (
              <div
                key={post.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${tier.color}`}>
                      {tier.name}
                    </span>
                    {post.createdAt && (
                      <span className="text-xs text-white/60">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    )}
                    {post.contentId && post.contentId !== 'seed' && (
                      <span className="text-xs text-green-500">on-chain</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-400 active:scale-[0.9] transition-all duration-300"
                  aria-label="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </m.div>
  )
}
