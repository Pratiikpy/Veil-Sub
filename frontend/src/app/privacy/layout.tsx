import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Model — VeilSub',
  description: 'How VeilSub protects subscriber identity using Aleo zero-knowledge proofs. Full privacy architecture, threat model, and code-level guarantees.',
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
