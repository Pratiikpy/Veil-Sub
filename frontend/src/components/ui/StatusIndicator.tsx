type Status = 'active' | 'expiring' | 'expired' | 'pending' | 'beta' | 'coming-soon'

interface Props {
  status: Status
  label?: string
  pulse?: boolean
}

const STATUS_CONFIG: Record<Status, { dot: string; text: string; defaultLabel: string }> = {
  active: {
    dot: 'bg-[var(--success)]',
    text: 'text-emerald-300',
    defaultLabel: 'Active',
  },
  expiring: {
    dot: 'bg-[var(--warning)]',
    text: 'text-amber-300',
    defaultLabel: 'Expiring Soon',
  },
  expired: {
    dot: 'bg-[var(--danger)]',
    text: 'text-red-300',
    defaultLabel: 'Expired',
  },
  pending: {
    dot: 'bg-blue-400',
    text: 'text-blue-300',
    defaultLabel: 'Pending',
  },
  beta: {
    dot: 'bg-[var(--accent)]',
    text: 'text-violet-300',
    defaultLabel: 'Beta',
  },
  'coming-soon': {
    dot: 'bg-white/30',
    text: 'text-[var(--text-muted)]',
    defaultLabel: 'Coming Soon',
  },
}

// Default pulse behavior: active and pending pulse, others don't
const DEFAULT_PULSE: Record<Status, boolean> = {
  active: true,
  expiring: false,
  expired: false,
  pending: true,
  beta: false,
  'coming-soon': false,
}

export default function StatusIndicator({ status, label, pulse }: Props) {
  const config = STATUS_CONFIG[status]
  const shouldPulse = pulse ?? DEFAULT_PULSE[status]
  const displayLabel = label ?? config.defaultLabel

  return (
    <span className={`inline-flex items-center gap-2 ${config.text}`}>
      <span className="relative flex h-2.5 w-2.5">
        {shouldPulse && (
          <span
            className={`absolute inset-0 rounded-full ${config.dot} opacity-50 animate-ping`}
          />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.dot}`} />
      </span>
      <span className="text-xs font-medium">{displayLabel}</span>
    </span>
  )
}
