import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Access Control',
  description: 'Gate any resource behind VeilSub subscriptions with zero-knowledge access proofs.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
