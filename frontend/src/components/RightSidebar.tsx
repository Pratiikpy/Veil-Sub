'use client'

import Link from 'next/link'
import { Shield } from 'lucide-react'
import { FEATURED_CREATORS } from '@/lib/config'

function CreatorCard({ creator }: { creator: (typeof FEATURED_CREATORS)[number] }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Link
        href={`/creator/${creator.address}`}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/15 text-violet-400 text-xs font-bold shrink-0 hover:bg-violet-500/20 transition-colors"
      >
        {creator.label.charAt(0).toUpperCase()}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/creator/${creator.address}`}
          className="block text-[13px] font-medium text-white/80 hover:text-white truncate transition-colors"
        >
          {creator.label}
        </Link>
        <p className="text-[11px] text-white/30 truncate">{creator.category ?? 'Creator'}</p>
      </div>
      <Link
        href={`/creator/${creator.address}`}
        className="shrink-0 text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition-colors px-2.5 py-1 rounded-lg bg-violet-500/[0.08] hover:bg-violet-500/[0.14] border border-violet-500/[0.12]"
      >
        View
      </Link>
    </div>
  )
}

export default function RightSidebar() {
  return (
    <aside className="hidden lg:flex flex-col fixed top-0 right-0 bottom-0 w-[260px] bg-[#050507] border-l border-white/[0.06] z-40 overflow-y-auto">
      <div className="px-5 pt-8 pb-4 flex-1">
        {/* Suggested creators */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Suggested for you
          </h3>
          <div className="space-y-1">
            {FEATURED_CREATORS.map((creator) => (
              <CreatorCard key={creator.address} creator={creator} />
            ))}
          </div>
        </div>

        {/* Privacy info card */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-violet-400/70" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-white/60">Privacy by Default</span>
          </div>
          <p className="text-[11px] text-white/35 leading-relaxed">
            All subscriptions use zero-knowledge proofs. Only aggregates are visible on-chain. Your identity stays private.
          </p>
        </div>
      </div>

      {/* Footer links */}
      <div className="px-5 pb-6">
        <div className="flex flex-wrap gap-x-2 gap-y-1 mb-3">
          <Link href="/docs" className="text-[11px] text-white/25 hover:text-white/45 transition-colors">About</Link>
          <span className="text-white/15">·</span>
          <Link href="/privacy" className="text-[11px] text-white/25 hover:text-white/45 transition-colors">Privacy</Link>
          <span className="text-white/15">·</span>
          <Link href="/docs" className="text-[11px] text-white/25 hover:text-white/45 transition-colors">Terms</Link>
          <span className="text-white/15">·</span>
          <Link href="/docs" className="text-[11px] text-white/25 hover:text-white/45 transition-colors">Docs</Link>
        </div>
        <p className="text-[10px] text-white/20">&copy; 2026 Veil</p>
      </div>
    </aside>
  )
}
