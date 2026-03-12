import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vision & Use Cases — VeilSub',
  description: 'VeilSub beyond subscriptions: anonymous journalism, private creator monetization, DAO membership, event ticketing, and developer SDK integration.',
  alternates: {
    canonical: '/vision',
  },
  openGraph: {
    title: 'Vision & Use Cases — VeilSub',
    description: 'Anonymous journalism, private monetization, DAO membership, and developer SDK.',
    url: '/vision',
  },
}

export default function VisionLayout({ children }: { children: React.ReactNode }) {
  return children
}
