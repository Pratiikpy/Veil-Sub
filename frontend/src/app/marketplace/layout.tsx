import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Marketplace',
  description: 'Discover creators and subscription tiers on VeilSub.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
