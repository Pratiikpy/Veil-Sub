import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export default function Badge({ children, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase text-[#a1a1aa] border border-white/[0.08] ${className}`}
    >
      {children}
    </span>
  )
}
