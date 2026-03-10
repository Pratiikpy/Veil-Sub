import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vision & Use Cases — VeilSub',
  description: 'VeilSub beyond subscriptions: anonymous journalism, private creator monetization, DAO membership, event ticketing, and developer SDK integration.',
}

export default function VisionLayout({ children }: { children: React.ReactNode }) {
  return children
}
