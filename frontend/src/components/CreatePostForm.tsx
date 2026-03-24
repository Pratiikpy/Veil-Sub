'use client'

import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import { m } from 'framer-motion'
import { FileText, Send, Image as ImageIcon, X, Video, Upload, Loader2, Save, Clock, Tag, Plus, ExternalLink, DollarSign, StickyNote } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useContentFeed } from '@/hooks/useContentFeed'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import Button from './ui/Button'
import { generatePassId, ALEO_USD_ESTIMATE, creditsToMicrocredits } from '@/lib/utils'
import { poseidon2HashField } from '@/lib/poseidon'
import { saveContentHash, SUGGESTED_TAGS, TAG_COLORS, API_LIMITS, DRAFT_AUTOSAVE_INTERVAL_MS } from '@/lib/config'
import TransactionStatus from './TransactionStatus'
import type { TxStatus, PostStatus, PostType } from '@/types'
import { useCreatorTiers } from '@/hooks/useCreatorTiers'

const RichTextEditor = lazy(() => import('./RichTextEditor'))

/** Best-effort subscriber email notification after publishing. Never blocks or errors. */
function triggerSubscriberNotification(
  creatorAddress: string,
  postTitle: string,
  postBody: string,
  postId: string
): void {
  // Strip HTML tags for preview text
  const previewText = postBody.replace(/<[^>]*>/g, '').slice(0, 200)
  fetch('/api/email/notify-subscribers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creatorAddress,
      postTitle,
      postPreview: previewText,
      postId,
    }),
  }).catch(() => {
    // Best-effort — never block the publish flow
  })
}

interface Props {
  creatorAddress: string
  onPostCreated?: () => void
  /** Pre-fill form with an existing draft/post for editing */
  editingPost?: {
    id: string
    title: string
    body: string | null
    preview?: string
    imageUrl?: string | null
    videoUrl?: string | null
    minTier: number
    tags?: string[]
    status?: PostStatus
    scheduledAt?: string
  } | null
  onEditComplete?: () => void
}

// localStorage key for draft auto-save
function getDraftKey(address: string): string {
  return `veilsub:draft:${address}`
}

