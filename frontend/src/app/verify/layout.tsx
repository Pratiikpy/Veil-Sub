import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verify Access — VeilSub',
  description: 'Prove your subscription access using zero-knowledge proofs. Verify AccessPass ownership without revealing your identity.',
}

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children
}
