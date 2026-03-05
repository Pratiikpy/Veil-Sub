import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export default function Container({ children, className = '' }: Props) {
  return (
    <div className={`max-w-[1120px] mx-auto px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  )
}
