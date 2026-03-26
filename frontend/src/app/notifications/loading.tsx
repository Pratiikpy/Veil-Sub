export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-4 animate-pulse">
      <div className="h-8 rounded bg-white/[0.06] w-40 mb-6" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.06] bg-surface-1">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 rounded bg-white/[0.06] w-48" />
            <div className="h-3 rounded bg-white/[0.04] w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
