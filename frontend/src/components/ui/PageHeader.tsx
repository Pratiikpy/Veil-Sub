import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface BadgeInfo {
  label: string
  color: 'violet' | 'emerald' | 'amber' | 'blue' | 'red'
}

interface Props {
  title: string
  subtitle?: string
  badge?: BadgeInfo
  backLink?: string
}

const BADGE_STYLES: Record<BadgeInfo['color'], string> = {
  violet: 'bg-white/[0.04] text-white/70 border-white/10',
  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  red: 'bg-red-500/10 text-red-300 border-red-500/20',
}

export default function PageHeader({ title, subtitle, badge, backLink }: Props) {
  return (
    <div className="mb-8 sm:mb-12">
      {/* Back link */}
      {backLink && (
        <Link
          href={backLink}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          style={{ transitionDuration: 'var(--duration-micro)' }}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </Link>
      )}

      {/* Badge */}
      {badge && (
        <div className="mb-4">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${BADGE_STYLES[badge.color]}`}
          >
            {badge.label}
          </span>
        </div>
      )}

      {/* Title */}
      <h1
        className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]"
        style={{ letterSpacing: '-0.03em' }}
      >
        {title}
      </h1>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-2 text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
