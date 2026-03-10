import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform Analytics — VeilSub',
  description: 'Aggregate on-chain statistics for VeilSub protocol. Total creators, subscriptions, revenue, and contract evolution from v4 to v26.',
}

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children
}
