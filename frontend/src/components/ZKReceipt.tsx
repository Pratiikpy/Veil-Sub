'use client'

import { useState } from 'react'
import { Copy, Share2, Shield, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ZKReceiptProps {
  creatorHash: string
  tier: string
  expiresAt: number
  txId: string
  passId: string
}

function truncateHash(hash: string, startLen = 10, endLen = 6): string {
  if (hash.length <= startLen + endLen + 3) return hash
  return `${hash.slice(0, startLen)}...${hash.slice(-endLen)}`
}

function formatBlockHeight(height: number): string {
  return height.toLocaleString()
}

export default function ZKReceipt({
  creatorHash,
  tier,
  expiresAt,
  txId,
  passId,
}: ZKReceiptProps) {
  const [copied, setCopied] = useState(false)

  const receiptText = [
    'ZERO-KNOWLEDGE RECEIPT',
    `Creator: ${creatorHash}`,
    `Access: ${tier}`,
    `Expires: Block ${formatBlockHeight(expiresAt)}`,
    `Proof: ${txId}`,
    `Pass: ${passId}`,
    '',
    'This receipt proves you subscribed without revealing who you are.',
    `Verify: https://testnet.aleoscan.io/transaction?id=${txId}`,
  ].join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptText).then(
      () => {
        setCopied(true)
        toast.success('Receipt copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
      },
      () => toast.error('Could not copy receipt')
    )
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'VeilSub ZK Receipt',
        text: receiptText,
      }).catch(() => { /* user cancelled */ })
    } else {
      handleCopy()
    }
  }

  return (
    <div className="relative mt-4 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-white/10 overflow-hidden">
      {/* Gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-green-500/60 via-emerald-400/40 to-green-500/60" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-green-400" aria-hidden="true" />
          <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest">
            Zero-Knowledge Receipt
          </h4>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-white/10 mb-4" />

        {/* Fields */}
        <div className="space-y-3">
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium mb-0.5">Creator</p>
            <code className="font-mono text-green-400 text-sm">{truncateHash(creatorHash, 12, 8)}</code>
          </div>
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium mb-0.5">Access</p>
            <p className="font-mono text-green-400 text-sm">{tier}</p>
          </div>
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium mb-0.5">Expires</p>
            <p className="font-mono text-green-400 text-sm">Block {formatBlockHeight(expiresAt)}</p>
          </div>
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium mb-0.5">Proof</p>
            <code className="font-mono text-green-400 text-sm break-all">{truncateHash(txId, 12, 8)}</code>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-white/10 my-4" />

        {/* Privacy quote */}
        <p className="text-white/70 italic text-sm leading-relaxed mb-4">
          &ldquo;This receipt proves you subscribed without revealing who you are.&rdquo;
        </p>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            aria-label="Copy receipt to clipboard"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-medium text-white/70 hover:bg-white/[0.1] hover:text-white transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy Receipt'}
          </button>
          <button
            onClick={handleShare}
            aria-label="Share receipt"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-medium text-white/70 hover:bg-white/[0.1] hover:text-white transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            <Share2 className="w-3 h-3" />
            Share
          </button>
        </div>

        {/* On-chain verification link */}
        <div className="mt-3 text-center">
          <a
            href={`https://testnet.aleoscan.io/transaction?id=${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-white/40 hover:text-white/60 underline underline-offset-2 transition-colors"
          >
            Verify on-chain
          </a>
        </div>
      </div>
    </div>
  )
}
