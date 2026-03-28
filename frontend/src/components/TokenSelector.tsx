'use client'

export type PaymentToken = 'credits' | 'usdcx' | 'usad'

interface TokenSelectorProps {
  selected: PaymentToken
  onChange: (token: PaymentToken) => void
  disabled?: boolean
}

const TOKEN_OPTIONS: { key: PaymentToken; label: string; sublabel: string; color: string; selectedBg: string; selectedBorder: string }[] = [
  {
    key: 'credits',
    label: 'ALEO',
    sublabel: 'Credits',
    color: 'text-white',
    selectedBg: 'bg-white/[0.08]',
    selectedBorder: 'border-white/25',
  },
  {
    key: 'usdcx',
    label: 'USDCx',
    sublabel: 'Stablecoin',
    color: 'text-blue-300',
    selectedBg: 'bg-blue-500/[0.12]',
    selectedBorder: 'border-blue-400/30',
  },
  {
    key: 'usad',
    label: 'USAD',
    sublabel: 'Stablecoin',
    color: 'text-green-300',
    selectedBg: 'bg-green-500/[0.12]',
    selectedBorder: 'border-green-400/30',
  },
]

export default function TokenSelector({ selected, onChange, disabled }: TokenSelectorProps) {
  return (
    <div className="mb-4">
      <p className="text-xs text-white/60 mb-2 font-medium">Payment Token</p>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Payment token">
        {TOKEN_OPTIONS.map((opt) => {
          const isSelected = selected === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(opt.key)}
              className={`p-2 rounded-lg border text-center transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected
                  ? `${opt.selectedBg} ${opt.selectedBorder} shadow-accent-sm`
                  : 'border-border/75 bg-transparent hover:border-glass-hover'
              }`}
            >
              <span className={`text-[12px] font-semibold block ${isSelected ? opt.color : 'text-white/60'}`}>
                {opt.label}
              </span>
              <span className="text-[10px] text-white/50 block">{opt.sublabel}</span>
            </button>
          )
        })}
      </div>
      {selected !== 'credits' && (
        <p className="text-[10px] text-white/50 mt-1.5">
          Requires {selected === 'usdcx' ? 'USDCx' : 'USAD'} tokens in your wallet. Higher network fee applies.
        </p>
      )}
    </div>
  )
}
