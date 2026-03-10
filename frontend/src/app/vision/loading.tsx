export default function VisionLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse mb-8">
          <div className="h-8 w-52 rounded-lg bg-white/[0.06] mb-3" />
          <div className="h-4 w-64 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-border animate-pulse">
              <div className="h-5 w-36 rounded bg-white/[0.06] mb-4" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-white/[0.04]" />
                <div className="h-3 w-4/5 rounded bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-white/[0.02] border border-border animate-pulse" />
      </div>
    </div>
  )
}
