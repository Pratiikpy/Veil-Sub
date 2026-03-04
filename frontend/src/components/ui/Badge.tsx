import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export default function Badge({ children, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-[100px] text-xs font-medium tracking-wide uppercase text-[#a1a1aa] bg-white/[0.04] border border-[rgba(255,255,255,0.06)] ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] opacity-60" />
      {children}
    </span>
  )
}
