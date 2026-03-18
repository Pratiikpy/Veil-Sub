import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface Action {
  label: string
  href: string
}

interface Props {
  icon: LucideIcon
  title: string
  description: string
  primaryAction?: Action
  secondaryAction?: Action
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
      {/* Icon circle */}
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-2xl bg-[var(--accent-dim)] animate-pulse" />
        <div className="relative w-full h-full rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] flex items-center justify-center">
          <Icon className="w-7 h-7 text-[var(--text-muted)]" aria-hidden="true" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-md leading-relaxed mb-8">
        {description}
      </p>

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:bg-[var(--accent-hover)] transition-colors active:scale-[0.98]"
              style={{ transitionDuration: 'var(--duration-standard)' }}
            >
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              style={{ transitionDuration: 'var(--duration-standard)' }}
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
