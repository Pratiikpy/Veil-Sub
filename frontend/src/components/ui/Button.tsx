'use client'

import { ButtonHTMLAttributes, ReactNode, useRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-white text-black hover:bg-white/90 active:scale-[0.98] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]',
  secondary:
    'bg-transparent text-white border border-white/[0.12] hover:border-white/[0.25] hover:bg-white/[0.03] active:scale-[0.98]',
  ghost:
    'text-[#a1a1aa] hover:text-white hover:bg-white/[0.04] active:scale-[0.98]',
  accent:
    'bg-violet-600 text-white hover:bg-violet-500 active:scale-[0.98] hover:shadow-[0_0_25px_rgba(139,92,246,0.3)]',
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
  const btnRef = useRef<HTMLButtonElement>(null)

  return (
    <button
      ref={btnRef}
      className={`group relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none overflow-hidden ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {/* Shimmer shine on hover */}
      {(variant === 'primary' || variant === 'accent') && (
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background:
              'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.12) 55%, transparent 65%)',
            animation: 'shimmer-sweep 1.5s ease-in-out',
            animationPlayState: 'paused',
          }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  )
}
