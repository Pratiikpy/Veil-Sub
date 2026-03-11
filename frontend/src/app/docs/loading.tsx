export default function DocsLoading() {
  return (
    <div className="min-h-screen" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading documentation, please wait</span>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse mb-8">
          <div className="h-8 w-48 rounded-lg bg-white/[0.06] mb-4" />
          <div className="h-4 w-96 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-28 rounded-lg bg-white/[0.04] animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 w-full rounded-xl bg-white/[0.02] border border-border animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
