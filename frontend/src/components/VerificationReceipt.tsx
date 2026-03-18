'use client'

import { useCallback, useRef, useState } from 'react'
import { m } from 'framer-motion'
import { Shield, Copy, Download, Check } from 'lucide-react'
import { toast } from 'sonner'

interface VerificationReceiptProps {
  creatorName: string
  tier: string
  expiresAt: string
  verifiedAt: string
  passId?: string
}

const CARD_BG = {
  background: 'linear-gradient(135deg, #1e1145 0%, #0f0a1e 50%, #0d0d14 100%)',
} as const

const PATTERN_STYLE = {
  backgroundImage: 'radial-gradient(rgba(139,92,246,0.03) 1px, transparent 1px)',
  backgroundSize: '16px 16px',
} as const

export default function VerificationReceipt({
  creatorName,
  tier,
  expiresAt,
  verifiedAt,
  passId,
}: VerificationReceiptProps) {
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleCopy = useCallback(() => {
    const text = `Verified VeilSub Subscriber\nCreator: ${creatorName}\nTier: ${tier}\nActive until: ${expiresAt}\nVerified: ${verifiedAt}\nhttps://veil-sub.vercel.app/verify`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Receipt copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error('Could not copy to clipboard')
    })
  }, [creatorName, tier, expiresAt, verifiedAt])

  const handleDownload = useCallback(() => {
    const card = cardRef.current
    if (!card) return
    // Open a new window with just the receipt for easy screenshotting
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>VeilSub Verification Receipt</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#050507;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}</style></head><body>${card.outerHTML}</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank', 'width=460,height=320')
    if (win) win.focus()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, [])

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      className="space-y-3"
    >
      {/* Receipt card */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[400px] mx-auto rounded-2xl overflow-hidden border border-violet-500/20 shadow-[0_8px_40px_-8px_rgba(139,92,246,0.2)]"
        style={CARD_BG}
      >
        {/* Dot pattern overlay */}
        <div className="absolute inset-0 pointer-events-none" style={PATTERN_STYLE} />

        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-violet-500/10 blur-3xl pointer-events-none" />

        <div className="relative p-6" style={{ minHeight: 220 }}>
          {/* Header: Verified badge */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-300 tracking-wide uppercase">Verified Subscriber</p>
              <p className="text-[10px] text-white/30">Zero-knowledge proof</p>
            </div>
          </div>

          {/* Creator + tier */}
          <div className="mb-4">
            <p className="text-lg font-semibold text-white mb-1.5" style={{ letterSpacing: '-0.02em' }}>
              {creatorName}
            </p>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-violet-500/15 border border-violet-500/25 text-[11px] font-medium text-violet-300">
              {tier}
            </span>
          </div>

          {/* Active until */}
          <p className="text-xs text-white/50 mb-1">
            Active until <span className="text-white/80 font-medium">{expiresAt}</span>
          </p>

          {/* Footer: verified date + logo */}
          <div className="flex items-end justify-between mt-4 pt-3 border-t border-white/[0.06]">
            <div>
              <p className="text-[10px] text-white/30 mb-0.5">Verified on {verifiedAt}</p>
              {passId && (
                <p className="text-[10px] text-white/20 font-mono">{passId.length > 16 ? passId.slice(0, 16) + '...' : passId}</p>
              )}
            </div>
            <p className="text-sm font-serif italic text-white/40">VeilSub</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-xs text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Share'}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.05] border border-border text-xs text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>
    </m.div>
  )
}
