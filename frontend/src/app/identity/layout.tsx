import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Identity',
  description: 'Content signatures, identity proofs, and on-chain notarization on VeilSub.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
