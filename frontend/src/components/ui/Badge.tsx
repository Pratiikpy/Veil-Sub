import { ReactNode } from 'react'

type Variant = 'default' | 'accent' | 'success'

interface Props {
  children: ReactNode
  variant?: Variant
  className?: string
}

const variantClasses: Record<Variant, string> = {
  default:
    'text-white/70 border-border',
  accent:
    'text-white/70 border-white/10 bg-white/[0.03]',
  success:
    'text-emerald-400 border-emerald-500/[0.2] bg-emerald-500/[0.06]',
}

export default function Badge({ children, variant = 'default', className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-semibold tracking-wide uppercase border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
