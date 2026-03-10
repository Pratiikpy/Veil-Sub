import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Creator Profile — VeilSub',
  description: 'Subscribe privately to this creator on VeilSub. Zero-knowledge proof verification ensures your identity stays hidden on-chain.',
}

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return children
}
