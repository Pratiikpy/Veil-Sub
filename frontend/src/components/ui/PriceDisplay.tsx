import { formatCredits } from '@/lib/utils'

type Token = 'credits' | 'usdcx' | 'usad'
type Size = 'sm' | 'md' | 'lg'

interface Props {
  amount: number
  token?: Token
  size?: Size
  showUsd?: boolean
}

const TOKEN_LABELS: Record<Token, string> = {
  credits: 'ALEO',
  usdcx: 'USDCx',
  usad: 'USAD',
}

const TOKEN_COLORS: Record<Token, string> = {
  credits: 'text-violet-400',
  usdcx: 'text-blue-400',
  usad: 'text-emerald-400',
}

const SIZE_CLASSES: Record<Size, { value: string; label: string }> = {
  sm: { value: 'text-sm font-semibold', label: 'text-xs' },
  md: { value: 'text-base sm:text-lg font-semibold', label: 'text-sm' },
  lg: { value: 'text-xl sm:text-2xl font-bold', label: 'text-base' },
}

// Rough estimate: 1 ALEO ~ $0.50 (testnet placeholder)
const ALEO_USD_ESTIMATE = 0.5

export default function PriceDisplay({
  amount,
  token = 'credits',
  size = 'md',
  showUsd = false,
}: Props) {
  const formatted = formatCredits(amount)
  const label = TOKEN_LABELS[token]
  const colorClass = TOKEN_COLORS[token]
  const sizeClasses = SIZE_CLASSES[size]

  const usdEstimate =
    showUsd && token === 'credits'
      ? (amount / 1_000_000) * ALEO_USD_ESTIMATE
      : null

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={`${sizeClasses.value} text-[var(--text-primary)] tabular-nums`}>
        {formatted}
      </span>
      <span className={`${sizeClasses.label} ${colorClass} font-medium`}>
        {label}
      </span>
      {usdEstimate !== null && usdEstimate > 0 && (
        <span className={`${sizeClasses.label} text-[var(--text-muted)]`}>
          (~${usdEstimate < 0.01 ? '<0.01' : usdEstimate.toFixed(2)})
        </span>
      )}
    </span>
  )
}
