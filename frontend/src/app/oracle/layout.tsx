import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Oracle',
  description: 'VeilSub privacy oracle for on-chain verification and attestations.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
