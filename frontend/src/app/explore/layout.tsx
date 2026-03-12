import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Explore Creators — VeilSub',
  description: 'Discover creators and subscribe privately on VeilSub. Browse registered creators on Aleo testnet. Your identity stays hidden with zero-knowledge proofs.',
  alternates: {
    canonical: '/explore',
  },
  openGraph: {
    title: 'Explore Creators — VeilSub',
    description: 'Discover creators and subscribe privately. Zero-knowledge proof verification on Aleo.',
    url: '/explore',
  },
}

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children
}
