export default function PrivacyLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse mb-8">
          <div className="h-8 w-48 rounded-lg bg-white/[0.06] mb-3" />
          <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-border animate-pulse">
              <div className="h-5 w-40 rounded bg-white/[0.06] mb-4" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-white/[0.04]" />
                <div className="h-3 w-5/6 rounded bg-white/[0.04]" />
                <div className="h-3 w-4/6 rounded bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
