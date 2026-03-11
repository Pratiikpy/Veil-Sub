'use client'

import { useState, useRef, useEffect } from 'react'
import { m } from 'framer-motion'
import { FileText, Send, Image as ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useContentFeed } from '@/hooks/useContentFeed'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import Button from './ui/Button'
import { generatePassId } from '@/lib/utils'
import TransactionStatus from './TransactionStatus'
import type { TxStatus } from '@/types'

interface Props {
  creatorAddress: string
  onPostCreated?: () => void
}

export default function CreatePostForm({ creatorAddress, onPostCreated }: Props) {
  const { signMessage, connected } = useWallet()
  const { publishContent } = useVeilSub()
  const { createPost } = useContentFeed()
  const { startPolling, stopPolling } = useTransactionPoller()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageError, setImageError] = useState(false)
  const [minTier, setMinTier] = useState(1)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  // Detect wallet disconnect during transaction
  useEffect(() => {
    if (!connected && (txStatus === 'signing' || txStatus === 'proving' || txStatus === 'broadcasting')) {
      setTxStatus('failed')
      setError('Wallet disconnected. Please reconnect and try again.')
      stopPolling()
      submittingRef.current = false
    }
  }, [connected, txStatus, stopPolling])

  const handlePublish = async () => {
    if (submittingRef.current) return
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.')
      return
    }

    submittingRef.current = true
    setError(null)
    setTxStatus('signing')
    toast.loading(`Publishing "${title.trim()}"...`, { id: 'post-optimistic', duration: 60000 })

    try {
      const contentId = generatePassId()

      setTxStatus('proving')
      const id = await publishContent(contentId, minTier)

      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')

        // Capture post data before clearing form — save to Redis only after on-chain confirmation
        const postTitle = title.trim()
        const postBody = body.trim()
        const postTier = minTier
        const postImageUrl = imageUrl.trim() || undefined

        startPolling(id, async (result) => {
          if (result.status === 'confirmed') {
            if (result.resolvedTxId) setTxId(result.resolvedTxId)
            setTxStatus('confirmed')
            toast.dismiss('post-optimistic')
            // Save to Redis AFTER on-chain confirmation to avoid orphan posts
            const wrappedSign = signMessage
              ? async (msg: Uint8Array) => {
                  const result = await signMessage(msg)
                  if (!result) throw new Error('Signing cancelled')
                  return result
                }
              : null
            const saved = await createPost(creatorAddress, postTitle, postBody, postTier, contentId, wrappedSign, postImageUrl)
            if (!saved) {
              console.error('[CreatePostForm] Failed to save post body to Redis')
              toast.error('Post confirmed on-chain but failed to save content. Try re-publishing.')
            } else {
              toast.success('Post published on-chain!')
            }
            setTitle('')
            setBody('')
            setPreview('')
            setImageUrl('')
            setImageError(false)
            setMinTier(1)
            onPostCreated?.()
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            toast.dismiss('post-optimistic')
            setError('Transaction failed on-chain.')
            toast.error('Publish failed')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Transaction was rejected by wallet.')
      }
    } catch (err) {
      toast.dismiss('post-optimistic')
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      submittingRef.current = false
    }
  }

  const handleReset = () => {
    stopPolling()
    setTxStatus('idle')
    setTxId(null)
    setError(null)
  }

  const tierLabels: Record<number, string> = { 1: 'Supporter', 2: 'Premium', 3: 'VIP' }

  return (
    <m.div
      id="create-post"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-sm bg-surface-1 border border-border scroll-mt-24"
    >
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-muted" />
        <h2 className="text-lg font-semibold text-white">Create Post</h2>
      </div>

      {txStatus === 'idle' || txStatus === 'failed' ? (
        <>
          <div className="space-y-4">
            <div>
              <label htmlFor="post-title" className="block text-sm text-muted mb-1.5">Title</label>
              <input
                id="post-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-base"
              />
            </div>
            <div>
              <label htmlFor="post-content" className="block text-sm text-muted mb-1.5">Content</label>
              <textarea
                id="post-content"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your exclusive content..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-base resize-none"
              />
            </div>
            <div>
              <label htmlFor="post-preview" className="block text-sm text-muted mb-1.5">
                Preview <span className="text-subtle">(optional — shown to non-subscribers)</span>
              </label>
              <textarea
                id="post-preview"
                value={preview}
                onChange={(e) => setPreview(e.target.value.slice(0, 300))}
                placeholder="A short teaser to attract subscribers..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-base resize-none"
              />
              <p className="text-[10px] text-subtle mt-0.5">{preview.length}/300</p>
            </div>
            <div>
              <label htmlFor="post-image-url" className="block text-sm text-muted mb-1.5">
                Image <span className="text-subtle">(optional — paste a URL)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                  <input
                    id="post-image-url"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => { setImageUrl(e.target.value); setImageError(false) }}
                    placeholder="https://example.com/image.jpg"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm"
                  />
                </div>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => { setImageUrl(''); setImageError(false) }}
                    className="px-2.5 rounded-xl bg-white/[0.05] border border-border text-subtle hover:text-white hover:bg-white/[0.08] transition-colors"
                    aria-label="Clear image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {imageUrl && !imageError && (
                <div className="mt-2 relative rounded-lg overflow-hidden border border-border bg-white/[0.02] max-h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full max-h-48 object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>
              )}
              {imageError && (
                <p className="text-xs text-red-400 mt-1">Failed to load image. Check the URL and try again.</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Minimum tier required</label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Minimum tier selection">
                {[1, 2, 3].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setMinTier(tier)}
                    aria-label={`Set minimum tier to ${tierLabels[tier] || `Tier ${tier}`}`}
                    aria-pressed={minTier === tier}
                    className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
                      minTier === tier
                        ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300 shadow-accent-sm'
                        : 'bg-white/[0.05] border border-border text-muted hover:bg-white/[0.08] hover:border-white/15'
                    }`}
                  >
                    {tierLabels[tier] || `Tier ${tier}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <p className="mt-3 text-xs text-subtle">
            Publishing registers content metadata on-chain (content ID + minimum tier). The post body is stored off-chain and persists across devices.
          </p>

          <Button
            onClick={handlePublish}
            disabled={!title.trim() || !body.trim() || (txStatus !== 'idle' && txStatus !== 'failed')}
            className="mt-4 w-full"
          >
            <Send className="w-4 h-4" />
            Publish
          </Button>
        </>
      ) : (
        <div className="py-2">
          <TransactionStatus status={txStatus} txId={txId} errorMessage={error} />
          {txStatus === 'confirmed' && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-center"
            >
              <p className="text-green-400 font-medium mb-1">Published!</p>
              <p className="text-xs text-muted">Content metadata is now on-chain.</p>
              <button
                onClick={handleReset}
                className="mt-3 px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all"
              >
                Create Another
              </button>
            </m.div>
          )}
        </div>
      )}
    </m.div>
  )
}
