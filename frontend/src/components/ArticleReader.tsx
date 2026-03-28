'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import DOMPurify from 'dompurify'
import { shortenAddress } from '@/lib/utils'

interface ArticleReaderProps {
  title: string
  body: string
  creator: { name: string; address: string }
  publishedAt: string
  readingTime: string
  onClose: () => void
}

export default function ArticleReader({ title, body, creator, publishedAt, readingTime, onClose }: ArticleReaderProps) {
  const [progress, setProgress] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const sanitizedBody = useMemo(() => DOMPurify.sanitize(body, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img', 'hr',
      'div', 'span',
      'iframe',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height', 'loading',
      'class',
      'allowfullscreen', 'allow', 'frameborder',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allowfullscreen', 'allow', 'frameborder'],
  }), [body])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const max = scrollHeight - clientHeight
      setProgress(max > 0 ? Math.min(100, (scrollTop / max) * 100) : 100)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const displayName = creator.name || shortenAddress(creator.address)

  return (
    <div className="fixed inset-0 z-[9998] animate-lightbox-in" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[9999] pointer-events-none">
        <div className="h-full bg-white transition-[width] duration-100 ease-linear" style={{ width: `${progress}%` }} />
      </div>

      <div ref={containerRef} className="h-full overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-5 py-12 sm:py-16">
          {/* Back button */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to feed
          </button>

          {/* Meta */}
          <div className="flex items-center gap-3 text-sm text-white/50 mb-6">
            <span className="text-white/70 font-medium">{displayName}</span>
            <span aria-hidden="true">·</span>
            <span>{publishedAt}</span>
            <span aria-hidden="true">·</span>
            <span>{readingTime}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {title}
          </h1>

          {/* Body -- sanitized via DOMPurify (same as RichContentRenderer) */}
          <div
            className="article-reader-body rich-content"
            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
          />
        </div>
      </div>
    </div>
  )
}
