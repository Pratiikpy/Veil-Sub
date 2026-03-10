export default function VerifyLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse mb-8 text-center">
          <div className="h-8 w-56 rounded-lg bg-white/[0.06] mb-3 mx-auto" />
          <div className="h-4 w-80 rounded-lg bg-white/[0.04] mx-auto" />
        </div>
        <div className="p-8 rounded-2xl bg-white/[0.02] border border-border animate-pulse">
          <div className="h-5 w-40 rounded bg-white/[0.06] mb-4" />
          <div className="h-12 w-full rounded-xl bg-white/[0.04] mb-6" />
          <div className="h-11 w-full rounded-xl bg-white/[0.06]" />
        </div>
      </div>
    </div>
  )
}
