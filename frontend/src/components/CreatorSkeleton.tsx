export default function CreatorSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Cover banner skeleton */}
      <div className="w-full h-40 sm:h-60 bg-gradient-to-br from-white/[0.03] to-white/[0.01] animate-pulse" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        {/* Profile header skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 animate-pulse">
          {/* Avatar */}
          <div className="w-[72px] h-[72px] rounded-2xl bg-white/[0.06] ring-4 ring-[var(--bg-base)]" />

          {/* Name + meta */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 rounded-lg bg-white/[0.06]" />
              <div className="h-5 w-20 rounded-full bg-white/[0.04]" />
            </div>
            <div className="h-4 w-64 rounded-lg bg-white/[0.04] mt-2" />
            <div className="flex items-center gap-4 mt-2">
              <div className="h-3 w-24 rounded bg-white/[0.03]" />
              <div className="h-3 w-28 rounded bg-white/[0.03]" />
              <div className="h-3 w-20 rounded bg-white/[0.03]" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 sm:pb-1">
            <div className="h-10 w-24 rounded-xl bg-white/[0.06]" />
            <div className="h-10 w-10 rounded-xl bg-white/[0.04]" />
          </div>
        </div>

        {/* Tab bar skeleton */}
        <div className="mt-6 border-b border-border flex gap-6 animate-pulse">
          <div className="h-10 w-16 rounded-t bg-white/[0.04]" />
          <div className="h-10 w-14 rounded-t bg-white/[0.03]" />
          <div className="h-10 w-16 rounded-t bg-white/[0.03]" />
        </div>

        {/* Content area skeleton (posts tab default) */}
        <div className="mt-6 space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05]" />
                <div className="flex-1 h-4 rounded bg-white/[0.05]" />
                <div className="w-16 h-5 rounded-full bg-white/[0.05]" />
              </div>
              <div className="space-y-2">
                <div className="h-3 rounded bg-white/[0.04] w-full" />
                <div className="h-3 rounded bg-white/[0.03] w-3/4" />
                <div className="h-3 rounded bg-white/[0.02] w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
