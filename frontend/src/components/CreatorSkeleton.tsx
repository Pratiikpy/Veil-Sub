export default function CreatorSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header skeleton */}
        <div className="mb-10 animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.06]" />
            <div>
              <div className="h-6 w-40 rounded-lg bg-white/[0.06] mb-2" />
              <div className="h-4 w-28 rounded-lg bg-white/[0.04]" />
            </div>
          </div>
          {/* Stats row skeleton */}
          <div className="flex gap-6">
            <div className="h-4 w-32 rounded-lg bg-white/[0.04]" />
            <div className="h-4 w-36 rounded-lg bg-white/[0.04]" />
          </div>
        </div>
        {/* Tier cards skeleton */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="h-5 w-24 rounded-lg bg-white/[0.06] mb-3" />
              <div className="h-8 w-20 rounded-lg bg-white/[0.06] mb-1" />
              <div className="h-3 w-36 rounded-lg bg-white/[0.04] mb-4" />
              <div className="space-y-2 mb-6">
                <div className="h-3 w-full rounded bg-white/[0.03]" />
                <div className="h-3 w-3/4 rounded bg-white/[0.03]" />
              </div>
              <div className="h-10 w-full rounded-lg bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
