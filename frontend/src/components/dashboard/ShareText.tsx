'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

export default function ShareText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Couldn\u2019t copy to clipboard. Select and copy the text manually.')
    }
  }

  return (
    <div className="relative">
      <div className="p-4 rounded-lg bg-white/[0.03] border border-border text-sm text-white whitespace-pre-wrap break-all">
        {text}
      </div>
      <button
        onClick={copy}
        className="mt-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-all duration-300 flex items-center gap-2 active:scale-[0.98]"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied' : 'Copy to clipboard'}
      </button>
    </div>
  )
}
