import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation — VeilSub',
  description: 'Technical documentation for VeilSub: smart contract API, privacy model, wallet integration, and FAQ. 27 transitions, 25 mappings, 6 record types.',
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children
}
