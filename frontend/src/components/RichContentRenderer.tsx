'use client'

import { useMemo } from 'react'
import DOMPurify from 'dompurify'

interface RichContentRendererProps {
  html: string
  className?: string
}

/**
 * Safely renders rich HTML content with DOMPurify sanitization.
 * Allows safe tags for rich text display (headings, lists, links, images, embeds)
 * while stripping dangerous scripts, event handlers, and XSS vectors.
 *
 * SECURITY: All HTML is sanitized via DOMPurify before rendering.
 * Only whitelisted tags and attributes are permitted.
 */
export default function RichContentRenderer({ html, className = '' }: RichContentRendererProps) {
  const sanitizedHtml = useMemo(() => {
    if (!html) return ''

    // Restrict iframes to YouTube and Vimeo only — prevents arbitrary embed attacks
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'IFRAME') {
        const src = node.getAttribute('src') || ''
        if (!src.match(/^https:\/\/(www\.)?(youtube\.com\/embed|player\.vimeo\.com)\//)) {
          node.remove()
        }
      }
      // Prevent tracking pixels: add no-referrer to all images
      if (node.tagName === 'IMG') {
        node.setAttribute('referrerpolicy', 'no-referrer')
      }
    })

    const result = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
        'h1', 'h2', 'h3', 'h4',
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
        'referrerpolicy',
      ],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allowfullscreen', 'allow', 'frameborder'],
    })

    DOMPurify.removeHook('afterSanitizeAttributes')
    return result
  }, [html])

  if (!sanitizedHtml) return null

  // SECURITY: dangerouslySetInnerHTML is safe here because all HTML
  // is sanitized through DOMPurify with a strict allowlist above.
  return (
    <div
      className={`rich-content text-sm text-white/70 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
