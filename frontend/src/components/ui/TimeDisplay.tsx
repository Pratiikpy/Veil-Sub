import { blockToDate, formatExpiry } from '@/lib/utils'
import { SECONDS_PER_BLOCK } from '@/lib/config'

type Format = 'relative' | 'absolute' | 'both'

interface Props {
  blockHeight: number
  currentBlock?: number | null
  format?: Format
}

function toAbsoluteDate(targetBlock: number, currentBlock: number): string {
  const blockDiff = targetBlock - currentBlock
  const ms = blockDiff * SECONDS_PER_BLOCK * 1000
  const date = new Date(Date.now() + ms)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function toRelative(targetBlock: number, currentBlock: number): string {
  const blockDiff = targetBlock - currentBlock
  const seconds = Math.abs(blockDiff) * SECONDS_PER_BLOCK
  const isPast = blockDiff <= 0

  if (seconds < 60) return isPast ? 'just now' : 'in < 1 min'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return isPast ? `${minutes}m ago` : `in ${minutes}m`
  }

  const hours = Math.round(seconds / 3600)
  if (hours < 48) {
    return isPast ? `${hours}h ago` : `in ${hours}h`
  }

  const days = Math.round(seconds / 86400)
  return isPast ? `${days}d ago` : `in ${days} days`
}

export default function TimeDisplay({
  blockHeight,
  currentBlock,
  format = 'relative',
}: Props) {
  // Fallback when current block is unknown
  if (currentBlock == null || !Number.isFinite(currentBlock)) {
    return (
      <span className="text-[var(--text-muted)] tabular-nums">
        block {blockHeight.toLocaleString()}
      </span>
    )
  }

  const isPast = blockHeight <= currentBlock
  const colorClass = isPast ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'

  if (format === 'absolute') {
    return (
      <span className={`${colorClass} tabular-nums`}>
        {toAbsoluteDate(blockHeight, currentBlock)}
      </span>
    )
  }

  if (format === 'both') {
    const abs = toAbsoluteDate(blockHeight, currentBlock)
    const rel = toRelative(blockHeight, currentBlock)
    return (
      <span className={`${colorClass} tabular-nums`}>
        {abs}{' '}
        <span className="text-[var(--text-muted)]">({rel})</span>
      </span>
    )
  }

  // Default: relative
  return (
    <span className={`${colorClass} tabular-nums`}>
      {toRelative(blockHeight, currentBlock)}
    </span>
  )
}
