'use client'

import { useRef, useCallback, useState, useEffect, type RefObject } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Share2, Shield, Check } from 'lucide-react'
import { toast } from 'sonner'
import GlassCard from './GlassCard'

interface Props {
  creatorAddress: string
  delay?: number
}

export default function CreatorQRCode({ creatorAddress, delay = 0 }: Props) {
  const qrRef = useRef<HTMLDivElement>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [creatorUrl, setCreatorUrl] = useState(
    `${process.env.NEXT_PUBLIC_APP_URL || ''}/creator/${creatorAddress}`
  )
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  useEffect(() => {
    setCreatorUrl(`${window.location.origin}/creator/${creatorAddress}`)
  }, [creatorAddress])

  const handleDownload = useCallback(() => {
    if (!qrRef.current) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      canvas.width = 400
      canvas.height = 400
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 400, 400)
      ctx.drawImage(img, 0, 0, 400, 400)

      const link = document.createElement('a')
      link.download = `veilsub-${creatorAddress.slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('QR code downloaded')
    }
    img.onerror = () => {
      toast.error('Could not generate QR code image')
    }
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`
  }, [creatorAddress])

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Subscribe Privately on VeilSub',
          text: 'Support this creator with zero identity exposure.',
          url: creatorUrl,
        })
      } else {
        await navigator.clipboard.writeText(creatorUrl)
        setCopied(true)
        toast.success('Link copied to clipboard')
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // User cancelled share dialog — no action needed
    }
  }, [creatorUrl])

  return (
    <GlassCard delay={delay}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-white/70" aria-hidden="true" />
          <h3 className="text-white font-semibold text-sm">
            Share This Creator
          </h3>
        </div>

        <div ref={qrRef} className="p-4 rounded-xl bg-white">
          <QRCodeSVG
            value={creatorUrl}
            size={160}
            level="H"
            includeMargin={false}
            fgColor="#0a0a0a"
            bgColor="#ffffff"
          />
        </div>

        <div className="flex gap-2 w-full">
          <button
            onClick={handleDownload}
            aria-label="Download QR code as image"
            className="flex-1 px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-xs text-white hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Download
          </button>
          <button
            onClick={handleShare}
            aria-label="Share creator link"
            className="flex-1 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/70 hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" aria-hidden="true" /> : <Share2 className="w-3.5 h-3.5" aria-hidden="true" />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>

        <p className="text-xs text-white/60 text-center">
          Scan to subscribe privately — zero identity exposure
        </p>
      </div>
    </GlassCard>
  )
}
