export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse mb-10">
          <div className="h-8 w-64 rounded-lg bg-white/[0.06] mb-4" />
          <div className="h-4 w-96 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="grid sm:grid-cols-4 gap-4 mb-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-8 rounded-2xl bg-white/[0.02] border border-border animate-pulse">
              <div className="h-4 w-20 rounded bg-white/[0.06] mb-4" />
              <div className="h-7 w-16 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-border animate-pulse h-64" />
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-border animate-pulse h-64" />
        </div>
      </div>
    </div>
  )
}
