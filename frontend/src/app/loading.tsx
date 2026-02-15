export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse mb-8">
          <div className="h-8 w-52 rounded-lg bg-white/[0.06] mb-3" />
          <div className="h-4 w-80 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse"
            >
              <div className="h-5 w-24 rounded-lg bg-white/[0.06] mb-4" />
              <div className="h-8 w-20 rounded-lg bg-white/[0.06] mb-3" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-white/[0.03]" />
                <div className="h-3 w-3/4 rounded bg-white/[0.03]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
