import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform Analytics — VeilSub',
  description: 'On-chain aggregate analytics for VeilSub. View protocol stats, privacy guarantees, and contract version history.',
}

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children
}
