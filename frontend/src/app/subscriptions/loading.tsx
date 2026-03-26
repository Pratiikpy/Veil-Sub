export default function SubscriptionsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
      <div className="h-8 rounded bg-white/[0.06] w-48 mb-8 animate-pulse" />
      {[1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-white/[0.06] bg-surface-1 p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 rounded bg-white/[0.06] w-40" />
              <div className="h-3 rounded bg-white/[0.04] w-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-3 rounded bg-white/[0.04]" />
            <div className="h-3 rounded bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  )
}
