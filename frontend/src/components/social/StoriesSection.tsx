'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Sparkles, Shield, Clock, Eye, Loader2, Radio, Zap } from 'lucide-react'
import { useContractExecute } from '@/hooks/useContractExecute'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { FEATURED_CREATORS, getCreatorHash, CREATOR_HASH_MAP } from '@/lib/config'
import { shortenAddress, generatePassId } from '@/lib/utils'
import { spring, staggerContainer, staggerItem } from '@/lib/motion'
import Skeleton from '@/components/ui/Skeleton'
import AddressAvatar from '@/components/ui/AddressAvatar'
import {
  SOCIAL_PROGRAM_ID,
  SOCIAL_FEES,
  MAX_STORY_DURATION,
  formatBlockCountdown,
  formatDurationBlocks,
  hashToField,
} from './constants'
import { RadialProgress, NotConnectedCard, PrivacyNotice } from './SharedComponents'

interface StoryEntry {
  creatorHash: string
  storyId: string
  expiryBlock: number
  viewCount: number
  creatorAddress?: string
}

export default function StoriesSection() {
  const { address, connected } = useWallet()
  const { execute } = useContractExecute()
  const { blockHeight, loading: blockLoading, refresh: refreshBlockHeight } = useBlockHeight()
  const creatorHash = address ? getCreatorHash(address) : null

  const [stories, setStories] = useState<StoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)

  // Publish form
  const [storyContent, setStoryContent] = useState('')
  const [durationBlocks, setDurationBlocks] = useState('1200') // ~1 hour
  const [encryptionKey, setEncryptionKey] = useState('')

  // Scan for stories from known creators
  useEffect(() => {
    let cancelled = false
    async function scanStories() {
      const found: StoryEntry[] = []
      const entries = Object.entries(CREATOR_HASH_MAP)

      for (const [addr, hash] of entries) {
        try {
          const countRes = await fetch(
            `/api/aleo/program/${SOCIAL_PROGRAM_ID}/mapping/creator_story_count/${hash}`
          )
          if (!countRes.ok) continue
          const countText = await countRes.text()
          const count = parseInt(countText.replace(/"/g, '').replace(/u\d+$/,'').trim(), 10)
          if (!count || count <= 0) continue

          found.push({
            creatorHash: hash,
            storyId: '1',
            expiryBlock: 0,
            viewCount: 0,
            creatorAddress: addr,
          })
        } catch {
          // Continue
        }
      }

      if (!cancelled) {
        setStories(found)
        setLoading(false)
      }
    }
    scanStories()
    return () => { cancelled = true }
  }, [])

  // Auto-generate encryption key on mount
  useEffect(() => {
    setEncryptionKey(generatePassId())
  }, [])

  const handlePublishStory = useCallback(async () => {
    if (!creatorHash || publishing) return

    const duration = parseInt(durationBlocks, 10)
    if (isNaN(duration) || duration <= 0 || duration > MAX_STORY_DURATION) {
      toast.error(`Duration must be between 1 and ${MAX_STORY_DURATION} blocks (~24 hours)`)
      return
    }
    if (!storyContent.trim()) {
      toast.error('Enter story content')
      return
    }

    setPublishing(true)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < SOCIAL_FEES.PUBLISH_STORY) {
            toast.error(`Insufficient public balance. You need ~${(SOCIAL_FEES.PUBLISH_STORY / 1_000_000).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setPublishing(false)
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      const contentHash = await hashToField(storyContent.trim())
      const storyId = generatePassId()
      const encKey = encryptionKey || generatePassId()

      const txId = await execute(
        'publish_story',
        [
          `${creatorHash}`,
          `${storyId}field`,
          `${contentHash}field`,
          `${duration}u32`,
          `${encKey}field`,
        ],
        SOCIAL_FEES.PUBLISH_STORY,
        SOCIAL_PROGRAM_ID,
      )
      if (txId) {
        toast.success('Story published!', {
          description: `Expires in ${formatDurationBlocks(duration)} -- TX: ${txId.slice(0, 16)}...`,
        })
        setStoryContent('')
        setDurationBlocks('1200')
        setEncryptionKey(generatePassId())
      }
    } catch (err) {
      toast.error('Failed to publish story', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setPublishing(false)
    }
  }, [creatorHash, storyContent, durationBlocks, encryptionKey, publishing, execute])

  const handleViewStory = useCallback(async (story: StoryEntry) => {
    if (!address || viewing) return
    const creatorAddr = story.creatorAddress
    if (!creatorAddr) {
      toast.error('Creator address unknown')
      return
    }

    setViewing(story.storyId)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < SOCIAL_FEES.VIEW_STORY) {
            toast.error(`Insufficient public balance. You need ~${(SOCIAL_FEES.VIEW_STORY / 1_000_000).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setViewing(null)
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      const txId = await execute(
        'view_story',
        [creatorAddr, `${story.storyId}field`, '1u8'],
        SOCIAL_FEES.VIEW_STORY,
        SOCIAL_PROGRAM_ID,
      )
      if (txId) {
        toast.success('Story viewed!', {
          description: `You received a StoryAccess token. TX: ${txId.slice(0, 16)}...`,
        })
      }
    } catch (err) {
      toast.error('Failed to view story', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setViewing(null)
    }
  }, [address, viewing, execute])

  if (!connected) {
    return <NotConnectedCard message="Connect your wallet to publish or view ephemeral on-chain stories." />
  }

  const DURATION_PRESETS = [
    { label: '1h', blocks: 1200 },
    { label: '6h', blocks: 7200 },
    { label: '12h', blocks: 14400 },
    { label: '24h', blocks: 28800 },
  ]

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      {/* Block Height */}
      <motion.div variants={staggerItem} className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Zap className="w-3.5 h-3.5 text-violet-400" />
          <span>Current block height:</span>
          {blockLoading ? (
            <Skeleton className="h-4 w-16 inline-block" />
          ) : blockHeight ? (
            <span className="text-white font-mono font-medium">{blockHeight.toLocaleString()}</span>
          ) : (
            <span className="text-red-400">Unavailable</span>
          )}
        </div>
        <button
          onClick={() => refreshBlockHeight()}
          className="text-[11px] text-white/60 hover:text-white/60 transition-colors"
        >
          Refresh
        </button>
      </motion.div>

      {/* Publish Story (creators only) */}
      {creatorHash && (
        <motion.div variants={staggerItem} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-medium text-white">Publish Ephemeral Story</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="story-content" className="block text-xs text-white/50 mb-1.5">
                Story content (hashed on-chain)
              </label>
              <textarea
                id="story-content"
                value={storyContent}
                onChange={e => setStoryContent(e.target.value)}
                placeholder="Share something that disappears..."
                maxLength={500}
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-violet-500/40 transition-colors resize-none"
              />
            </div>

            <div>
              <label htmlFor="story-duration" className="block text-xs text-white/50 mb-1.5">
                Duration (blocks) -- max 28,800 (~24h)
              </label>
              <div className="relative">
                <input
                  id="story-duration"
                  type="number"
                  min="1"
                  max={MAX_STORY_DURATION}
                  value={durationBlocks}
                  onChange={e => setDurationBlocks(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-violet-500/40 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60">
                  {formatDurationBlocks(parseInt(durationBlocks, 10) || 0)}
                </span>
              </div>

              <div className="flex gap-2 mt-2">
                {DURATION_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setDurationBlocks(preset.blocks.toString())}
                    className={`px-3 py-1 rounded-lg text-xs transition-all ${
                      durationBlocks === preset.blocks.toString()
                        ? 'bg-violet-500/20 border border-violet-500/30 text-violet-200'
                        : 'bg-white/[0.03] border border-white/[0.06] text-white/60 hover:text-white/60'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePublishStory}
              disabled={publishing || !storyContent.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-200 font-medium text-sm hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {publishing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Publish Story</>
              )}
            </button>

            <div className="flex items-center gap-2 text-[11px] text-white/60">
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                Story expires cryptographically at block height. After expiry, the finalize function
                rejects all view attempts. This is enforced by the Aleo VM -- no server can bypass it.
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Story Feed */}
      <motion.div variants={staggerItem} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <h3 className="text-sm font-medium text-white mb-4">Stories</h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-10">
            <Sparkles className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/50">No stories found</p>
            <p className="text-xs text-white/60 mt-1">
              {creatorHash
                ? 'Publish the first ephemeral story above!'
                : 'Stories from creators you follow will appear here'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {stories.map(story => {
              const creatorLabel = story.creatorAddress
                ? FEATURED_CREATORS.find(c => c.address === story.creatorAddress)?.label || shortenAddress(story.creatorAddress)
                : 'Unknown'
              const isExpired = story.expiryBlock > 0 && blockHeight ? blockHeight >= story.expiryBlock : false
              const blocksRemaining = story.expiryBlock > 0 && blockHeight
                ? Math.max(0, story.expiryBlock - blockHeight)
                : 0
              const progressUnknown = story.expiryBlock === 0
              const progress = progressUnknown ? 0.8 : (blocksRemaining / MAX_STORY_DURATION)

              return (
                <motion.div
                  key={`${story.creatorHash}-${story.storyId}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={spring.gentle}
                  className={`relative rounded-2xl border p-5 transition-all ${
                    isExpired
                      ? 'bg-white/[0.01] border-white/[0.04] opacity-60'
                      : 'bg-gradient-to-br from-violet-500/[0.04] to-transparent border-violet-500/10 hover:border-violet-500/20'
                  }`}
                >
                  {/* Radial progress */}
                  <div className="absolute top-4 right-4">
                    {progressUnknown ? (
                      <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Radio className="w-4 h-4 text-violet-400 animate-pulse" />
                      </div>
                    ) : (
                      <div className="relative flex items-center justify-center">
                        <RadialProgress progress={progress} />
                        <Clock className="absolute w-3.5 h-3.5 text-white/60" />
                      </div>
                    )}
                  </div>

                  {/* Creator */}
                  <div className="flex items-center gap-2 mb-3">
                    {story.creatorAddress && <AddressAvatar address={story.creatorAddress} size={24} />}
                    <span className="text-xs font-medium text-white/70">{creatorLabel}</span>
                  </div>

                  <p className="text-[11px] text-white/60 font-mono mb-2 truncate">
                    story_id: {story.storyId}
                  </p>

                  {/* Status */}
                  <div className="flex items-center gap-3 mb-3">
                    {isExpired ? (
                      <span className="flex items-center gap-1 text-xs text-red-400/70">
                        <Clock className="w-3 h-3" /> Expired
                      </span>
                    ) : progressUnknown ? (
                      <span className="flex items-center gap-1 text-xs text-violet-400">
                        <Radio className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-violet-300">
                        <Clock className="w-3 h-3" /> {formatBlockCountdown(blocksRemaining)}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-white/60">
                      <Eye className="w-3 h-3" />
                      {story.viewCount} view{story.viewCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* View Button */}
                  {!isExpired && (
                    <button
                      onClick={() => handleViewStory(story)}
                      disabled={!!viewing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/60 hover:text-white hover:border-white/[0.16] disabled:opacity-40 transition-all"
                    >
                      {viewing === story.storyId ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Viewing...</>
                      ) : (
                        <><Eye className="w-3 h-3" /> View Story</>
                      )}
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      <PrivacyNotice text="Ephemeral stories expire at a specific block height, enforced cryptographically in finalize. No server or admin can extend story lifetime -- this is guaranteed by the Aleo VM. View counts are incremented anonymously." />
    </motion.div>
  )
}
