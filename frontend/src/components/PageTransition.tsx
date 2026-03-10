import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

// Server component: this is a plain div wrapper with no client-side behavior.
// Kept as a named component for consistent page structure across routes.
export default function PageTransition({ children, className = '' }: Props) {
  return <div className={className}>{children}</div>
}
