'use client'

import { useState, useId } from 'react'
import { Check } from 'lucide-react'

interface FloatingInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  error?: string
  success?: boolean
  required?: boolean
  disabled?: boolean
  className?: string
  maxLength?: number
}

export default function FloatingInput({
  label,
  value,
  onChange,
  type = 'text',
  error,
  success,
  required,
  disabled,
  className = '',
  maxLength,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false)
  const id = useId()
  const isActive = focused || value.length > 0

  const borderColor = error
    ? 'border-red-500/60 focus-within:border-red-500'
    : success
      ? 'border-emerald-500/40 focus-within:border-emerald-500'
      : 'border-border focus-within:border-white/30'

  const glowRing = error
    ? 'focus-within:ring-red-400/30'
    : success
      ? 'focus-within:ring-emerald-400/20'
      : 'focus-within:ring-white/20'

  return (
    <div className={className}>
      <div
        className={`floating-input-wrapper relative rounded-xl bg-surface-1 border transition-all duration-200 focus-within:ring-2 ${borderColor} ${glowRing} ${error ? 'error-shake' : ''}`}
      >
        <label
          htmlFor={id}
          className={`absolute left-3 pointer-events-none transition-all duration-200 ease-out ${
            isActive
              ? 'top-2 text-[11px] font-medium text-[var(--accent)]'
              : 'top-1/2 -translate-y-1/2 text-[15px] text-[var(--text-muted)]'
          }`}
        >
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full bg-transparent pt-6 pb-2 px-3 text-white text-[15px] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {success && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 animate-[fadeIn_200ms_ease]">
            <Check className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: error ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          {error && (
            <p id={`${id}-error`} className="text-xs text-red-400 mt-1.5 px-1" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
