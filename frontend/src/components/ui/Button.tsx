'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] text-white shimmer-cta hover:shadow-[0_0_24px_rgba(139,92,246,0.25)] active:scale-[0.98]',
  secondary:
    'bg-transparent text-[#fafafa] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.03)] active:scale-[0.98]',
  ghost:
    'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-white/[0.04] active:scale-[0.98]',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: Props) {
  return (
    <button
      className={`relative inline-flex items-center justify-center gap-2 rounded-[12px] font-medium transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
