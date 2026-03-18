'use client'

import { useMemo } from 'react'

interface VideoEmbedProps {
  url: string
  title?: string
}

/**
 * Renders a video embed — supports YouTube, YouTube Shorts, and direct video URLs.
 * YouTube links are converted to privacy-enhanced embed iframes.
 * Direct video files (.mp4, .webm, .ogg) use HTML5 <video> element.
 */
export default function VideoEmbed({ url, title }: VideoEmbedProps) {
  const embedData = useMemo(() => {
    if (!url) return null

    try {
      const parsed = new URL(url)

      // YouTube standard URLs
      if (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') {
        const videoId = parsed.searchParams.get('v')
        if (videoId) {
          return { type: 'youtube' as const, embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}` }
        }
        // YouTube Shorts
        const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/)
        if (shortsMatch) {
          return { type: 'youtube' as const, embedUrl: `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}` }
        }
        // YouTube embed URLs (already embed format)
        const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/)
        if (embedMatch) {
          return { type: 'youtube' as const, embedUrl: `https://www.youtube-nocookie.com/embed/${embedMatch[1]}` }
        }
      }

      // YouTube short URLs (youtu.be)
      if (parsed.hostname === 'youtu.be') {
        const videoId = parsed.pathname.slice(1)
        if (videoId) {
          return { type: 'youtube' as const, embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}` }
        }
      }

      // Direct video files
      const ext = parsed.pathname.split('.').pop()?.toLowerCase()
      if (ext && ['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
        return { type: 'direct' as const, embedUrl: url }
      }

      // Fallback: treat as direct video
      return { type: 'direct' as const, embedUrl: url }
    } catch {
      return null
    }
  }, [url])

  if (!embedData) return null

  if (embedData.type === 'youtube') {
    return (
      <div className="rounded-lg overflow-hidden border border-white/[0.06] bg-white/[0.02] aspect-video">
        <iframe
          src={embedData.embedUrl}
          title={title ? `Video: ${title}` : 'Embedded video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-none"
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border border-white/[0.06] bg-white/[0.02]">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={embedData.embedUrl}
        controls
        preload="metadata"
        className="w-full max-h-[400px]"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
