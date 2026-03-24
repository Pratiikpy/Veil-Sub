'use client'

interface PinnedPostProps {
  children: React.ReactNode
  creatorName: string
}

export default function PinnedPost({ children, creatorName }: PinnedPostProps) {
  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <span className="text-xs font-medium text-violet-400/80" aria-label="Pinned post">
          {'\uD83D\uDCCC'} Pinned by {creatorName}
        </span>
      </div>
      <div className="rounded-2xl ring-1 ring-violet-500/20 ring-offset-0">
        {children}
      </div>
    </div>
  )
}

const PIN_KEY = 'veilsub_pinned_'

export function getPinnedPostId(creatorAddress: string): string | null {
  try { return localStorage.getItem(PIN_KEY + creatorAddress) } catch { return null }
}

export function setPinnedPostId(creatorAddress: string, postId: string | null): void {
  try {
    if (postId) localStorage.setItem(PIN_KEY + creatorAddress, postId)
    else localStorage.removeItem(PIN_KEY + creatorAddress)
  } catch { /* quota */ }
}
