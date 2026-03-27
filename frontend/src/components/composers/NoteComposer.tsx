'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { m } from 'framer-motion'
import AddressAvatar from '@/components/ui/AddressAvatar'
import CharacterRing from './CharacterRing'

const MAX_CHARS = 280

interface NoteComposerProps {
  profileImageUrl?: string | null
  profileName?: string | null
  walletAddress?: string
  onSubmit: (text: string) => Promise<void>
  submitting?: boolean
}

export default function NoteComposer({
  profileImageUrl,
  profileName,
  walletAddress,
  onSubmit,
  submitting = false,
}: NoteComposerProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea based on content
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    // min 2 rows (~52px), max 8 rows (~208px)
    const minH = 52
    const maxH = 208
    const scrollH = el.scrollHeight
    el.style.height = `${Math.max(minH, Math.min(scrollH, maxH))}px`
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [text, adjustHeight])

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_CHARS || submitting) return
    try {
      await onSubmit(trimmed)
      setText('')
      // Reset textarea height after clearing
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch {
      // Error handling is done by the parent via toast
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canPost = text.trim().length > 0 && text.length <= MAX_CHARS && !submitting

  return (
    <div className="p-4 rounded-xl bg-surface-1 border border-white/[0.06]">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0 pt-1">
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt={profileName || 'Creator'}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <AddressAvatar
              address={walletAddress || ''}
              size={40}
              className="rounded-full"
            />
          )}
        </div>

        {/* Textarea area */}
        <div className="flex-1 min-w-0">
          <m.textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            aria-label="Compose a note"
            aria-describedby="note-shortcut-hint"
            rows={2}
            maxLength={MAX_CHARS + 20} // allow slight overflow so ring turns red
            disabled={submitting}
            className="w-full bg-transparent text-white text-[15px] leading-relaxed placeholder-white/50 resize-none focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:rounded-lg disabled:opacity-50"
            initial={{ height: 52 }}
            animate={{ height: 'auto' }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          />

          {/* Bottom toolbar */}
          <div className="border-t border-white/[0.06] pt-3 mt-2 flex items-center justify-between">
            {/* Left side — reserved for future toolbar icons */}
            <div className="flex items-center gap-2">
              <span id="note-shortcut-hint" className="text-[11px] text-white/30">
                {text.length > 0 ? `Ctrl+Enter to post` : ''}
              </span>
            </div>

            {/* Right side — character ring + post button */}
            <div className="flex items-center gap-3">
              {text.length > 0 && (
                <m.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  <CharacterRing current={text.length} max={MAX_CHARS} />
                </m.div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canPost}
                className={`
                  px-5 py-1.5 rounded-full text-sm font-semibold transition-all
                  ${canPost
                    ? 'bg-white text-black hover:bg-white/90 active:scale-[0.97]'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }
                `}
              >
                {submitting ? (
                  <m.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5"
                  >
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Posting...
                  </m.span>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
