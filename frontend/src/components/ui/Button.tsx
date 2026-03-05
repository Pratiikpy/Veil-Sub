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
    'bg-white text-black hover:bg-white/90 active:scale-[0.98]',
  secondary:
    'bg-transparent text-white border border-white/[0.12] hover:border-white/[0.25] hover:bg-white/[0.03] active:scale-[0.98]',
  ghost:
    'text-[#a1a1aa] hover:text-white hover:bg-white/[0.04] active:scale-[0.98]',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3 text-[15px]',
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
      className={`relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
