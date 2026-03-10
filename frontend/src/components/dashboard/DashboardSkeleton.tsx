'use client'

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="h-8 w-52 rounded-lg skeleton mb-3" />
          <div className="h-4 w-80 rounded-lg skeleton" />
        </div>
        <div className="max-w-lg">
          <div className="p-6 rounded-2xl glass">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-5 h-5 rounded skeleton" />
              <div className="h-5 w-40 rounded-lg skeleton" />
            </div>
            <div className="mb-6">
              <div className="h-4 w-48 rounded skeleton mb-2" />
              <div className="h-12 w-full rounded-xl skeleton-pulse" />
              <div className="h-3 w-52 rounded skeleton mt-2" />
            </div>
            <div className="h-20 w-full rounded-lg skeleton-pulse mb-6" />
            <div className="h-12 w-full rounded-xl skeleton" />
          </div>
        </div>
      </div>
    </div>
  )
}
