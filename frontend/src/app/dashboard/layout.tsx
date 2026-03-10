import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Creator Dashboard — VeilSub',
  description: 'Register as a creator, set subscription tiers, publish gated content, and track analytics. All subscriber identities stay private.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
