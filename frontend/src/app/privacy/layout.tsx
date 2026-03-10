import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Model — VeilSub',
  description: 'How VeilSub protects subscriber identity with zero-knowledge proofs. Threat model, code analysis, and comparison with traditional platforms and Aleo competitors.',
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
