export default function FeedLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-white/[0.06] bg-surface-1 p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 rounded bg-white/[0.06] w-32" />
              <div className="h-2.5 rounded bg-white/[0.04] w-20" />
            </div>
          </div>
          <div className="h-5 rounded bg-white/[0.06] w-3/4 mb-3" />
          <div className="space-y-2">
            <div className="h-3 rounded bg-white/[0.04] w-full" />
            <div className="h-3 rounded bg-white/[0.04] w-5/6" />
          </div>
        </div>
      ))}
    </div>
  )
}