/** Validates video URL - only allows YouTube, Vimeo, or direct video files */
function isValidVideoUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) return { valid: true } // empty is valid (optional field)
  try {
    const parsed = new URL(url)
    // Only allow HTTPS (or HTTP for localhost in dev)
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && parsed.hostname === 'localhost')) {
      return { valid: false, error: 'Video URL must use HTTPS' }
    }
    // YouTube
    if (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com' || parsed.hostname === 'youtu.be') {
      return { valid: true }
    }
    // Vimeo
    if (parsed.hostname === 'www.vimeo.com' || parsed.hostname === 'vimeo.com' || parsed.hostname === 'player.vimeo.com') {
      return { valid: true }
    }
    // Direct video files
    const ext = parsed.pathname.split('.').pop()?.toLowerCase()
    if (ext && ['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
      return { valid: true }
    }
    return { valid: false, error: 'Only YouTube, Vimeo, or direct video files (.mp4, .webm) are supported' }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/** Validates image URL - must be HTTPS and valid format */
function isValidImageUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) return { valid: true } // empty is valid (optional field)
  try {
    const parsed = new URL(url)
    // Only allow HTTPS (or HTTP for localhost in dev)
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && parsed.hostname === 'localhost')) {
      return { valid: false, error: 'Image URL must use HTTPS' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

interface DraftData {
  title: string
  body: string
  preview: string
  imageUrl: string
  videoUrl: string
  minTier: number
  tags: string[]
  savedAt: number
}

export default function CreatePostForm({ creatorAddress, onPostCreated, editingPost, onEditComplete }: Props) {
  const { signMessage, connected } = useWallet()
  const { publishContent } = useVeilSub()
  const { createPost, editPost, error: postError, clearError } = useContentFeed()
  const { startPolling, stopPolling } = useTransactionPoller()

  const [title, setTitle] = useState(editingPost?.title ?? '')
  const [body, setBody] = useState(editingPost?.body ?? '')
  const [preview, setPreview] = useState(editingPost?.preview ?? '')
  const [imageUrl, setImageUrl] = useState(editingPost?.imageUrl ?? '')
  const [imageError, setImageError] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [videoUrl, setVideoUrl] = useState(editingPost?.videoUrl ?? '')
  const [videoUrlError, setVideoUrlError] = useState<string | null>(null)
  const [imageUrlError, setImageUrlError] = useState<string | null>(null)

  const [minTier, setMinTier] = useState(editingPost?.minTier ?? 0)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { tiers: onChainTiers, loading: tiersLoading, error: tiersError } = useCreatorTiers(creatorAddress)

  // Tags state
  const [tags, setTags] = useState<string[]>(editingPost?.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  // Post type: 'post' (full editor) vs 'note' (short-form, 280 char, always free)
  const [postMode, setPostMode] = useState<PostType>('post')
  const [noteText, setNoteText] = useState('')
  const [noteImageUrl, setNoteImageUrl] = useState('')

  // Pay-Per-View state
  const [ppvEnabled, setPpvEnabled] = useState(false)
  const [ppvPrice, setPpvPrice] = useState('')  // ALEO credits as string input
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  // Scheduling state
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  // Draft restoration
  const [hasDraft, setHasDraft] = useState(false)
  const [draftDismissed, setDraftDismissed] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Track which button operation is in progress for spinner display
  const [savingDraft, setSavingDraft] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  // Check for existing draft on mount
  useEffect(() => {
    if (editingPost) return
    try {
      const saved = localStorage.getItem(getDraftKey(creatorAddress))
      if (saved) {
        const draft: DraftData = JSON.parse(saved)
        if (draft.title || draft.body) {
          const sevenDays = 7 * 24 * 60 * 60 * 1000
          if (Date.now() - draft.savedAt < sevenDays) {
            setHasDraft(true)
          } else {
            localStorage.removeItem(getDraftKey(creatorAddress))
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [creatorAddress, editingPost])

  // Auto-save draft every 30 seconds while editing
  useEffect(() => {
    if (editingPost) return
    autoSaveTimerRef.current = setInterval(() => {
      if (title.trim() || body.replace(/<[^>]*>/g, '').trim()) {
        const draft: DraftData = {
          title, body, preview, imageUrl, videoUrl, minTier, tags,
          savedAt: Date.now(),
        }
        try {
          localStorage.setItem(getDraftKey(creatorAddress), JSON.stringify(draft))
        } catch { /* localStorage full or unavailable */ }
      }
    }, DRAFT_AUTOSAVE_INTERVAL_MS)
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    }
  }, [creatorAddress, title, body, preview, imageUrl, videoUrl, minTier, tags, editingPost])

  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(getDraftKey(creatorAddress))
      if (saved) {
        const draft: DraftData = JSON.parse(saved)
        setTitle(draft.title || '')
        setBody(draft.body || '')
        setPreview(draft.preview || '')
        setImageUrl(draft.imageUrl || '')
        setVideoUrl(draft.videoUrl || '')
        setMinTier(typeof draft.minTier === 'number' ? draft.minTier : 0)
        setTags(draft.tags || [])
        toast.success('Draft restored')
      }
    } catch {
      toast.error('Draft couldn\u2019t be restored. It may have been corrupted.')
    }
    setHasDraft(false)
    setDraftDismissed(false)
  }, [creatorAddress])

  const discardDraft = useCallback(() => {
    localStorage.removeItem(getDraftKey(creatorAddress))
    setHasDraft(false)
    setDraftDismissed(true)
    toast.success('Draft discarded')
  }, [creatorAddress])

  // Image upload handlers (preserved from existing code)
  const uploadFile = useCallback(async (file: File) => {
    const maxSize = 5 * 1024 * 1024
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported image type. Use JPG, PNG, GIF, or WebP.')
      return
    }
    if (file.size > maxSize) {
      toast.error('Image too large (max 5MB).')
      return
    }
    setImageUploading(true)
    setImageError(false)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Image couldn\u2019t be uploaded')
        return
      }
      setImageUrl(data.url)
    } catch {
      toast.error('Image couldn\u2019t be uploaded. Check your connection and try again.')
    } finally {
      setImageUploading(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      uploadFile(file)
    } else {
      toast.error('Please drop an image file (JPG, PNG, GIF, WebP).')
    }
  }, [uploadFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    if (e.target) e.target.value = ''
  }, [uploadFile])

  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  // Detect wallet disconnect during transaction
  useEffect(() => {
    if (!connected && (txStatus === 'signing' || txStatus === 'proving' || txStatus === 'broadcasting')) {
      setTxStatus('failed')
      setError('Wallet disconnected. Reconnect to publish content to subscribers.')
      stopPolling()
      submittingRef.current = false
    }
  }, [connected, txStatus, stopPolling])

  const hasBodyContent = body.replace(/<[^>]*>/g, '').trim().length > 0

  const clearLocalDraft = useCallback(() => {
    localStorage.removeItem(getDraftKey(creatorAddress))
  }, [creatorAddress])

  const resetForm = useCallback(() => {
    setTitle('')
    setBody('')
    setPreview('')
    setImageUrl('')
    setImageError(false)
    setVideoUrl('')
    setMinTier(0)
    setTags([])
    setTagInput('')
    setScheduleDate('')
    setScheduleTime('')
    setPpvEnabled(false)
    setPpvPrice('')
    setNoteText('')
    setNoteImageUrl('')
    clearLocalDraft()
  }, [clearLocalDraft])

  // --- Helpers for wrapping signMessage ---
  const getWrappedSign = useCallback(() => {
    return signMessage
      ? async (msg: Uint8Array) => {
          const result = await signMessage(msg)
          if (!result) throw new Error('Signing cancelled')
          return result
        }
      : null
  }, [signMessage])

  // Save as draft to Redis (server-side)
  const handleSaveDraft = async () => {
    if (submittingRef.current) return
    if (!title.trim()) {
      setError('Draft requires at least a title.')
      return
    }
    // Validate URLs before saving draft
    const videoCheck = isValidVideoUrl(videoUrl)
    if (!videoCheck.valid) { setError(videoCheck.error || 'Invalid video URL'); return }
    const imageCheck = isValidImageUrl(imageUrl)
    if (!imageCheck.valid) { setError(imageCheck.error || 'Invalid image URL'); return }
    submittingRef.current = true
    setSavingDraft(true)
    setError(null)
    try {
      const wrappedSign = getWrappedSign()
      if (editingPost) {
        const updated = await editPost(
          creatorAddress, editingPost.id,
          {
            title: title.trim(), body, preview: preview.trim() || body.slice(0, 200),
            minTier, status: 'draft',
            tags: tags.length > 0 ? tags : undefined,
          },
          wrappedSign
        )
        if (updated) { toast.success('Draft updated'); onEditComplete?.() }
        else { toast.error(postError?.message || 'Draft couldn\u2019t be saved'); if (postError) clearError() }
      } else {
        const contentId = generatePassId()
        const saved = await createPost(
          creatorAddress, title.trim(), body || '<p></p>', minTier, contentId,
          wrappedSign, imageUrl.trim() || undefined, undefined,
          preview.trim() || undefined, videoUrl.trim() || undefined,
          'draft', tags.length > 0 ? tags : undefined
        )
        if (saved) { toast.success('Draft saved'); resetForm(); onPostCreated?.() }
        else { toast.error(postError?.message || 'Draft couldn\u2019t be saved'); if (postError) clearError() }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft couldn\u2019t be saved')
    } finally {
      submittingRef.current = false
      setSavingDraft(false)
    }
  }

  // Schedule post
  const handleSchedule = async () => {
    if (submittingRef.current) return
    if (!title.trim() || !hasBodyContent) { setError('Title and body are required to schedule.'); return }
    if (!scheduleDate || !scheduleTime) { setError('Select a date and time for scheduling.'); return }
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
    if (new Date(scheduledAt) <= new Date()) { setError('Scheduled time must be in the future.'); return }
    // Validate URLs before scheduling
    const videoCheck = isValidVideoUrl(videoUrl)
    if (!videoCheck.valid) { setError(videoCheck.error || 'Invalid video URL'); return }
    const imageCheck = isValidImageUrl(imageUrl)
    if (!imageCheck.valid) { setError(imageCheck.error || 'Invalid image URL'); return }

    submittingRef.current = true
    setScheduling(true)
    setError(null)
    try {
      const wrappedSign = getWrappedSign()
      if (editingPost) {
        const updated = await editPost(
          creatorAddress, editingPost.id,
          {
            title: title.trim(), body, preview: preview.trim() || body.slice(0, 200),
            minTier, status: 'scheduled',
            tags: tags.length > 0 ? tags : undefined, scheduledAt,
          },
          wrappedSign
        )
        if (updated) { toast.success('Post scheduled!'); onEditComplete?.() }
        else { toast.error(postError?.message || 'Post couldn\u2019t be scheduled'); if (postError) clearError() }
      } else {
        const contentId = generatePassId()
        const saved = await createPost(
          creatorAddress, title.trim(), body, minTier, contentId,
          wrappedSign, imageUrl.trim() || undefined, undefined,
          preview.trim() || undefined, videoUrl.trim() || undefined,
          'scheduled', tags.length > 0 ? tags : undefined, scheduledAt
        )
        if (saved) {
          toast.success(`Scheduled for ${new Date(scheduledAt).toLocaleString()}`)
          resetForm(); onPostCreated?.()
        } else { toast.error(postError?.message || 'Post couldn\u2019t be scheduled'); if (postError) clearError() }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post couldn\u2019t be scheduled')
    } finally {
      submittingRef.current = false
      setScheduling(false)
    }
  }

  const handlePublish = async () => {
    if (submittingRef.current) return
    if (!title.trim() || !hasBodyContent) { setError('Title and body are required.'); return }
    // Validate URLs before submission
    const videoCheck = isValidVideoUrl(videoUrl)
    if (!videoCheck.valid) { setError(videoCheck.error || 'Invalid video URL'); return }
    const imageCheck = isValidImageUrl(imageUrl)
    if (!imageCheck.valid) { setError(imageCheck.error || 'Invalid image URL'); return }

    // If editing an existing post, just update status to published (no on-chain tx needed)
    if (editingPost) {
      submittingRef.current = true
      setError(null)
      try {
        const wrappedSign = getWrappedSign()
        const updated = await editPost(
          creatorAddress, editingPost.id,
          {
            title: title.trim(), body, preview: preview.trim() || body.slice(0, 200),
            minTier, status: 'published',
            tags: tags.length > 0 ? tags : undefined,
          },
          wrappedSign
        )
        if (updated) { toast.success('Post published!'); onEditComplete?.() }
        else { toast.error(postError?.message || 'Post couldn\u2019t be published'); if (postError) clearError() }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Post couldn\u2019t be published')
      } finally {
        submittingRef.current = false
      }
      return
    }

    submittingRef.current = true
    setError(null)

    // Free posts (minTier === 0) skip on-chain transaction — save directly to Redis
    if (minTier === 0) {
      try {
        const contentId = generatePassId()
        const wrappedSign = getWrappedSign()
        const ppvMicrocredits = ppvEnabled && ppvPrice ? creditsToMicrocredits(parseFloat(ppvPrice)) : undefined
        const saved = await createPost(
          creatorAddress, title.trim(), body, 0, contentId,
          wrappedSign, imageUrl.trim() || undefined, undefined,
          preview.trim() || undefined, videoUrl.trim() || undefined,
          'published', tags.length > 0 ? [...tags] : undefined,
          undefined, ppvMicrocredits
        )
        if (saved) {
          toast.success('Free post published!')
          // Trigger subscriber email notification (best-effort, non-blocking)
          triggerSubscriberNotification(creatorAddress, title.trim(), body, saved.id)
          resetForm()
          onPostCreated?.()
        } else {
          toast.error(postError?.message || 'Post could not be published')
          if (postError) clearError()
          setError('Post could not be saved. Check your wallet and try again.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Post could not be published')
      } finally {
        submittingRef.current = false
      }
      return
    }

    // Gated posts (minTier >= 1) need on-chain publishContent transaction
    setTxStatus('signing')
    toast.loading(`Publishing "${title.trim()}"...`, { id: 'post-optimistic', duration: 60000 })

    try {
      const contentId = generatePassId()
      setTxStatus('proving')
      const id = await publishContent(contentId, minTier)

      if (id) {
        setTxId(id)
        setTxStatus('broadcasting')

        const postTitle = title.trim()
        const postBody = body
        const postPreview = preview.trim() || undefined
        const postTier = minTier
        const postImageUrl = imageUrl.trim() || undefined
        const postVideoUrl = videoUrl.trim() || undefined
        const postTags = tags.length > 0 ? [...tags] : undefined
        const postPpvPrice = ppvEnabled && ppvPrice ? creditsToMicrocredits(parseFloat(ppvPrice)) : undefined

        startPolling(id, async (result) => {
          if (result.status === 'confirmed') {
            if (result.resolvedTxId) setTxId(result.resolvedTxId)
            setTxStatus('confirmed')
            toast.dismiss('post-optimistic')
            const hashedId = await poseidon2HashField(contentId)
            if (hashedId) saveContentHash(contentId, hashedId)
            const wrappedSign = getWrappedSign()
            const saved = await createPost(
              creatorAddress, postTitle, postBody, postTier, contentId,
              wrappedSign, postImageUrl, hashedId ?? undefined, postPreview,
              postVideoUrl, 'published', postTags,
              undefined, postPpvPrice
            )
            if (!saved) {
              const msg = postError
                ? `Couldn\u2019t save content: ${postError.message}`
                : 'Post confirmed on-chain but the content couldn\u2019t be saved. Try re-publishing.'
              toast.error(msg)
              if (postError) clearError()
              // Keep form content so user can retry - don't reset on failure
              setTxStatus('failed')
              setError('Content confirmed on-chain but save to server failed. Your content is preserved—try publishing again.')
            } else {
              toast.success('Post published!')
              // Trigger subscriber email notification (best-effort, non-blocking)
              triggerSubscriberNotification(creatorAddress, postTitle, postBody, saved.id)
              resetForm()
              onPostCreated?.()
            }
          } else if (result.status === 'failed') {
            setTxStatus('failed')
            toast.dismiss('post-optimistic')
            setError('Post couldn\u2019t be published on-chain. Make sure your wallet is unlocked and has enough credits.')
            toast.error('Post couldn\u2019t be published')
          } else if (result.status === 'timeout') {
            setTxStatus('failed')
            toast.dismiss('post-optimistic')
            setError('Transaction is still processing. Check your wallet or refresh the page to see if it completed.')
            toast.warning('Transaction taking longer than expected')
          }
        })
      } else {
        setTxStatus('failed')
        setError('Wallet didn\u2019t approve the transaction. Try again when ready.')
      }
    } catch (err) {
      toast.dismiss('post-optimistic')
      setTxStatus('failed')
      setError(err instanceof Error ? err.message : 'Post couldn\u2019t be published')
    } finally {
      submittingRef.current = false
    }
  }

  // Publish a Note (short-form, always free, no on-chain tx)
  const handlePublishNote = async () => {
    if (submittingRef.current) return
    if (!noteText.trim()) { setError('Note text is required.'); return }
    if (noteText.length > 280) { setError('Notes are limited to 280 characters.'); return }

    submittingRef.current = true
    setError(null)
    try {
      const contentId = generatePassId()
      const wrappedSign = getWrappedSign()
      const saved = await createPost(
        creatorAddress, '', noteText.trim(), 0, contentId,
        wrappedSign, noteImageUrl.trim() || undefined, undefined,
        undefined, undefined,
        'published', undefined, undefined,
        undefined, 'note'
      )
      if (saved) {
        toast.success('Note shared!')
        setNoteText('')
        setNoteImageUrl('')
        onPostCreated?.()
      } else {
        toast.error(postError?.message || 'Note could not be published')
        if (postError) clearError()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Note could not be published')
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

  // --- Tag handlers ---
  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    if (tags.length >= API_LIMITS.MAX_TAGS_PER_POST) {
      toast.error(`Maximum ${API_LIMITS.MAX_TAGS_PER_POST} tags allowed`)
      return
    }
    if (tags.includes(trimmed)) return
    setTags(prev => [...prev, trimmed.slice(0, API_LIMITS.MAX_TAG_LENGTH)])
    setTagInput('')
    setShowTagSuggestions(false)
  }, [tags])

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }, [])

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) }
  }

  const getTagColor = (tag: string): string => {
    return TAG_COLORS[tag] || 'text-white/70 bg-white/[0.04] border-white/10'
  }

  // Build tier options from actual on-chain tiers (Free first, then paid tiers)
  const tierOptions: { id: number; name: string; description?: string }[] = [
    { id: 0, name: 'Free', description: 'Visible to everyone' },
    { id: 1, name: 'Supporter' },
    ...Object.entries(onChainTiers)
      .filter(([, t]) => t.price > 0)
      .map(([id, t]) => ({ id: Number(id), name: t.name }))
      .sort((a, b) => a.id - b.id),
  ]

  const filteredSuggestions = SUGGESTED_TAGS.filter(
    s => !tags.includes(s) && s.toLowerCase().includes(tagInput.toLowerCase())
  )

  return (
    <m.div
      id="create-post"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-surface-1 border border-border scroll-mt-24"
    >
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-white/70" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">
          {editingPost ? 'Edit Post' : 'Create'}
        </h2>
      </div>

      {/* Post / Note mode switcher */}
      {!editingPost && (
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-border mb-4" role="tablist" aria-label="Content type">
          <button
            role="tab"
            aria-selected={postMode === 'post'}
            onClick={() => setPostMode('post')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              postMode === 'post'
                ? 'bg-white/[0.06] border border-white/15 text-white/70'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            Post
          </button>
          <button
            role="tab"
            aria-selected={postMode === 'note'}
            onClick={() => setPostMode('note')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              postMode === 'note'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" aria-hidden="true" />
            Note
          </button>
        </div>
      )}

      {/* Draft restoration banner */}
      {hasDraft && !draftDismissed && !editingPost && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3">
          <p className="text-sm text-blue-300">You have an unsaved draft. Restore it?</p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={restoreDraft}
              className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-medium hover:bg-blue-500/30 transition-colors"
            >
              Restore
            </button>
            <button
              onClick={discardDraft}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-white/60 text-xs font-medium hover:bg-white/[0.08] transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* ===== Note Mode ===== */}
      {postMode === 'note' && !editingPost ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="note-text" className="sr-only">Note text</label>
            <textarea
              id="note-text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, 280))}
              placeholder="Share a quick thought..."
              rows={3}
              maxLength={280}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/50 transition-all text-base resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-white/50">Always free, always public</p>
              <p className={`text-[10px] ${noteText.length > 260 ? 'text-amber-400' : 'text-white/50'}`}>
                {noteText.length}/280
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="note-image" className="block text-xs text-white/50 mb-1">Image URL (optional)</label>
            <input
              id="note-image"
              type="url"
              value={noteImageUrl}
              onChange={(e) => setNoteImageUrl(e.target.value)}
              placeholder="https://..."
              maxLength={2048}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/50 transition-all text-xs"
            />
          </div>
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
          <button
            onClick={handlePublishNote}
            disabled={!noteText.trim() || submittingRef.current}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            Share Note
          </button>
        </div>
      ) : (txStatus === 'idle' || txStatus === 'failed') ? (
        <>
          <div className="space-y-4">
            <div>
              <label htmlFor="post-title" className="block text-sm text-white/70 mb-1.5">Title <span className="text-red-400" aria-hidden="true">*</span></label>
              <input
                id="post-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Exclusive content title..."
                required
                aria-required="true"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/30 transition-all text-base"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">Content</label>
              <Suspense fallback={
                <div className="w-full h-40 rounded-xl bg-white/[0.05] border border-border animate-pulse" />
              }>
                <RichTextEditor
                  content={body}
                  onChange={setBody}
                  placeholder="Write your exclusive content — use the toolbar for rich formatting, images, and video embeds..."
                />
              </Suspense>
            </div>
            <div>
              <label htmlFor="post-preview" className="block text-sm text-white/70 mb-1.5">
                Preview <span className="text-white/60">(optional -- shown to non-subscribers)</span>
              </label>
              <textarea
                id="post-preview"
                value={preview}
                onChange={(e) => setPreview(e.target.value.slice(0, 300))}
                placeholder="A short teaser to attract subscribers..."
                rows={2}
                maxLength={300}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/30 transition-all text-base resize-none"
              />
              <p className="text-[10px] text-white/60 mt-0.5">{preview.length}/300</p>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">
                Image <span className="text-white/60">(optional -- drag & drop, upload, or paste URL)</span>
              </label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload image file"
              />

              {!imageUrl && !imageUploading && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                  aria-label="Upload image: click or drag and drop"
                  className={`w-full py-6 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all text-center focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none ${
                    isDragging
                      ? 'border-white/30 bg-white/[0.04]'
                      : 'border-border bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <Upload className="w-6 h-6 mx-auto mb-2 text-white/40" aria-hidden="true" />
                  <p className="text-sm text-white/60">
                    {isDragging ? 'Drop image here' : 'Drag & drop an image, or click to browse'}
                  </p>
                  <p className="text-xs text-white/40 mt-1">JPG, PNG, GIF, WebP (max 5MB)</p>
                </div>
              )}

              {imageUploading && (
                <div className="w-full py-6 rounded-xl border border-border bg-white/[0.02] flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-white/60 animate-spin" aria-hidden="true" />
                  <span className="text-sm text-white/60">Uploading image...</span>
                </div>
              )}

              {imageUrl && !imageUploading && (
                <div className="relative">
                  <div className="mt-1 relative rounded-lg overflow-hidden border border-border bg-white/[0.02] aspect-video max-h-48">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={title ? `Preview image for ${title}` : 'Post image preview'}
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setImageUrl(''); setImageError(false) }}
                    className="absolute top-3 right-2 p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-colors focus-visible:ring-2 focus-visible:ring-white/30"
                    aria-label="Remove image"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {imageError && (
                <p className="text-xs text-red-400 mt-1">Failed to load image. Try uploading again.</p>
              )}

              {!imageUrl && !imageUploading && (
                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" aria-hidden="true" />
                    <input
                      id="post-image-url"
                      type="url"
                      value={imageUrl}
                      onChange={(e) => {
                        const val = e.target.value
                        setImageUrl(val)
                        setImageError(false)
                        // Real-time validation feedback
                        if (val.trim()) {
                          const check = isValidImageUrl(val)
                          setImageUrlError(check.valid ? null : check.error || 'Invalid image URL')
                        } else {
                          setImageUrlError(null)
                        }
                      }}
                      placeholder="or paste image URL: https://..."
                      maxLength={2048}
                      aria-invalid={!!imageUrlError}
                      aria-describedby={imageUrlError ? 'image-url-error' : undefined}
                      className={`w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.05] border text-white placeholder-subtle focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-xs ${
                        imageUrlError ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-white/30'
                      }`}
                    />
                  </div>
                </div>
              )}
              {imageUrlError && (
                <p id="image-url-error" className="text-xs text-red-400 mt-1">{imageUrlError}</p>
              )}
            </div>
            <div>
              <label htmlFor="post-video-url" className="block text-sm text-white/70 mb-1.5">
                Video <span className="text-white/60">(optional -- YouTube or direct video URL)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" aria-hidden="true" />
                  <input
                    id="post-video-url"
                    type="url"
                    value={videoUrl}
                    onChange={(e) => {
                      const val = e.target.value
                      setVideoUrl(val)
                      // Real-time validation feedback
                      if (val.trim()) {
                        const check = isValidVideoUrl(val)
                        setVideoUrlError(check.valid ? null : check.error || 'Invalid video URL')
                      } else {
                        setVideoUrlError(null)
                      }
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    maxLength={2048}
                    aria-invalid={!!videoUrlError}
                    aria-describedby={videoUrlError ? 'video-url-error' : undefined}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.05] border text-white placeholder-subtle focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-sm ${
                      videoUrlError ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-white/30'
                    }`}
                  />
                </div>
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => { setVideoUrl(''); setVideoUrlError(null) }}
                    className="px-2.5 rounded-xl bg-white/[0.05] border border-border text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0"
                    aria-label="Clear video"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              {videoUrlError && (
                <p id="video-url-error" className="text-xs text-red-400 mt-1">{videoUrlError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">Minimum tier required</label>
              {tiersLoading && (
                <p className="text-xs text-white/50 mb-2">Loading tier options...</p>
              )}
              {tiersError && (
                <p className="text-xs text-yellow-400/80 mb-2">Could not load custom tiers. Showing default tier only.</p>
              )}
              <div className="flex flex-wrap gap-2" role="group" aria-label="Minimum tier selection">
                {tierOptions.map(({ id, name, description }) => (
                  <button
                    key={id}
                    onClick={() => setMinTier(id)}
                    aria-label={`Set minimum tier to ${name}${description ? ` — ${description}` : ''}`}
                    aria-pressed={minTier === id}
                    className={`py-2.5 px-4 rounded-lg text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0 ${
                      minTier === id
                        ? id === 0
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-accent-sm'
                          : 'bg-white/[0.08] border border-white/20 text-white/70 shadow-accent-sm'
                        : 'bg-white/[0.05] border border-border text-white/70 hover:bg-white/[0.08] hover:border-white/15'
                    }`}
                  >
                    {name}
                    {description && <span className="ml-1 text-[10px] opacity-70">({description})</span>}
                  </button>
                ))}
              </div>
              {minTier === 0 && (
                <p className="text-xs text-emerald-400/70 mt-2">
                  Free posts are visible to everyone, even without a wallet. Great for attracting new subscribers.
                </p>
              )}
            </div>

            {/* Pay-Per-View toggle */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm text-white/70">
                  <DollarSign className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                  Pay-Per-View <span className="text-white/50">(one-time fee to unlock)</span>
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={ppvEnabled}
                  onClick={() => setPpvEnabled(p => !p)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    ppvEnabled ? 'bg-amber-500/40' : 'bg-white/[0.08]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      ppvEnabled ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
              {ppvEnabled && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60 pointer-events-none" aria-hidden="true" />
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={ppvPrice}
                      onChange={(e) => setPpvPrice(e.target.value)}
                      placeholder="2.0"
                      className="w-full pl-9 pr-16 py-2 rounded-xl bg-white/[0.05] border border-amber-500/30 text-white placeholder-subtle focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50 transition-all text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50">ALEO</span>
                  </div>
                  {ppvPrice && parseFloat(ppvPrice) > 0 && (
                    <span className="text-xs text-white/50 shrink-0">
                      ~${(parseFloat(ppvPrice) * ALEO_USD_ESTIMATE).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
              {ppvEnabled && (
                <p className="text-[10px] text-amber-400/60 mt-1.5">
                  Readers pay this one-time fee to unlock this specific post. Payment uses the existing tip infrastructure.
                </p>
              )}
            </div>

            {/* Tags input */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5">
                <Tag className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                Tags <span className="text-white/60">(optional, max {API_LIMITS.MAX_TAGS_PER_POST})</span>
              </label>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${getTagColor(tag)}`}
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:opacity-70 transition-opacity"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true) }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length >= API_LIMITS.MAX_TAGS_PER_POST ? 'Max tags reached' : 'Add a tag and press Enter...'}
                  disabled={tags.length >= API_LIMITS.MAX_TAGS_PER_POST}
                  maxLength={50}
                  className="w-full px-4 py-2 rounded-xl bg-white/[0.05] border border-border text-white placeholder-subtle focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/30 transition-all text-sm disabled:opacity-50"
                />
                {showTagSuggestions && filteredSuggestions.length > 0 && tags.length < API_LIMITS.MAX_TAGS_PER_POST && (
                  <div className="absolute z-10 top-full mt-1 w-full rounded-xl bg-[#1a1a2e] border border-border shadow-lg overflow-hidden">
                    {filteredSuggestions.map(suggestion => (
                      <button
                        key={suggestion}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addTag(suggestion)}
                        className="w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-white/[0.08] transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-3 h-3 text-white/40" />
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${getTagColor(suggestion)}`}>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Schedule date/time picker */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5">
                <Clock className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                Schedule <span className="text-white/60">(optional -- set a future publish time)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] border border-border text-white focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/30 transition-all text-sm [color-scheme:dark]"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] border border-border text-white focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/30 transition-all text-sm [color-scheme:dark]"
                />
                {(scheduleDate || scheduleTime) && (
                  <button
                    type="button"
                    onClick={() => { setScheduleDate(''); setScheduleTime('') }}
                    className="px-2.5 rounded-xl bg-white/[0.05] border border-border text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
                    aria-label="Clear schedule"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <p className="mt-4 text-xs text-white/60">
            Publishing registers content metadata on-chain (content ID + minimum tier). The post body is stored off-chain and persists across devices.
          </p>

          {/* Action buttons: Save Draft | Schedule | Publish */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={!title.trim() || submittingRef.current}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-blue-500/30 text-blue-300 text-sm font-medium hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {savingDraft ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="w-4 h-4" aria-hidden="true" />
              )}
              {savingDraft ? 'Saving...' : 'Save Draft'}
            </button>
            {(scheduleDate && scheduleTime) && (
              <button
                onClick={handleSchedule}
                disabled={!title.trim() || !hasBodyContent || submittingRef.current}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {scheduling ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Clock className="w-4 h-4" aria-hidden="true" />
                )}
                {scheduling ? 'Scheduling...' : 'Schedule'}
              </button>
            )}
            <Button
              onClick={handlePublish}
              disabled={!title.trim() || !hasBodyContent || (txStatus !== 'idle' && txStatus !== 'failed')}
              className="flex-1"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              {editingPost ? 'Publish Now' : 'Publish'}
            </Button>
          </div>
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
              <p className="text-xs text-white/70 mb-4">Content metadata is now on-chain. Subscribers can now view your post.</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href={`/creator/${creatorAddress}#posts`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-white/[0.04] border border-white/15 text-sm text-white/70 hover:bg-white/10 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  View Your Page
                </Link>
                <button
                  onClick={handleReset}
                  aria-label="Create another post"
                  className="px-6 py-2 rounded-lg bg-white/[0.05] border border-border text-sm text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  Create Another Post
                </button>
              </div>
            </m.div>
          )}
        </div>
      )}
    </m.div>
  )
}
