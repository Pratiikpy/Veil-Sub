'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Share2, Shield, Check } from 'lucide-react'
import GlassCard from './GlassCard'

interface Props {
  creatorAddress: string
  delay?: number
}

export default function CreatorQRCode({ creatorAddress, delay = 0 }: Props) {
  const qrRef = useRef<HTMLDivElement>(null)
  const [creatorUrl, setCreatorUrl] = useState(`/creator/${creatorAddress}`)
  const [copied, setCopied] = useState(false)

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
    }
    img.onerror = () => {
      // SVG to image conversion failed — silently skip
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
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // User cancelled share dialog or clipboard not available
    }
  }, [creatorUrl])

  return (
    <GlassCard delay={delay}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-400" />
          <h3 className="text-white font-semibold text-sm">
            Share This Creator
          </h3>
        </div>

        <div ref={qrRef} className="p-3 rounded-xl bg-white">
          <QRCodeSVG
            value={creatorUrl}
            size={160}
            level="H"
            includeMargin={false}
            fgColor="#0a0a0f"
            bgColor="#ffffff"
          />
        </div>

        <div className="flex gap-2 w-full">
          <button
            onClick={handleDownload}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button
            onClick={handleShare}
            className="flex-1 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/20 transition-colors flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Scan to subscribe privately — zero identity exposure
        </p>
      </div>
    </GlassCard>
  )
}
