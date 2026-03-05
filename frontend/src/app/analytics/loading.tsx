export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse mb-8">
          <div className="h-8 w-56 rounded-lg bg-white/[0.06] mb-3" />
          <div className="h-4 w-80 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] animate-pulse">
              <div className="h-4 w-24 rounded bg-white/[0.06] mb-3" />
              <div className="h-8 w-20 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-white/[0.02] border border-white/[0.08] animate-pulse" />
      </div>
    </div>
  )
}
