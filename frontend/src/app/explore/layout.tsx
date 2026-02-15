import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Explore Creators — VeilSub',
  description: 'Discover creators on VeilSub. Browse creator profiles and subscribe privately using Aleo zero-knowledge proofs.',
}

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children
}
