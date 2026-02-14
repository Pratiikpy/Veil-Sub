'use client'

import { Clock, Check, X, ShieldCheck } from 'lucide-react'

type Status = 'pending' | 'active' | 'expired' | 'verified'

interface Props {
  status: Status
  showIcon?: boolean
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<
  Status,
  { label: string; icon: typeof Check; className: string }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  },
  active: {
    label: 'Active',
    icon: Check,
    className: 'bg-green-500/10 border-green-500/20 text-green-400',
  },
  expired: {
    label: 'Expired',
    icon: X,
    className: 'bg-red-500/10 border-red-500/20 text-red-400',
  },
  verified: {
    label: 'Verified',
    icon: ShieldCheck,
    className: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  },
}

export default function StatusBadge({
  status,
  showIcon = true,
  size = 'md',
}: Props) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.className} ${sizeClasses}`}
    >
      {showIcon && (
        <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      )}
      {config.label}
    </span>
  )
}
