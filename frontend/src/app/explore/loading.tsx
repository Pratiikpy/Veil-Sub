export default function ExploreLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse mb-8">
          <div className="h-8 w-48 rounded-lg bg-white/[0.06] mb-3" />
          <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="h-12 w-full rounded-xl bg-white/[0.04] mb-8 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-border animate-pulse">
              <div className="h-12 w-12 rounded-full bg-white/[0.06] mb-4" />
              <div className="h-5 w-32 rounded bg-white/[0.06] mb-2" />
              <div className="h-3 w-full rounded bg-white/[0.03] mb-1" />
              <div className="h-3 w-2/3 rounded bg-white/[0.03] mb-4" />
              <div className="h-9 w-full rounded-lg bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
