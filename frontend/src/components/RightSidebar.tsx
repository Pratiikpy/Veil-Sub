'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Shield } from 'lucide-react'
import { FEATURED_CREATORS } from '@/lib/config'
import { getCachedCreator } from '@/lib/creatorCache'

/** Fisher-Yates shuffle (returns new array). */
function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function CreatorCard({ creator }: { creator: (typeof FEATURED_CREATORS)[number] }) {
  const cached = getCachedCreator(creator.address)
  const imageUrl = cached?.image_url

  return (
    <div className="flex items-center gap-3 py-2">
      <Link
        href={`/creator/${creator.address}`}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs font-bold shrink-0 hover:bg-white/[0.08] transition-colors overflow-hidden"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={creator.label}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        ) : (
          creator.label.charAt(0).toUpperCase()
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/creator/${creator.address}`}
          className="block text-[13px] font-medium text-white/80 hover:text-white truncate transition-colors"
        >
          {cached?.display_name || creator.label}
        </Link>
        <p className="text-[11px] text-white/50 truncate">{creator.category ?? 'Creator'}</p>
      </div>
      <Link
        href={`/creator/${creator.address}`}
        className="shrink-0 text-[11px] font-semibold text-white/60 hover:text-white/70 transition-colors px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.14] border border-white/[0.06]"
      >
        View
      </Link>
    </div>
  )
}

export default function RightSidebar() {
  // Shuffle once per mount so different creators appear each session, limit to 3
  const shuffledCreators = useMemo(() => shuffle(FEATURED_CREATORS).slice(0, 3), [])

  return (
    <aside className="hidden lg:flex flex-col fixed top-0 right-0 bottom-0 w-[260px] bg-black border-l border-white/[0.06] z-40 overflow-y-auto">
      <div className="px-5 pt-8 pb-4 flex-1">
        {/* Suggested creators */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            Featured Creators
          </h3>
          <div className="space-y-1">
            {shuffledCreators.map((creator) => (
              <CreatorCard key={creator.address} creator={creator} />
            ))}
          </div>
        </div>

        {/* Privacy info card */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-white/50" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-white/60">Privacy by Default</span>
          </div>
          <p className="text-[11px] text-white/50 leading-relaxed">
            Your subscriptions are invisible. Only total subscriber counts show publicly. Your identity stays private.
          </p>
        </div>
      </div>

      {/* Footer links */}
      <div className="px-5 pb-6">
        <div className="flex flex-wrap gap-x-2 gap-y-1 mb-3">
          <Link href="/privacy" className="text-[11px] text-white/50 hover:text-white/70 transition-colors">Privacy</Link>
          <span className="text-white/15">·</span>
          <Link href="/docs" className="text-[11px] text-white/50 hover:text-white/70 transition-colors">Docs</Link>
          <span className="text-white/15">·</span>
          <Link href="/vision" className="text-[11px] text-white/50 hover:text-white/70 transition-colors">Vision</Link>
        </div>
        <p className="text-[11px] text-white/50">&copy; 2026 VeilSub</p>
      </div>
    </aside>
  )
}
