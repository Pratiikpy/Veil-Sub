'use client'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  lines?: number
}

const BASE = 'skeleton-shimmer'

const variantClass: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'rounded-md h-4 w-full',
  circular: 'rounded-full',
  rectangular: 'rounded-xl',
}

export default function Skeleton({
  className = '',
  variant = 'rectangular',
  lines = 1,
}: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className="flex flex-col gap-2.5" role="status" aria-label="Loading">
        {Array.from({ length: lines }, (_, i) => {
          const isLast = i === lines - 1
          return (
            <div
              key={i}
              className={`${BASE} ${variantClass.text} ${isLast ? 'w-3/5' : 'w-full'} ${className}`}
            />
          )
        })}
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${BASE} ${variantClass[variant]} ${className}`}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
