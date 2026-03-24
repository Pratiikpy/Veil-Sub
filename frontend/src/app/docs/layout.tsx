import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation — VeilSub',
  description: 'Technical documentation for VeilSub: smart contract API, privacy model, wallet integration, and FAQ. 31 transitions, 30 mappings, 6 record types.',
  alternates: {
    canonical: '/docs',
  },
  openGraph: {
    title: 'Documentation — VeilSub',
    description: 'Technical documentation: 31 transitions, 30 mappings, 6 record types on Aleo.',
    url: '/docs',
  },
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children
}
