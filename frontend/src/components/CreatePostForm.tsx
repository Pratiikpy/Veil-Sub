'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Send } from 'lucide-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useContentFeed } from '@/hooks/useContentFeed'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { generatePassId } from '@/lib/utils'
import TransactionStatus from './TransactionStatus'
import type { TxStatus } from '@/types'

interface Props {
  creatorAddress: string
  onPostCreated?: () => void
}

export default function CreatePostForm({ creatorAddress, onPostCreated }: Props) {
  const { publishContent } = useVeilSub()
  const { createPost } = useContentFeed()
  const { startPolling, stopPolling } = useTransactionPoller()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [minTier, setMinTier] = useState(1)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.')
      return
    }

    setError(null)
    setTxStatus('signing')

    try {
      const contentId = generatePassId()

      setTxStatus('proving')
      const id = await publishContent(contentId, minTier)

      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')

        // Save to Redis (async, optimistic — don't block on it)
        createPost(creatorAddress, title.trim(), body.trim(), minTier, contentId)

        startPolling(id, (result) => {
          if (result.status === 'confirmed') {
            setTxStatus('confirmed')
            setTitle('')
            setBody('')
            setMinTier(1)
            onPostCreated?.()
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            setError('Transaction failed on-chain.')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Transaction was rejected by wallet.')
      }
    } catch (err) {
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Publish failed')
    }
  }

  const handleReset = () => {
    stopPolling()
    setTxStatus('idle')
    setTxId(null)
    setError(null)
  }

  const tierLabels = ['Supporter', 'Premium', 'VIP']

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-white/[0.02] border border-white/10"
    >
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Create Post</h2>
      </div>

      {txStatus === 'idle' || txStatus === 'failed' ? (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Content</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your exclusive content..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Minimum tier required</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setMinTier(tier)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      minTier === tier
                        ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                        : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {tierLabels[tier - 1]}
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

          <p className="mt-3 text-xs text-slate-500">
            Publishing registers content metadata on-chain (content ID + minimum tier). The post body is stored off-chain and persists across devices.
          </p>

          <button
            onClick={handlePublish}
            disabled={!title.trim() || !body.trim()}
            className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium text-sm hover:from-violet-500 hover:to-purple-500 transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Publish
          </button>
        </>
      ) : (
        <div className="py-2">
          <TransactionStatus status={txStatus} txId={txId} />
          {txStatus === 'confirmed' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-center"
            >
              <p className="text-green-400 font-medium mb-1">Published!</p>
              <p className="text-xs text-slate-400">Content metadata is now on-chain.</p>
              <button
                onClick={handleReset}
                className="mt-3 px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors"
              >
                Create Another
              </button>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  )
}
