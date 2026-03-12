import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Model — VeilSub',
  description: 'How VeilSub protects subscriber identity with zero-knowledge proofs. Threat model, code analysis, and comparison with traditional platforms and Aleo competitors.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Model — VeilSub',
    description: 'How VeilSub protects subscriber identity. Zero-knowledge proofs, threat model, and security analysis.',
    url: '/privacy',
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
