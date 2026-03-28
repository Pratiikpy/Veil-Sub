import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Collaborations',
  description: 'Revenue-sharing collaboration agreements with atomic on-chain splits on VeilSub.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
