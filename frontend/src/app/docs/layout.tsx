import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation — VeilSub',
  description: 'Technical documentation for VeilSub: smart contract reference, privacy model, API integration, and FAQ.',
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children
}
